import { addDays, addMinutes, endOfDay, format, isBefore, setHours, setMinutes, startOfDay } from 'date-fns';
import { defaultFallbackConfig, type ClinicConfig, type ClinicDaySchedule, type ClinicBlock } from '@/lib/clinic/config';

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
  return setMinutes(setHours(targetDate, hours), minutes);
}

function getDaySchedule(config: ClinicConfig, targetDate: Date): ClinicDaySchedule | undefined {
  return config.horario_habitual[String(targetDate.getDay())];
}

function buildBlockedIntervals(targetDate: Date, blocks: ClinicBlock[]): BusyInterval[] {
  const dateStamp = format(targetDate, 'yyyy-MM-dd');
  const dayBlocks = blocks.filter((block) => block.fecha === dateStamp);
  const intervals: BusyInterval[] = [];

  for (const block of dayBlocks) {
    if (block.todo_el_dia) {
      pushInterval(intervals, startOfDay(targetDate), endOfDay(targetDate));
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

  const dateStamp = format(targetDate, 'yyyy-MM-dd');
  const dayStart = toDateTime(targetDate, schedule.inicio);
  const dayEnd = toDateTime(targetDate, schedule.fin);

  const minimumAdvance = addMinutes(now, config.anticipacion_minima_horas * 60);
  const maximumAdvance = addDays(now, config.anticipacion_maxima_dias);

  if (isBefore(targetDate, startOfDay(minimumAdvance)) || !isBefore(targetDate, maximumAdvance)) {
    return [];
  }

  if (dateStamp !== format(targetDate, 'yyyy-MM-dd')) {
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