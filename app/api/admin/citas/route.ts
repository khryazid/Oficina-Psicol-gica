import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getCalendarClient, CLINIC_CALENDAR_ID, CLINIC_TIMEZONE } from '@/lib/google/calendar';

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('citas')
            .select(`
                *,
                paciente:pacientes(*),
                pago:pagos(*)
            `)
            .order('creado_en', { ascending: false });

        if (error) {
            console.error("Citas GET DB Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ citas: data }, { status: 200 });
    } catch (err) {
        console.error("Citas Admin Route Error:", err);
        return NextResponse.json({ error: 'Server fatal error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, estado_nuevo, nueva_fecha_inicio, nueva_fecha_fin } = body;

        if (!id) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        // MODO A: Reprogramación de horario
        if (nueva_fecha_inicio && nueva_fecha_fin) {
            const { error: dbErr } = await supabaseAdmin
                .from('citas')
                .update({ fecha_inicio: nueva_fecha_inicio, fecha_fin: nueva_fecha_fin })
                .eq('id', id);

            if (dbErr) {
                console.error("Reprogramar DB Error:", dbErr);
                return NextResponse.json({ error: 'Fallo al mover cita en DB' }, { status: 500 });
            }

            // Intentar mover el evento en Google Calendar
            const { data: citaData } = await supabaseAdmin.from('citas').select('calendly_event_id').eq('id', id).single();
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
                            }
                        });
                    }
                } catch (gcalErr) {
                    console.warn("No se pudo mover en Google Calendar:", gcalErr);
                    // No falla la operación, solo advierte
                }
            }

            return NextResponse.json({ success: true, action: 'rescheduled' }, { status: 200 });
        }

        // MODO B: Cambio de estado (aprobar/rechazar)
        if (estado_nuevo) {
            const { error } = await supabaseAdmin
                .from('citas')
                .update({ estado: estado_nuevo })
                .eq('id', id);

            if (error) {
                console.error("Citas PATCH DB Error:", error);
                return NextResponse.json({ error: 'Fallo al procesar dictamen en DB' }, { status: 500 });
            }

            return NextResponse.json({ success: true, new_status: estado_nuevo }, { status: 200 });
        }

        return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });

    } catch (err) {
        console.error("Citas Update Mode Error:", err);
        return NextResponse.json({ error: 'Server fault en Update' }, { status: 500 });
    }
}
