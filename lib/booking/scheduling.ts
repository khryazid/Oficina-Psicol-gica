import { addDays, addMinutes, isBefore, startOfDay } from 'date-fns';
import { defaultFallbackConfig, type ClinicConfig, type ClinicDaySchedule, type ClinicBlock } from '@/lib/clinic/config';

const CLINIC_TIMEZONE = 'America/Caracas';
const CLINIC_UTC_OFFSET_MINUTES = -4 * 60;

type ClinicDateParts = {
  year: number;
  month: number;
  day: number;
};

function toClinicDateParts(date: Date): ClinicDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function clinicLocalToUtcDate(parts: ClinicDateParts, hours: number, minutes: number): Date {
  const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day, hours, minutes) - CLINIC_UTC_OFFSET_MINUTES * 60_000;
  return new Date(utcMs);
}

export function parseClinicDateStamp(dateStamp: string): Date {
  const [yearRaw, monthRaw, dayRaw] = dateStamp.split('-').map(Number);
  if (!yearRaw || !monthRaw || !dayRaw) {
    throw new Error('Formato de fecha inválido. Se esperaba yyyy-MM-dd');
  }

  return clinicLocalToUtcDate({ year: yearRaw, month: monthRaw, day: dayRaw }, 12, 0);
}

export function getClinicDateStamp(date: Date): string {
  const parts = toClinicDateParts(date);
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

export function getClinicWeekday(date: Date): string {
  const parts = toClinicDateParts(date);
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  return String(weekday);
}

export function getClinicDayBounds(date: Date): { start: Date; end: Date } {
  const parts = toClinicDateParts(date);
  const start = clinicLocalToUtcDate(parts, 0, 0);
  const end = clinicLocalToUtcDate(parts, 23, 59);
  return { start, end };
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface TimeSlot {
  start: string;
  end: string;
}

const ACTIVE_BOOKING_STATUSES = ['pending_payment', 'pending_confirmation', 'confirmed'] as const;

function pushInterval(intervals: BusyInterval[], start: Date, end: Date): void {
  intervals.push({ start, end });
}

function toDateTime(targetDate: Date, timeValue: string): Date {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const parts = toClinicDateParts(targetDate);
  return clinicLocalToUtcDate(parts, hours, minutes);
}

function getDaySchedule(config: ClinicConfig, targetDate: Date): ClinicDaySchedule | undefined {
  return config.horario_habitual[String(targetDate.getDay())];
}

function buildBlockedIntervals(targetDate: Date, blocks: ClinicBlock[]): BusyInterval[] {
  const dateStamp = getClinicDateStamp(targetDate);
  const dayBlocks = blocks.filter((block) => block.fecha === dateStamp);
  const intervals: BusyInterval[] = [];

  for (const block of dayBlocks) {
    if (block.todo_el_dia) {
      const { start, end } = getClinicDayBounds(targetDate);
      pushInterval(intervals, start, end);
      continue;
    }

    if (block.inicio && block.fin) {
      pushInterval(intervals, toDateTime(targetDate, block.inicio), toDateTime(targetDate, block.fin));
    }
  }

  return intervals;
}

export function buildBusyIntervals(targetDate: Date, config: ClinicConfig): BusyInterval[] {
  const schedule = getDaySchedule(config, targetDate);
  if (!schedule || !schedule.activo) {
    return [];
  }

  const intervals: BusyInterval[] = [];

  for (const breakBlock of schedule.descansos ?? []) {
    pushInterval(intervals, toDateTime(targetDate, breakBlock.inicio), toDateTime(targetDate, breakBlock.fin));
  }

  intervals.push(...buildBlockedIntervals(targetDate, config.bloqueos_especificos));
  return intervals;
}

export function isSlotColliding(slotStart: Date, slotEnd: Date, busyIntervals: BusyInterval[]): boolean {
  return busyIntervals.some((busyInterval) => slotStart < busyInterval.end && slotEnd > busyInterval.start);
}

export function calculateAvailableSlots(params: {
  targetDate: Date;
  durationMinutes: number;
  config: ClinicConfig;
  busyIntervals: BusyInterval[];
  now?: Date;
}): TimeSlot[] {
  const { targetDate, durationMinutes, config, busyIntervals, now = new Date() } = params;
  const schedule = getDaySchedule(config, targetDate) ?? defaultFallbackConfig.horario_habitual['0'];

  if (!schedule.activo) {
    return [];
  }

  const dayStart = toDateTime(targetDate, schedule.inicio);
  const dayEnd = toDateTime(targetDate, schedule.fin);

  const minimumAdvance = addMinutes(now, config.anticipacion_minima_horas * 60);
  const maximumAdvance = addDays(now, config.anticipacion_maxima_dias);

  if (isBefore(targetDate, startOfDay(minimumAdvance)) || !isBefore(targetDate, maximumAdvance)) {
    return [];
  }

  const slots: TimeSlot[] = [];
  let currentSlotStart = dayStart;

  while (isBefore(currentSlotStart, dayEnd)) {
    const currentSlotEnd = addMinutes(currentSlotStart, durationMinutes);

    if (isBefore(dayEnd, currentSlotEnd)) {
      break;
    }

    const collides = isSlotColliding(currentSlotStart, currentSlotEnd, busyIntervals);
    const isPastNow = isBefore(currentSlotStart, now);

    if (!collides && !isPastNow) {
      slots.push({ start: currentSlotStart.toISOString(), end: currentSlotEnd.toISOString() });
      currentSlotStart = addMinutes(currentSlotEnd, config.tiempo_descanso_mins);
    } else {
      currentSlotStart = addMinutes(currentSlotStart, 15);
    }
  }

  return slots;
}

export function isSlotStillValid(slotStart: Date, slotEnd: Date, busyIntervals: BusyInterval[]): boolean {
  return !isSlotColliding(slotStart, slotEnd, busyIntervals);
}

export function getBookingStatuses(): readonly string[] {
  return ACTIVE_BOOKING_STATUSES;
}