import { NextResponse } from 'next/server';
import { getCalendarClient, CLINIC_CALENDAR_ID, CLINIC_TIMEZONE } from '@/lib/google/calendar';
import { startOfDay, parseISO, isBefore, addMinutes, addDays } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabase/server';
import { defaultFallbackConfig, mergeClinicConfig, type ClinicConfig } from '@/lib/clinic/config';
import {
    buildBusyIntervals,
    calculateAvailableSlots,
    getBookingStatuses,
    getClinicDateStamp,
    getClinicDayBounds,
    getClinicWeekday,
    parseClinicDateStamp,
    type BusyInterval,
} from '@/lib/booking/scheduling';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
        const durationParam = searchParams.get('duration');
    if (!dateParam) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });

        const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
            ? parseClinicDateStamp(dateParam)
            : parseISO(dateParam);
        const duracionTarget = durationParam ? parseInt(durationParam, 10) : 50;
        const today = new Date();

        let config: ClinicConfig = defaultFallbackConfig;

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

    const { anticipacion_minima_horas = 24, anticipacion_maxima_dias = 30 } = config;
    const dayOfWeek = getClinicWeekday(targetDate);
    const formattedDate = getClinicDateStamp(targetDate);

    // A. REGLAS DE LA FÍSICA Y LA LÓGICA (ANTICIPACIÓN V4)
    const margenMinimoAsistencia = addMinutes(today, anticipacion_minima_horas * 60);
    const margenMaximoAsistencia = addDays(today, anticipacion_maxima_dias);

    if (isBefore(targetDate, startOfDay(margenMinimoAsistencia)) || !isBefore(targetDate, margenMaximoAsistencia)) {
        // La fecha entera está por debajo del rango de anticipación mínima o supera el límite
        return NextResponse.json({ slots: [] }, { status: 200 });
    }

    const diaHabitual = config.horario_habitual[dayOfWeek];

    if (!diaHabitual) {
      return NextResponse.json({ slots: [] }, { status: 200 });
    }

    // Buscar "Overrrides" o bloqueos absolutos de la fecha exacta
    const bloqueoDelDia = config.bloqueos_especificos.filter((block) => block.fecha === formattedDate);
    const esBloqueoTotal = bloqueoDelDia.some((block) => block.todo_el_dia === true);

    // 2. EXCLUSIÓN DURA
    if (
        isBefore(targetDate, startOfDay(today)) || 
        !diaHabitual.activo ||
        esBloqueoTotal
    ) {
        return NextResponse.json({ slots: [] }, { status: 200 }); 
    }

    // 3. LÍMITES INTRA-DÍA (De la jornada particular)
    const { start: clinicDayStart, end: clinicDayEnd } = getClinicDayBounds(targetDate);

    // 4. COLECCIÓN DE HORAS OCUPADAS (INTERVALOS "BUSY")
    const busyIntervals: BusyInterval[] = buildBusyIntervals(targetDate, config);

    const { data: bookedCitas, error: bookingError } = await supabaseAdmin
      .from('citas')
      .select('fecha_inicio, fecha_fin, estado')
        .lt('fecha_inicio', clinicDayEnd.toISOString())
        .gt('fecha_fin', clinicDayStart.toISOString())
      .in('estado', getBookingStatuses() as string[]);

    if (bookingError) {
      throw bookingError;
    }

    bookedCitas?.forEach((cita) => {
      busyIntervals.push({ start: new Date(cita.fecha_inicio), end: new Date(cita.fecha_fin) });
    });

    // 4C. Consultar a GOOGLE CALENDAR
    const client = getCalendarClient();
        if (client) {
            try {
        const response = await client.freebusy.query({
            requestBody: {
                timeMin: clinicDayStart.toISOString(),
                timeMax: clinicDayEnd.toISOString(),
                timeZone: CLINIC_TIMEZONE,
                items: [{ id: CLINIC_CALENDAR_ID }]
            }
        });
                const busy = response.data.calendars?.[CLINIC_CALENDAR_ID]?.busy || [];
                busy.forEach((interval) => {
                    if (interval.start && interval.end) {
                        busyIntervals.push({ start: new Date(interval.start), end: new Date(interval.end) });
                    }
        });
            } catch (googleError) {
                console.warn('Google Calendar freebusy fallback activado:', googleError);
            }
    } else {
        // En MOCK: A modo demostración, tiramos 1 reunión random de Google Calendar falso
        const mockBusy1Start = addMinutes(clinicDayStart, 14 * 60);
        busyIntervals.push({ start: mockBusy1Start, end: addMinutes(mockBusy1Start, 60) });
    }

    // 5. CÁLCULO MÁSTER DE HUECOS CLÍNICOS (Considerando los buffers)
        const availableSlots = calculateAvailableSlots({
            targetDate,
            durationMinutes: duracionTarget,
            config,
            busyIntervals,
            now: today,
        });

    return NextResponse.json({ slots: availableSlots }, { status: 200 });

    } catch (error: unknown) {
        console.error('Availability Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
