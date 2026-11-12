// A short text about the coming hours ("Rain from about 12 to 15, up to 4 mm an hour.
// Gusts up to 16 m/s around 18."), and the numbers for the rest of today.
// Rules only, no AI: the same data always gives the same text.
import { currentHourIndex, placeNow, todayIndex, type Forecast } from './api';
import { fmtHour, translate, LOCALE, type Lang } from './i18n';
import { convertPrecip, fmtTemp, fmtWind, PRECIP_LABEL, type Units } from './units';

const WINDOW = 12; // hours ahead
const WET = 0.2; // mm in an hour that counts as precipitation
const GUSTY = 14; // m/s
const HEAVY = 2; // mm/h worth mentioning

type Kind = 'rain' | 'snow' | 'sleet';

function kindOf(code: number): Kind {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet';
  return 'rain';
}

interface Period {
  start: number; // hourly index
  end: number; // index of the hour after the last wet one
  max: number; // mm/h
  kind: Kind;
}

/** Wet periods from index `from` for `hours` hours; gaps of one dry hour are bridged. */
export function wetPeriods(f: Forecast, from: number, hours = WINDOW): Period[] {
  const h = f.hourly;
  const to = Math.min(h.time.length, from + hours);
  const out: Period[] = [];
  let cur: (Period & { kinds: Kind[] }) | null = null;
  for (let i = from; i < to; i++) {
    const wet = h.precipitation[i] >= WET;
    if (wet) {
      if (cur && i - cur.end <= 1) {
        cur.end = i + 1;
        cur.max = Math.max(cur.max, h.precipitation[i]);
        cur.kinds.push(kindOf(h.weather_code[i]));
      } else {
        if (cur) out.push(cur);
        cur = { start: i, end: i + 1, max: h.precipitation[i], kind: 'rain', kinds: [kindOf(h.weather_code[i])] };
      }
    }
  }
  if (cur) out.push(cur);
  for (const p of out as (Period & { kinds: Kind[] })[]) {
    const counts = new Map<Kind, number>();
    for (const k of p.kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
    p.kind = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    delete (p as Partial<typeof p>).kinds;
  }
  return out;
}

/** One to three short sentences about the next 12 hours. */
export function summarize(f: Forecast, lang: Lang, u: Units, now = placeNow(f)): string[] {
  const h = f.hourly;
  const i0 = currentHourIndex(f, now);
  const to = Math.min(h.time.length, i0 + WINDOW);
  if (to <= i0) return [];
  const tr = (k: string, p?: Record<string, string | number>) => translate(lang, k, p);
  const hour = (i: number) => fmtHour(lang, h.time[Math.min(i, h.time.length - 1)]);
  const out: string[] = [];

  // precipitation
  const periods = wetPeriods(f, i0, to - i0);
  if (!periods.length) {
    out.push(tr('sumDry', { h: to - i0 }));
  } else {
    const p = periods[0];
    const kind = tr(`kind_${p.kind}`);
    const heavy = p.max >= HEAVY
      ? tr('sumUpTo', { amount: `${new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: u.precip === 'in' ? 2 : 0 }).format(convertPrecip(p.max, u.precip))} ${PRECIP_LABEL[u.precip]}` })
      : '';
    const open = p.end >= to; // goes on past the window
    let s: string;
    if (p.start === i0 && open) s = tr('sumWetAll', { kind, h: to - i0 });
    else if (p.start === i0) s = tr('sumWetUntil', { kind, end: hour(p.end) });
    else if (open) s = tr('sumWetFrom', { kind, start: hour(p.start) });
    else s = tr('sumWetFromTo', { kind, start: hour(p.start), end: hour(p.end) });
    out.push(s.replace(/\.$/, `${heavy}.`));
  }

  // gusts
  let gi = i0;
  for (let i = i0; i < to; i++) if (h.wind_gusts_10m[i] > h.wind_gusts_10m[gi]) gi = i;
  if (h.wind_gusts_10m[gi] >= GUSTY) {
    out.push(tr('sumGusts', { wind: fmtWind(h.wind_gusts_10m[gi], u.wind, LOCALE[lang]), time: hour(gi) }));
  }

  // frost, or a big change in temperature
  const t0 = h.temperature_2m[i0];
  const frost = t0 > 0.5 ? h.temperature_2m.slice(i0, to).findIndex((v) => v <= 0) : -1;
  if (frost > 0) {
    out.push(tr('sumFrost', { time: hour(i0 + frost) }));
  } else {
    let lo = i0;
    let hi = i0;
    for (let i = i0; i < to; i++) {
      if (h.temperature_2m[i] < h.temperature_2m[lo]) lo = i;
      if (h.temperature_2m[i] > h.temperature_2m[hi]) hi = i;
    }
    if (h.temperature_2m[hi] - t0 >= 4) out.push(tr('sumWarmer', { temp: fmtTemp(h.temperature_2m[hi], u.temp), time: hour(hi) }));
    else if (t0 - h.temperature_2m[lo] >= 4) out.push(tr('sumColder', { temp: fmtTemp(h.temperature_2m[lo], u.temp), time: hour(lo) }));
  }
  return out.slice(0, 3);
}

export interface Rest {
  /** hourly indexes [from, to) left of today */
  from: number;
  to: number;
  precip: number; // mm still to come today
  precipSoFar: number; // mm already fallen today (from the forecast data)
  pop: number | null; // highest chance of precipitation from now on
  code: number; // most significant weather code from now on
  isDay: boolean;
  windMax: number;
  gustMax: number;
}

/** Today from now to midnight, so past hours do not count ("100 % rain" at 08 does not matter at 20). */
export function restOfToday(f: Forecast, now = placeNow(f)): Rest {
  const h = f.hourly;
  const date = f.daily.time[todayIndex(f, now)];
  const from = currentHourIndex(f, now);
  let to = from;
  while (to < h.time.length && h.time[to].startsWith(date)) to++;
  if (to === from) to = Math.min(h.time.length, from + 1);
  const start = h.time.findIndex((t) => t.startsWith(date));
  const sum = (a: number, b: number) => h.precipitation.slice(a, b).reduce((x, y) => x + y, 0);
  const pops = h.precipitation_probability.slice(from, to).filter((x): x is number => x != null);
  let code = h.weather_code[from];
  for (let i = from; i < to; i++) if (h.weather_code[i] > code) code = h.weather_code[i];
  return {
    from,
    to,
    precip: sum(from, to),
    precipSoFar: start >= 0 ? sum(start, from) : 0,
    pop: pops.length ? Math.max(...pops) : null,
    code,
    isDay: h.is_day[from] === 1,
    windMax: Math.max(...h.wind_speed_10m.slice(from, to)),
    gustMax: Math.max(...h.wind_gusts_10m.slice(from, to)),
  };
}

export interface Nowcast {
  /** 15-minute steps from now, two hours */
  steps: { time: string; mm: number }[];
  /** the text: key and parameters for i18n */
  key: 'ncStarts' | 'ncStops' | 'ncAll';
  minutes: number;
  kind: Kind;
}

const NC_WET = 0.1; // mm in 15 minutes

/**
 * Precipitation in the next two hours, or null when it stays dry (or the data is
 * too old to say anything about now).
 */
export function nowcast(f: Forecast, now = placeNow(f)): Nowcast | null {
  const m = f.minutely_15;
  if (!m) return null;
  // the quarter we are in
  const q = `${now.slice(0, 14)}${String(Math.floor(Number(now.slice(14, 16)) / 15) * 15).padStart(2, '0')}`;
  const start = m.time.findIndex((t) => t >= q);
  if (start < 0 || m.time.length - start < 6) return null;
  const steps = m.time.slice(start, start + 8).map((time, i) => ({ time, mm: m.precipitation[start + i] ?? 0 }));
  const wet = steps.map((s) => s.mm >= NC_WET);
  if (!wet.some(Boolean)) return null;
  const minutesTo = (t: string) => Math.max(0, Math.round((Date.parse(`${t}:00Z`) - Date.parse(`${now}:00Z`)) / 60000 / 5) * 5);
  const kind = kindOf(f.hourly.weather_code[currentHourIndex(f, now)] ?? 61);
  if (wet[0]) {
    const stop = wet.indexOf(false);
    if (stop < 0) return { steps, key: 'ncAll', minutes: 0, kind };
    return { steps, key: 'ncStops', minutes: Math.max(5, minutesTo(steps[stop].time)), kind };
  }
  const begin = wet.indexOf(true);
  return { steps, key: 'ncStarts', minutes: Math.max(5, minutesTo(steps[begin].time)), kind };
}
