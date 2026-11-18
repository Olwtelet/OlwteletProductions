// Header clock helpers (the original's chunk 3764 showed two offices). Olwtelet Productions has one location,
// Brasília (src/content/brand.ts): a single row with its local time.
import { BRAND } from '@/content/brand';

export const CLOCKS = [{ label: BRAND.location.clockLabel, timeZone: BRAND.location.timeZone }] as const;

/** Refresh period: once at mount, then every 60 000 ms from mount (not minute-aligned, as before). */
export const CLOCK_REFRESH_MS = 60_000;

/** `Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",hour12:false,timeZoneName:"shortOffset",timeZone})` → "16:53 GMT-3" */
export function formatClock(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'shortOffset',
    timeZone,
  }).format(date);
}

/** Daytime in that time zone (the blinking dot), 08:00–17:59; otherwise the moon. */
export function isDaytime(text: string): boolean {
  const [h] = text.split(':').map(Number);
  return h >= 8 && h < 18;
}
