// The app always fetches metric data (°C, m/s, mm) and converts on display, so
// switching units is instant and the offline copy stays valid.

export type TempUnit = 'c' | 'f';
export type WindUnit = 'ms' | 'kmh' | 'mph';
export type PrecipUnit = 'mm' | 'in';

export interface Units {
  temp: TempUnit;
  wind: WindUnit;
  precip: PrecipUnit;
}

export const METRIC: Units = { temp: 'c', wind: 'ms', precip: 'mm' };
export const US: Units = { temp: 'f', wind: 'mph', precip: 'in' };

export function defaultUnits(locale: string): Units {
  return /^en-US$/i.test(locale) ? { ...US } : { ...METRIC };
}

export function convertTemp(c: number, u: TempUnit): number {
  return u === 'f' ? c * 9 / 5 + 32 : c;
}

export function convertWind(ms: number, u: WindUnit): number {
  if (u === 'kmh') return ms * 3.6;
  if (u === 'mph') return ms * 2.236936;
  return ms;
}

export function convertPrecip(mm: number, u: PrecipUnit): number {
  return u === 'in' ? mm / 25.4 : mm;
}

export const WIND_LABEL: Record<WindUnit, string> = { ms: 'm/s', kmh: 'km/h', mph: 'mph' };
export const PRECIP_LABEL: Record<PrecipUnit, string> = { mm: 'mm', in: 'in' };

/** Rounded temperature with a degree sign, e.g. "-3°" (a real minus sign). */
export function fmtTemp(c: number, u: TempUnit): string {
  const v = Math.round(convertTemp(c, u));
  return `${v < 0 ? '−' : ''}${Math.abs(v)}°`;
}

export function fmtWind(ms: number, u: WindUnit, locale: string): string {
  const v = convertWind(ms, u);
  const digits = u === 'ms' && v < 10 ? 1 : 0;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v)} ${WIND_LABEL[u]}`;
}

export function fmtPrecip(mm: number, u: PrecipUnit, locale: string): string {
  const v = convertPrecip(mm, u);
  const digits = u === 'in' ? 2 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(v)} ${PRECIP_LABEL[u]}`;
}
