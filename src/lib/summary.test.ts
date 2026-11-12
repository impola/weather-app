import { describe, expect, it } from 'vitest';
import type { Forecast } from './api';
import { aqiLevel, nowcast, pollenNow, restOfToday, summarize, uvWindow, vsYesterday, wetPeriods } from './summary';
import type { Air } from './api';
import { METRIC } from './units';

/** 48 hours from 2026-11-12 00:00; now is 10:00 */
function make(over: Partial<Record<'precipitation' | 'temperature_2m' | 'wind_gusts_10m' | 'weather_code', (i: number) => number>> = {}): Forecast {
  const n = 48;
  const time = Array.from({ length: n }, (_, i) => `2026-11-${12 + Math.floor(i / 24)}T${String(i % 24).padStart(2, '0')}:00`);
  const col = (k: keyof typeof over, d: number) => Array.from({ length: n }, (_, i) => over[k]?.(i) ?? d);
  return {
    timezone: 'Europe/Stockholm',
    current: { time: '2026-11-12T10:00' },
    hourly: {
      time,
      temperature_2m: col('temperature_2m', 5),
      precipitation: col('precipitation', 0),
      weather_code: col('weather_code', 3),
      wind_gusts_10m: col('wind_gusts_10m', 6),
      wind_speed_10m: time.map(() => 3),
      precipitation_probability: time.map(() => 20),
      is_day: time.map((t) => (Number(t.slice(11, 13)) >= 8 && Number(t.slice(11, 13)) < 16 ? 1 : 0)),
    },
    daily: { time: ['2026-11-12', '2026-11-13'] },
  } as unknown as Forecast;
}

describe('summary', () => {
  it('says when it stays dry', () => {
    expect(summarize(make(), 'sv', METRIC)).toEqual(['Inget regn de närmaste 12 timmarna.']);
    expect(summarize(make(), 'en', METRIC)).toEqual(['No rain in the next 12 hours.']);
  });

  it('describes a rain period with its heaviest hour', () => {
    const f = make({ precipitation: (i) => (i >= 12 && i < 15 ? (i === 13 ? 4 : 1) : 0), weather_code: (i) => (i >= 12 && i < 15 ? 63 : 3) });
    expect(summarize(f, 'sv', METRIC)[0]).toBe('Regn från ca 12 till 15, upp till 4 mm per timme.');
    expect(wetPeriods(f, 10)).toEqual([{ start: 12, end: 15, max: 4, kind: 'rain' }]);
  });

  it('bridges a single dry hour and knows rain that goes on', () => {
    const f = make({ precipitation: (i) => (i >= 10 && i !== 12 ? 0.5 : 0) });
    expect(wetPeriods(f, 10)).toHaveLength(1);
    expect(summarize(f, 'en', METRIC)[0]).toBe('Rain for the next 12 hours.');
    const g = make({ precipitation: (i) => (i >= 10 && i < 13 ? 0.5 : 0) });
    expect(summarize(g, 'sv', METRIC)[0]).toBe('Regn fram till ca 13.');
    const s = make({ precipitation: (i) => (i >= 16 ? 0.6 : 0), weather_code: () => 73 });
    expect(summarize(s, 'sv', METRIC)[0]).toBe('Snö från ca 16.');
  });

  it('mentions strong gusts and frost', () => {
    const f = make({ wind_gusts_10m: (i) => (i === 18 ? 17 : 6), temperature_2m: (i) => 5 - Math.max(0, i - 10) * 0.6 });
    const s = summarize(f, 'sv', METRIC);
    expect(s).toContain('Byar upp till 17 m/s kring 18.');
    expect(s).toContain('Minusgrader från ca 19, risk för halka.');
  });

  it('mentions a big temperature change', () => {
    const f = make({ temperature_2m: (i) => (i < 10 ? 2 : 2 + (i - 10)) });
    expect(summarize(f, 'sv', METRIC)).toContain('Upp mot 13° kring 21.');
  });
});

describe('rest of today', () => {
  it('counts from now to midnight', () => {
    const f = make({ precipitation: (i) => (i < 10 ? 2 : i < 24 ? 0.5 : 9), weather_code: (i) => (i < 10 ? 65 : 61) });
    const r = restOfToday(f, '2026-11-12T10:20');
    expect([r.from, r.to]).toEqual([10, 24]);
    expect(r.precip).toBeCloseTo(7);
    expect(r.precipSoFar).toBeCloseTo(20);
    expect(r.code).toBe(61);
  });
});

describe('nowcast', () => {
  const withQuarters = (mm: number[]) => {
    const f = make();
    const time = mm.map((_, i) => { const m = 10 * 60 + i * 15; return `2026-11-12T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; });
    (f as unknown as { minutely_15: unknown }).minutely_15 = { time, precipitation: mm };
    return f;
  };

  it('is null when it stays dry', () => {
    expect(nowcast(withQuarters([0, 0, 0, 0, 0, 0, 0, 0, 0]), '2026-11-12T10:05')).toBeNull();
  });

  it('says when rain starts', () => {
    const n = nowcast(withQuarters([0, 0, 0.3, 0.5, 0.2, 0, 0, 0, 0]), '2026-11-12T10:05');
    expect(n).toMatchObject({ key: 'ncStarts', minutes: 25 });
    expect(n!.steps).toHaveLength(8);
  });

  it('says when rain stops, or that it goes on', () => {
    expect(nowcast(withQuarters([0.4, 0.4, 0.2, 0, 0, 0, 0, 0, 0]), '2026-11-12T10:10')).toMatchObject({ key: 'ncStops', minutes: 35 });
    expect(nowcast(withQuarters([0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4]), '2026-11-12T10:10')).toMatchObject({ key: 'ncAll' });
  });

  it('says nothing from an old copy', () => {
    expect(nowcast(withQuarters([0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4]), '2026-11-12T13:00')).toBeNull();
  });
});

describe('yesterday, UV, air', () => {
  it('compares with the same hour yesterday', () => {
    // now is 2026-11-13 10:00 (index 34); yesterday 10:00 is index 10
    const f = make({ temperature_2m: (i) => (i === 10 ? 8 : 5) });
    (f as unknown as { current: { time: string; temperature_2m: number } }).current = { time: '2026-11-13T10:00', temperature_2m: 5 } as never;
    expect(vsYesterday(f, '2026-11-13T10:20')).toBe(-3);
    expect(summarize(f, 'sv', METRIC, '2026-11-13T10:20')[0]).toBe('3° kallare än igår.');
    expect(vsYesterday(make(), '2026-11-12T10:20')).toBeNull(); // no data from yesterday
  });

  it('finds the hours that need sun protection', () => {
    const f = make();
    (f.hourly as unknown as { uv_index: number[] }).uv_index = f.hourly.time.map((_, i) => (i >= 11 && i <= 14 ? 4 : 1));
    expect(uvWindow(f, 0)).toEqual({ from: '2026-11-12T11:00', to: '2026-11-12T15:00' });
    expect(uvWindow(f, 1)).toBeNull();
  });

  it('names air quality and pollen levels', () => {
    expect([10, 25, 45, 70, 90, 120].map(aqiLevel)).toEqual(['aqGood', 'aqFair', 'aqModerate', 'aqPoor', 'aqVeryPoor', 'aqExtreme']);
    expect(pollenNow({ european_aqi: 20, pm2_5: 1, pm10: 1, birch_pollen: 60, grass_pollen: 0.2, alder_pollen: 5 } as Air)).toEqual([
      { kind: 'birch', level: 'pHigh' },
      { kind: 'alder', level: 'pLow' },
    ]);
  });
});
