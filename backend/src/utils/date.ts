import { SessionType } from '../types';

export function getTodayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

export function toDateOnly(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    const str = dateInput.toISOString().slice(0, 10);
    return new Date(`${str}T00:00:00.000Z`);
  }
  const normalized = dateInput.trim().slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Ngày không hợp lệ: ${dateInput}`);
  }
  return parsed;
}

export function formatDateOnly(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const date = toDateOnly(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

export function getSessionBounds(session: SessionType): {
  startTime: string;
  endTime: string;
  startMinutes: number;
} {
  if (session === 'MORNING') {
    return { startTime: '07:30', endTime: '11:30', startMinutes: 7 * 60 + 30 };
  }
  return { startTime: '13:30', endTime: '17:00', startMinutes: 13 * 60 + 30 };
}

export function getSessionLabel(session: SessionType): string {
  return session === 'MORNING' ? 'Buổi Sáng (07:30 - 11:30)' : 'Buổi Chiều (13:30 - 17:00)';
}

export function computeEstimatedTime(
  session: SessionType,
  queueNumber: number,
  avgMinutesPerPatient = 12
): string {
  const { startMinutes } = getSessionBounds(session);
  const offset = Math.max(0, queueNumber - 1) * avgMinutesPerPatient;
  const totalMinutes = startMinutes + offset;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}
