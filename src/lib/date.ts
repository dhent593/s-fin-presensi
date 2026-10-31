/**
 * Centralized Date & Time Utility for PT Senndyt Sarungtangan Kreatif (S-Fin Presensi)
 * Standard factory timezone: Asia/Jakarta (WIB, UTC+7).
 */

export const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Returns a Date object shifted to WIB representation for year/month/date/hours access.
 */
export function getWibDate(date?: string | number | Date | null): Date {
  const d = date ? new Date(date) : new Date();
  return new Date(d.toLocaleString('en-US', { timeZone: WIB_TIMEZONE }));
}

/**
 * Formats a timestamp or date into HH:mm WIB string.
 */
export function formatWibTime(date: string | number | Date | null | undefined, includeSeconds = false): string {
  if (!date) return '--:--';
  try {
    return new Date(date)
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds ? { second: '2-digit' } : {}),
        timeZone: WIB_TIMEZONE,
      })
      .replace('.', ':');
  } catch {
    return '--:--';
  }
}

/**
 * Formats a date into Indonesian locale with Asia/Jakarta timezone.
 */
export function formatWibDate(
  date: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('id-ID', {
      timeZone: WIB_TIMEZONE,
      ...options,
    });
  } catch {
    return '';
  }
}

/**
 * Generates ISO strings with explicit +07:00 offset for full month Supabase query.
 */
export function getMonthRangeWib(
  year: number,
  month: number
): { start: string; end: string; totalDays: number } {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const mStr = String(month + 1).padStart(2, '0');
  const dStr = String(totalDays).padStart(2, '0');
  return {
    start: `${year}-${mStr}-01T00:00:00+07:00`,
    end: `${year}-${mStr}-${dStr}T23:59:59.999+07:00`,
    totalDays,
  };
}

/**
 * Generates ISO strings with explicit +07:00 offset for current day in WIB.
 */
export function getTodayRangeWib(): {
  start: string;
  end: string;
  year: number;
  month: number;
  day: number;
  dateStr: string;
} {
  const nowWib = getWibDate();
  const year = nowWib.getFullYear();
  const month = nowWib.getMonth();
  const day = nowWib.getDate();
  const mStr = String(month + 1).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  const dateStr = `${year}-${mStr}-${dStr}`;
  return {
    start: `${dateStr}T00:00:00+07:00`,
    end: `${dateStr}T23:59:59.999+07:00`,
    year,
    month,
    day,
    dateStr,
  };
}

/**
 * Indonesian month names list.
 */
export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

