import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ensureAdminSession } from '@/lib/auth/admin';
import { getCalendarClient, CLINIC_CALENDAR_ID, CLINIC_TIMEZONE } from '@/lib/google/calendar';

interface CalendarPacienteData {
    email?: string | null;
    nombre_completo?: string | null;
}

interface CitaCalendarData {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    servicio_nombre?: string | null;
    precio_final?: number | null;
    calendly_event_id?: string | null;
    paciente?: CalendarPacienteData | CalendarPacienteData[] | null;
}

function normalizePaciente(rawPaciente: CitaCalendarData['paciente']): CalendarPacienteData | null {
    if (!rawPaciente) {
        return null;
    }

    if (Array.isArray(rawPaciente)) {
        return rawPaciente[0] ?? null;
    }

    return rawPaciente;
}

async function syncCalendarForStatus(cita: CitaCalendarData, estadoNuevo: string): Promise<string | null | undefined> {
    const client = getCalendarClient();
    if (!client) {
        return cita.calendly_event_id ?? null;
    }

    const existingEventId = cita.calendly_event_id && !cita.calendly_event_id.startsWith('pending-')
        ? cita.calendly_event_id
        : null;

    const paciente = normalizePaciente(cita.paciente);
    const patientEmail = paciente?.email ?? undefined;
    const patientName = paciente?.nombre_completo ?? 'Paciente';

    if (estadoNuevo === 'confirmed') {
        const eventPayload = {
            summary: `${cita.servicio_nombre || 'Cita clínica'} - ${patientName}`,
            description: `Estado: Confirmada\nServicio: ${cita.servicio_nombre || 'Consulta'}\nMonto: ${cita.precio_final ?? 'N/A'}\nPaciente: ${patientName}${patientEmail ? ` (${patientEmail})` : ''}`,
            start: { dateTime: cita.fecha_inicio, timeZone: CLINIC_TIMEZONE },
            end: { dateTime: cita.fecha_fin, timeZone: CLINIC_TIMEZONE },
            transparency: 'opaque' as const,
            attendees: patientEmail ? [{ email: patientEmail }] : undefined,
        };

        if (existingEventId) {
            await client.events.patch({
                calendarId: CLINIC_CALENDAR_ID,
                eventId: existingEventId,
                sendUpdates: 'all',
                requestBody: eventPayload,
            });
            return existingEventId;
        }

        const created = await client.events.insert({
            calendarId: CLINIC_CALENDAR_ID,
            sendUpdates: 'all',
            requestBody: eventPayload,
        });

        return created.data.id ?? null;
    }

    if (estadoNuevo === 'cancelled' && existingEventId) {
        await client.events.delete({
            calendarId: CLINIC_CALENDAR_ID,
            eventId: existingEventId,
            sendUpdates: 'all',
        });
        return null;
    }

    return cita.calendly_event_id ?? null;
}

function serverErrorResponse(error: unknown): NextResponse {
    const message = error instanceof Error ? error.message : 'Server fatal error';
    return NextResponse.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
    try {
        const authFailure = await ensureAdminSession(request);
        if (authFailure) {
            return authFailure;
        }

        const { data: citasBase, error: citasError } = await supabaseAdmin
            .from('citas')
            .select('*')
            .order('creado_en', { ascending: false });

        if (citasError) {
            console.error('Citas GET DB Error:', citasError);
            return NextResponse.json({ error: citasError.message }, { status: 500 });
        }

        const citas = citasBase ?? [];
        if (citas.length === 0) {
            return NextResponse.json({ citas: [] }, { status: 200 });
        }

        const pacienteIds = Array.from(new Set(citas.map((cita) => cita.paciente_id).filter(Boolean)));
        const citaIds = citas.map((cita) => cita.id);

        const [{ data: pacientes, error: pacientesError }, { data: pagos, error: pagosError }] = await Promise.all([
            pacienteIds.length > 0
                ? supabaseAdmin.from('pacientes').select('*').in('id', pacienteIds)
                : Promise.resolve({ data: [], error: null }),
            citaIds.length > 0
                ? supabaseAdmin.from('pagos').select('*').in('cita_id', citaIds)
                : Promise.resolve({ data: [], error: null }),
        ]);

        if (pacientesError) {
            console.error('Citas GET pacientes Error:', pacientesError);
            return NextResponse.json({ error: pacientesError.message }, { status: 500 });
        }

        if (pagosError) {
            console.error('Citas GET pagos Error:', pagosError);
            return NextResponse.json({ error: pagosError.message }, { status: 500 });
        }

        const pacientesById = new Map((pacientes ?? []).map((paciente) => [paciente.id, paciente]));
        const pagosByCita = new Map<string, unknown[]>();

        for (const pago of pagos ?? []) {
            const citaId = (pago as { cita_id?: string }).cita_id;
            if (!citaId) continue;
            const current = pagosByCita.get(citaId) ?? [];
            current.push(pago);
            pagosByCita.set(citaId, current);
        }

        const hydratedCitas = citas.map((cita) => ({
            ...cita,
            paciente: pacientesById.get(cita.paciente_id) ?? null,
            pago: pagosByCita.get(cita.id) ?? [],
        }));

        return NextResponse.json({ citas: hydratedCitas }, { status: 200 });
    } catch (error: unknown) {
        console.error('Citas Admin Route Error:', error);
        return serverErrorResponse(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const authFailure = await ensureAdminSession(request);
        if (authFailure) {
            return authFailure;
        }

        const body: unknown = await request.json();
        const { id, estado_nuevo, nueva_fecha_inicio, nueva_fecha_fin } = body as {
            id?: string;
            estado_nuevo?: string;
            nueva_fecha_inicio?: string;
            nueva_fecha_fin?: string;
        };

        if (!id) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        if (nueva_fecha_inicio && nueva_fecha_fin) {
            const { error: dbErr } = await supabaseAdmin
                .from('citas')
                .update({ fecha_inicio: nueva_fecha_inicio, fecha_fin: nueva_fecha_fin })
                .eq('id', id);

            if (dbErr) {
                console.error('Reprogramar DB Error:', dbErr);
                return NextResponse.json({ error: 'Fallo al mover cita en DB' }, { status: 500 });
            }

            const { data: citaData, error: citaError } = await supabaseAdmin
                .from('citas')
                .select('calendly_event_id')
                .eq('id', id)
                .single();

            if (citaError) {
                throw citaError;
            }

            const gcalEventId = citaData?.calendly_event_id;
            if (gcalEventId && !gcalEventId.startsWith('mock-')) {
                try {
                    const client = getCalendarClient();
                    if (client) {
                        await client.events.patch({
                            calendarId: CLINIC_CALENDAR_ID,
                            eventId: gcalEventId,
                            requestBody: {
                                start: { dateTime: nueva_fecha_inicio, timeZone: CLINIC_TIMEZONE },
                                end: { dateTime: nueva_fecha_fin, timeZone: CLINIC_TIMEZONE },
                            },
                        });
                    }
                } catch (gcalErr) {
                    console.warn('No se pudo mover en Google Calendar:', gcalErr);
                }
            }

            return NextResponse.json({ success: true, action: 'rescheduled' }, { status: 200 });
        }

        if (estado_nuevo) {
            const { data: citaRow, error: citaError } = await supabaseAdmin
                .from('citas')
                .select('id, paciente_id, fecha_inicio, fecha_fin, servicio_nombre, precio_final, calendly_event_id')
                .eq('id', id)
                .single();

            if (citaError) {
                throw citaError;
            }

            let paciente: CalendarPacienteData | null = null;
            const pacienteId = (citaRow as { paciente_id?: string }).paciente_id;
            if (pacienteId) {
                const { data: pacienteRow, error: pacienteError } = await supabaseAdmin
                    .from('pacientes')
                    .select('email, nombre_completo')
                    .eq('id', pacienteId)
                    .single();

                if (pacienteError && pacienteError.code !== 'PGRST116') {
                    throw pacienteError;
                }

                paciente = pacienteRow ?? null;
            }

            const syncedGoogleEventId = await syncCalendarForStatus({
                ...(citaRow as CitaCalendarData),
                paciente,
            }, estado_nuevo);

            const { error } = await supabaseAdmin
                .from('citas')
                .update({
                    estado: estado_nuevo,
                    calendly_event_id: syncedGoogleEventId ?? null,
                })
                .eq('id', id);

            if (error) {
                console.error('Citas PATCH DB Error:', error);
                return NextResponse.json({ error: 'Fallo al procesar dictamen en DB' }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                new_status: estado_nuevo,
                google_event_id: syncedGoogleEventId ?? null,
            }, { status: 200 });
        }

        return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
    } catch (error: unknown) {
        console.error('Citas Update Mode Error:', error);
        return serverErrorResponse(error);
    }
}
