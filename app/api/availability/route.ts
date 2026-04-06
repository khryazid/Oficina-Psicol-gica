import { NextResponse } from 'next/server';
import { getCalendarClient, CLINIC_CALENDAR_ID, CLINIC_TIMEZONE } from '@/lib/google/calendar';
import { startOfDay, endOfDay, setHours, setMinutes, parseISO, isBefore, addMinutes, format, addDays } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabase/server';
import { defaultFallbackConfig } from '@/app/api/admin/config/route';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const durationParam = searchParams.get('duration'); // NUEVO
    if (!dateParam) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });

    const targetDate = parseISO(dateParam);
    const duracionTarget = durationParam ? parseInt(durationParam, 10) : 50; // Fallback si no llega el parametro
    const today = new Date();

    // 1. OBTENER CONFIGURACIÓN DEL PSICOLOGO V3
    let config: any = { ...defaultFallbackConfig };

    const { data: dbConfig } = await supabaseAdmin
        .from('configuracion_clinica')
        .select('*')
        .limit(1)
        .single();
    
    if (dbConfig) {
        config = { ...config, ...dbConfig };
    }

    const { anticipacion_minima_horas = 24, anticipacion_maxima_dias = 30 } = config;
    const dayOfWeek = String(targetDate.getDay());
    const formattedDate = format(targetDate, "yyyy-MM-dd");

    // A. REGLAS DE LA FÍSICA Y LA LÓGICA (ANTICIPACIÓN V4)
    const margenMinimoAsistencia = addMinutes(today, anticipacion_minima_horas * 60);
    const margenMaximoAsistencia = addDays(today, anticipacion_maxima_dias);

    if (isBefore(targetDate, startOfDay(margenMinimoAsistencia)) || !isBefore(targetDate, margenMaximoAsistencia)) {
        // La fecha entera está por debajo del rango de anticipación mínima o supera el límite
        return NextResponse.json({ slots: [] }, { status: 200 });
    }

    const diaHabitual = config.horario_habitual[dayOfWeek as keyof typeof config.horario_habitual];

    // Buscar "Overrrides" o bloqueos absolutos de la fecha exacta
    const bloqueoDelDia = config.bloqueos_especificos.filter((b: any) => b.fecha === formattedDate);
    const esBloqueoTotal = bloqueoDelDia.some((b: any) => b.todo_el_dia === true);

    // 2. EXCLUSIÓN DURA
    if (
        isBefore(targetDate, startOfDay(today)) || 
        !diaHabitual.activo ||
        esBloqueoTotal
    ) {
        return NextResponse.json({ slots: [] }, { status: 200 }); 
    }

    // 3. LÍMITES INTRA-DÍA (De la jornada particular)
    const [startH, startM] = diaHabitual.inicio.split(':').map(Number);
    const [endH, endM] = diaHabitual.fin.split(':').map(Number);

    const dayStart = setMinutes(setHours(targetDate, startH), startM);
    const dayEnd = setMinutes(setHours(targetDate, endH), endM);

    // 4. COLECCIÓN DE HORAS OCUPADAS (INTERVALOS "BUSY")
    let busyIntervals: {start: Date, end: Date}[] = [];

    // 4A. Incorporar Descansos fijos del día habitual (Almuerzos, Pausas activas)
    if (diaHabitual.descansos && Array.isArray(diaHabitual.descansos)) {
        diaHabitual.descansos.forEach((d: any) => {
            const [dsH, dsM] = d.inicio.split(':').map(Number);
            const [deH, deM] = d.fin.split(':').map(Number);
            busyIntervals.push({
                start: setMinutes(setHours(targetDate, dsH), dsM),
                end: setMinutes(setHours(targetDate, deH), deM)
            });
        });
    }

    // 4B. Incorporar Bloqueos Parciales Específicos para hoy (Medio día del 24 Dic, etc)
    bloqueoDelDia.forEach((b: any) => {
        if (!b.todo_el_dia && b.inicio && b.fin) {
            const [bsH, bsM] = b.inicio.split(':').map(Number);
            const [beH, beM] = b.fin.split(':').map(Number);
            busyIntervals.push({
                start: setMinutes(setHours(targetDate, bsH), bsM),
                end: setMinutes(setHours(targetDate, beH), beM)
            });
        }
    });

    // 4C. Consultar a GOOGLE CALENDAR
    const client = getCalendarClient();
    if (client && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const response = await client.freebusy.query({
            requestBody: {
                timeMin: dayStart.toISOString(),
                timeMax: dayEnd.toISOString(),
                timeZone: CLINIC_TIMEZONE,
                items: [{ id: CLINIC_CALENDAR_ID }]
            }
        });
        const busy = response.data.calendars?.[CLINIC_CALENDAR_ID]?.busy || [];
        busy.forEach((b: any) => {
            busyIntervals.push({ start: new Date(b.start), end: new Date(b.end) });
        });
    } else {
        // En MOCK: A modo demostración, tiramos 1 reunión random de Google Calendar falso
        const mockBusy1Start = setMinutes(setHours(targetDate, 14), 0);
        busyIntervals.push({ start: mockBusy1Start, end: addMinutes(mockBusy1Start, 60) });
    }

    // 5. CÁLCULO MÁSTER DE HUECOS CLÍNICOS (Considerando los buffers)
    const availableSlots = [];
    let currentSlotStart = dayStart;

    while (isBefore(currentSlotStart, dayEnd)) {
        // ¿La sesión de N minutos cabe en este espacio antes de cerrar la clínica?
        const currentSlotEnd = addMinutes(currentSlotStart, duracionTarget);
        if (isBefore(dayEnd, currentSlotEnd)) break;

        // Comparamos el Slot Deseado contra todos los intervalos bloqueados recolectados
        // Regla: No se pueden "pisar"
        const isColliding = busyIntervals.some(busy => (currentSlotStart < busy.end && currentSlotEnd > busy.start));
        const isPastNow = isBefore(currentSlotStart, today);

        if (!isColliding && !isPastNow) {
            availableSlots.push({ start: currentSlotStart.toISOString(), end: currentSlotEnd.toISOString() });
            
            // Si agendamos uno disponible, le damos su bloque de Descanso Clínico antes de calcular el siguiente
            currentSlotStart = addMinutes(currentSlotEnd, config.tiempo_descanso_mins);
        } else {
            // Si choca con un evento o ya pasó, "deslizamos" el buscador al reloj buscando huecos finamente cada 15 min.
            currentSlotStart = addMinutes(currentSlotStart, 15);
        }
    }

    return NextResponse.json({ slots: availableSlots }, { status: 200 });

  } catch (err) {
    console.error("Availability Error:", err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
