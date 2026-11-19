export function formatCurrencyVND(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? Number(amount) : amount ?? 0;
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumberVN(num: number | null | undefined): string {
  return new Intl.NumberFormat('vi-VN').format(num ?? 0);
}

export function formatDateVN(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`) : dateStr;
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeVN(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatQueueNumber(stt: number | null | undefined): string {
  if (!stt && stt !== 0) return '#--';
  return `#${String(stt).padStart(2, '0')}`;
}

export function toLocalISODate(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function getTodayISODate(): string {
  return toLocalISODate(new Date());
}

export function getSessionLabel(session: string | undefined): string {
  if (session === 'MORNING') return 'Buổi Sáng (07:30 - 11:30)';
  if (session === 'AFTERNOON') return 'Buổi Chiều (13:30 - 17:00)';
  return session || '—';
}

export function getSessionShortLabel(session: string | undefined): string {
  if (session === 'MORNING') return 'Buổi Sáng';
  if (session === 'AFTERNOON') return 'Buổi Chiều';
  return session || '—';
}
