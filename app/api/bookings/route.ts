import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getCalendarClient, CLINIC_CALENDAR_ID, CLINIC_TIMEZONE } from '@/lib/google/calendar';
import { mergeClinicConfig, type ClinicConfig } from '@/lib/clinic/config';
import { buildBusyIntervals, isSlotStillValid, getBookingStatuses, type BusyInterval } from '@/lib/booking/scheduling';
import { endOfDay, parseISO, startOfDay } from 'date-fns';

interface BookingRequestBody {
   slot?: {
      start?: string;
      end?: string;
   };
   email?: string;
   name?: string;
   telefono?: string;
   servicio_id?: string;
   servicio_nombre?: string;
   servicio_precio?: number;
}

interface SupabaseLikeError {
   code?: string;
   message?: string;
}

function isSupabaseError(error: unknown): error is SupabaseLikeError {
   return Boolean(error) && typeof error === 'object';
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
   let page = 1;
   const perPage = 200;

   while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
         throw error;
      }

      const users = data.users || [];
      const found = users.find((user) => (user.email || '').toLowerCase() === email.toLowerCase());
      if (found?.id) {
         return found.id;
      }

      if (users.length < perPage) {
         break;
      }

      page += 1;
   }

   return null;
}

async function ensurePatientRecord(params: { email: string; name: string; telefono?: string }): Promise<string> {
   const { email, name, telefono } = params;

   const { data: pacienteRecord, error: pacienteError } = await supabaseAdmin
      .from('pacientes')
      .select('id')
      .eq('email', email)
      .single();

   if (pacienteError && pacienteError.code !== 'PGRST116') {
      throw pacienteError;
   }

   let authUserId = pacienteRecord?.id;

   if (!authUserId) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
         email,
         password: crypto.randomBytes(16).toString('hex'),
         email_confirm: true,
      });

      if (createError) {
         const fallbackUserId = await findAuthUserIdByEmail(email);
         if (!fallbackUserId) {
            throw createError;
         }
         authUserId = fallbackUserId;
      } else {
         authUserId = newUser.user.id;
      }

      const { error: insertPacienteError } = await supabaseAdmin.from('pacientes').insert({
         id: authUserId,
         email,
         nombre_completo: name,
         telefono: telefono || null,
      });

      if (insertPacienteError && insertPacienteError.code !== '23505') {
         throw insertPacienteError;
      }
   } else if (telefono) {
      const { error: updatePacienteError } = await supabaseAdmin
         .from('pacientes')
         .update({ telefono })
         .eq('id', authUserId);

      if (updatePacienteError) {
         throw updatePacienteError;
      }
   }

   return authUserId;
}

async function insertBookingRow(params: {
   pacienteId: string;
   provisionalGoogleEventId: string;
   slotStart: string;
   slotEnd: string;
   servicioId?: string;
   servicioNombre?: string;
   servicioPrecio?: number;
}): Promise<string> {
   const {
      pacienteId,
      provisionalGoogleEventId,
      slotStart,
      slotEnd,
      servicioId,
      servicioNombre,
      servicioPrecio,
   } = params;

   const completeInsert = await supabaseAdmin
      .from('citas')
      .insert({
         paciente_id: pacienteId,
         calendly_event_id: provisionalGoogleEventId,
         fecha_inicio: slotStart,
         fecha_fin: slotEnd,
         estado: 'pending_payment',
         servicio_id: servicioId,
         servicio_nombre: servicioNombre,
         precio_final: servicioPrecio,
      })
      .select('id')
      .single();

   if (!completeInsert.error && completeInsert.data?.id) {
      return completeInsert.data.id;
   }

   if (completeInsert.error?.code === '23P01') {
      throw completeInsert.error;
   }

   const fallbackInsert = await supabaseAdmin
      .from('citas')
      .insert({
         paciente_id: pacienteId,
         calendly_event_id: provisionalGoogleEventId,
         fecha_inicio: slotStart,
         fecha_fin: slotEnd,
         estado: 'pending_payment',
      })
      .select('id')
      .single();

   if (fallbackInsert.error) {
      throw fallbackInsert.error;
   }

   if (!fallbackInsert.data?.id) {
      throw new Error('No se pudo persistir la cita');
   }

   return fallbackInsert.data.id;
}

async function buildBookingBusyIntervals(targetDate: Date, config: ClinicConfig): Promise<BusyInterval[]> {
   const busyIntervals = buildBusyIntervals(targetDate, config);

   const { data: bookedCitas, error: bookingError } = await supabaseAdmin
      .from('citas')
      .select('fecha_inicio, fecha_fin, estado')
      .lt('fecha_inicio', endOfDay(targetDate).toISOString())
      .gt('fecha_fin', startOfDay(targetDate).toISOString())
      .in('estado', getBookingStatuses() as string[]);

   if (bookingError) {
      throw bookingError;
   }

   bookedCitas?.forEach((cita) => {
      busyIntervals.push({ start: new Date(cita.fecha_inicio), end: new Date(cita.fecha_fin) });
   });

   const client = getCalendarClient();
   if (client) {
      const dayStart = startOfDay(targetDate);
      const dayEnd = endOfDay(targetDate);
      const response = await client.freebusy.query({
         requestBody: {
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            timeZone: CLINIC_TIMEZONE,
            items: [{ id: CLINIC_CALENDAR_ID }],
         },
      });

      const busy = response.data.calendars?.[CLINIC_CALENDAR_ID]?.busy || [];
      busy.forEach((interval) => {
         busyIntervals.push({ start: new Date(interval.start ?? ''), end: new Date(interval.end ?? '') });
      });
   }

   return busyIntervals;
}

async function deleteBookingById(citaId: string): Promise<void> {
   await supabaseAdmin.from('citas').delete().eq('id', citaId);
}

function conflictResponse(): NextResponse {
   return NextResponse.json(
      {
         error: 'El horario ya fue ocupado por otra persona.',
         code: 'slot_taken',
         message: 'Ese horario ya no está disponible. Elige otro turno y vuelve a intentar la reserva.',
      },
      { status: 409 }
   );
}

export async function POST(req: Request) {
  try {
      const body: BookingRequestBody = await req.json();
      const { slot, email, name, telefono, servicio_id, servicio_nombre, servicio_precio } = body;

      if (!slot?.start || !slot?.end || !email || !name) {
         return NextResponse.json({ error: 'Incomplete booking data' }, { status: 400 });
    }

      const slotStart = parseISO(slot.start);
      const slotEnd = parseISO(slot.end);
      if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || !(slotStart < slotEnd)) {
         return NextResponse.json({ error: 'Invalid slot data' }, { status: 400 });
      }

      let config: ClinicConfig = mergeClinicConfig(null);
      const { data: dbConfig, error: configError } = await supabaseAdmin
         .from('configuracion_clinica')
         .select('*')
         .limit(1)
         .single();

      if (configError && configError.code !== 'PGRST116' && configError.code !== '42P01') {
         throw configError;
      }

      if (dbConfig) {
         config = mergeClinicConfig(dbConfig as Partial<ClinicConfig>);
      }

      const targetDate = new Date(slotStart);
      const busyIntervals = await buildBookingBusyIntervals(targetDate, config);
      if (!isSlotStillValid(slotStart, slotEnd, busyIntervals)) {
         return conflictResponse();
      }

      const authUserId = await ensurePatientRecord({
         email,
         name,
         telefono,
      });

      const provisionalGoogleEventId = `pending-${crypto.randomUUID()}`;
      let citaId: string;

      try {
        citaId = await insertBookingRow({
          pacienteId: authUserId,
          provisionalGoogleEventId,
          slotStart: slot.start,
          slotEnd: slot.end,
          servicioId: servicio_id,
          servicioNombre: servicio_nombre,
          servicioPrecio: servicio_precio,
        });
      } catch (insertError) {
        if (isSupabaseError(insertError) && insertError.code === '23P01') {
          return conflictResponse();
        }
        throw insertError;
      }

      const client = getCalendarClient();
      let googleEventId = provisionalGoogleEventId;

      try {
         if (client) {
            const eventData = {
               summary: `${servicio_nombre || 'Cita'} - ${name}`,
               description: `Estado: Pendiente de Pago.\nServicio: ${servicio_nombre} ($${servicio_precio})\nPaciente: ${name} (${email})\nAgendado vía App In-House.`,
               start: { dateTime: slot.start, timeZone: CLINIC_TIMEZONE },
               end: { dateTime: slot.end, timeZone: CLINIC_TIMEZONE },
               transparency: 'opaque',
            };

            const res = await client.events.insert({
               calendarId: CLINIC_CALENDAR_ID,
               requestBody: eventData,
            });

            googleEventId = res.data.id || googleEventId;
         }

         const { error: updateCitaError } = await supabaseAdmin
            .from('citas')
            .update({ calendly_event_id: googleEventId })
            .eq('id', citaId);

         if (updateCitaError) {
            throw updateCitaError;
         }
      } catch (bookingFinalizeError) {
         if (googleEventId !== provisionalGoogleEventId && client) {
            try {
               await client.events.delete({
                  calendarId: CLINIC_CALENDAR_ID,
                  eventId: googleEventId,
               });
            } catch (cleanupError) {
               console.warn('No se pudo limpiar el evento de Google Calendar:', cleanupError);
            }
         }

         await deleteBookingById(citaId);
         throw bookingFinalizeError;
      }

      return NextResponse.json({ success: true, citaId, googleEventId }, { status: 200 });
   } catch (error: unknown) {
      console.error('Booking Fatal Error:', error);

      if (error && typeof error === 'object' && Reflect.get(error as Record<string, unknown>, 'code') === '23P01') {
         return conflictResponse();
      }

      if (isSupabaseError(error)) {
        const message = error.message || 'Server Error during booking';
        return NextResponse.json({ error: message }, { status: 500 });
      }

      return NextResponse.json({ error: 'Server Error during booking' }, { status: 500 });
  }
}
