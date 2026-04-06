import { parseISO, addMinutes, isBefore, addDays, startOfDay, format } from 'date-fns';

const targetDateStr = "2026-04-08T14:00:00.000Z";
const targetDate = parseISO(targetDateStr);
const duracionTarget = 50;
const today = new Date("2026-04-06T09:50:00-04:00");

const config = {
    anticipacion_minima_horas: 24,
    anticipacion_maxima_dias: 30,
    tiempo_descanso_mins: 15,
    horario_habitual: {
        "1": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "2": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "3": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "4": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "5": { activo: true, inicio: "09:00", fin: "17:00", descansos: [] },
        "6": { activo: false, inicio: "09:00", fin: "13:00", descansos: [] },
        "0": { activo: false, inicio: "09:00", fin: "13:00", descansos: [] }
    },
    bloqueos_especificos: []
};

const dayOfWeek = String(targetDate.getDay());
const formattedDate = format(targetDate, "yyyy-MM-dd");

console.log("Target Date:", targetDate);
console.log("Today:", today);
console.log("Day of Week:", dayOfWeek); // 3 (Miercoles)
console.log("Formatted:", formattedDate);

const margenMinimoAsistencia = addMinutes(today, config.anticipacion_minima_horas * 60);
const margenMaximoAsistencia = addDays(today, config.anticipacion_maxima_dias);

console.log("Margen Minimo:", margenMinimoAsistencia);
console.log("Margen Maximo:", margenMaximoAsistencia);

console.log("Es under minimo?", isBefore(targetDate, startOfDay(margenMinimoAsistencia)));
console.log("Es over maximo?", !isBefore(targetDate, margenMaximoAsistencia));
