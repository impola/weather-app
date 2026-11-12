import { describe, expect, it } from 'vitest';
import { DICTS, detectLang, fmtDayLong, fmtDayShort, fmtHour, fmtPct, fmtStamp, fmtTime, parseLocal, translate, compassLabel } from './i18n';
import { convertPrecip, convertTemp, convertWind, defaultUnits, fmtPrecip, fmtTemp, fmtWind } from './units';
import { WMO_ICONS, WMO_KEYS, compassIndex, skyFor, tempColor, tempGradient, weatherInfo } from './weather';
import { chartRange, currentHourIndex, nowValues, placeId, placeNow, todayIndex, type Forecast } from './api';

describe('i18n', () => {
  it('has the same keys in Swedish and English, and a text for every weather code', () => {
    expect(Object.keys(DICTS.en).sort()).toEqual(Object.keys(DICTS.sv).sort());
    for (const k of WMO_KEYS) {
      expect(DICTS.sv).toHaveProperty(k);
      expect(DICTS.en).toHaveProperty(k);
    }
  });

  it('detects the language', () => {
    expect(detectLang(['sv-SE', 'en'])).toBe('sv');
    expect(detectLang(['en-US'])).toBe('en');
    expect(detectLang(['de-DE', 'sv'])).toBe('sv');
    expect(detectLang(['fr'])).toBe('en');
  });

  it('fills in parameters', () => {
    expect(translate('sv', 'updated', { time: '14:05' })).toBe('Uppdaterad 14:05');
    expect(translate('en', 'updated', { time: '2:05 pm' })).toBe('Updated 2:05 pm');
  });

  it('keeps the wall-clock time of the place', () => {
    expect(parseLocal('2026-11-12T14:30').toISOString()).toBe('2026-11-12T14:30:00.000Z');
    expect(fmtTime('sv', '2026-11-12T07:05')).toBe('07:05');
    expect(fmtTime('en', '2026-11-12T19:05')).toMatch(/^7:05\s?pm$/i);
    expect(fmtHour('sv', '2026-11-12T09:00')).toBe('09');
    expect(fmtHour('en', '2026-11-12T21:00')).toMatch(/^9\s?pm$/i);
  });

  it('names days', () => {
    expect(fmtDayShort('sv', '2026-11-12', 0)).toBe('Idag');
    expect(fmtDayShort('en', '2026-11-13', 1)).toBe('Tomorrow');
    expect(fmtDayShort('sv', '2026-11-13', 1)).toBe('Imorgon');
    expect(fmtDayShort('sv', '2026-11-14', 2)).toBe('Lör');
    expect(fmtDayShort('en', '2026-11-14', 2)).toBe('Sat');
    expect(fmtDayLong('sv', '2026-11-12')).toBe('Torsdag 12 november');
    expect(fmtDayLong('en', '2026-11-12')).toBe('Thursday 12 November');
  });

  it('names compass directions', () => {
    expect(compassLabel('sv', compassIndex(90))).toBe('O');
    expect(compassLabel('en', compassIndex(225))).toBe('SW');
    expect(compassIndex(359)).toBe(0);
    expect(compassIndex(-45)).toBe(7);
  });
});

describe('time stamps', () => {
  it('shows the time, the weekday, or the date', () => {
    const now = new Date(2026, 10, 12, 13, 0);
    expect(fmtStamp('sv', new Date(2026, 10, 12, 9, 5), now)).toBe('09:05');
    expect(fmtStamp('sv', new Date(2026, 10, 13, 23, 0), now)).toBe('fre 23:00');
    expect(fmtStamp('sv', new Date(2026, 3, 20, 0, 0), now)).toBe('20 apr');
    expect(fmtStamp('en', new Date(2026, 3, 20, 0, 0), now)).toBe('20 Apr');
  });
});

describe('percentages', () => {
  it('uses a space in Swedish and none in English', () => {
    expect(fmtPct('sv', 61)).toBe('61\u00a0%');
    expect(fmtPct('en', 61)).toBe('61%');
    expect(fmtPct('sv', null)).toBe('–');
  });
});

describe('temperature colours', () => {
  it('follows the absolute scale', () => {
    expect(tempColor(0)).toBe('rgb(103,232,249)');
    expect(tempColor(-40)).toBe(tempColor(-20));
    expect(tempColor(5)).toBe('rgb(178,228,160)');
    expect(tempGradient(2, 2)).toBe(tempColor(2));
    expect(tempGradient(-5, 15)).toMatch(/^linear-gradient\(90deg, rgb\(.*\) 0\.0%, rgb\(103,232,249\) 25\.0%, rgb\(253,224,71\) 75\.0%, .* 100\.0%\)$/);
  });
});

describe('units', () => {
  it('converts', () => {
    expect(convertTemp(100, 'f')).toBe(212);
    expect(convertTemp(-40, 'f')).toBe(-40);
    expect(convertWind(10, 'kmh')).toBe(36);
    expect(convertWind(10, 'mph')).toBeCloseTo(22.37, 2);
    expect(convertPrecip(25.4, 'in')).toBe(1);
  });

  it('formats', () => {
    expect(fmtTemp(-3.4, 'c')).toBe('−3°');
    expect(fmtTemp(-0.4, 'c')).toBe('0°');
    expect(fmtTemp(20, 'f')).toBe('68°');
    expect(fmtWind(4.25, 'ms', 'sv-SE')).toBe('4,3 m/s');
    expect(fmtWind(12.4, 'ms', 'sv-SE')).toBe('12 m/s');
    expect(fmtPrecip(1.25, 'mm', 'en-GB')).toBe('1.3 mm');
  });

  it('picks defaults from the locale', () => {
    expect(defaultUnits('en-US')).toEqual({ temp: 'f', wind: 'mph', precip: 'in' });
    expect(defaultUnits('sv-SE')).toEqual({ temp: 'c', wind: 'ms', precip: 'mm' });
    expect(defaultUnits('en-GB')).toEqual({ temp: 'c', wind: 'ms', precip: 'mm' });
  });
});

describe('weather codes', () => {
  it('maps codes to texts and day / night icons', () => {
    expect(weatherInfo(0, true)).toEqual({ key: 'clear', icon: 'clear-day' });
    expect(weatherInfo(0, false)).toEqual({ key: 'clear', icon: 'clear-night' });
    expect(weatherInfo(1234)).toEqual({ key: 'unknown', icon: 'not-available' });
  });

  it('has an icon file for every weather icon', () => {
    const files = new Set(Object.keys(import.meta.glob('../assets/wx/*.svg')).map((f) => f.slice(f.lastIndexOf('/') + 1, -4)));
    for (const name of WMO_ICONS) expect(files.has(name), name).toBe(true);
  });

  it('picks the sky theme', () => {
    expect(skyFor(0, true)).toBe('clear');
    expect(skyFor(3, true)).toBe('cloudy');
    expect(skyFor(63, true)).toBe('rain');
    expect(skyFor(73, true)).toBe('snow');
    expect(skyFor(63, false)).toBe('night');
  });
});

describe('forecast ranges', () => {
  const hours = Array.from({ length: 7 * 24 }, (_, i) => {
    const d = 12 + Math.floor(i / 24);
    return `2026-11-${String(d).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00`;
  });
  const f = {
    current: { time: '2026-11-12T14:15' },
    hourly: { time: hours },
    daily: { time: Array.from({ length: 7 }, (_, i) => `2026-11-${12 + i}`) },
  } as unknown as Forecast;

  it('starts today at the current hour and shows 48 hours', () => {
    expect(currentHourIndex(f)).toBe(14);
    expect(chartRange(f, 0)).toEqual([14, 62]);
  });

  it('shows a whole later day', () => {
    expect(chartRange(f, 2)).toEqual([48, 72]);
    expect(chartRange(f, 6)).toEqual([144, 168]);
  });

  it('uses the clock, not the data, to find now and today (old offline copy)', () => {
    const old = {
      ...f,
      utc_offset_seconds: 3600,
      current: { time: '2026-11-12T14:15', temperature_2m: 5 },
      hourly: { ...f.hourly, temperature_2m: hours.map((_, i) => i), weather_code: hours.map(() => 3), is_day: hours.map(() => 1),
        wind_speed_10m: hours.map(() => 1), wind_gusts_10m: hours.map(() => 2), wind_direction_10m: hours.map(() => 90), precipitation: hours.map(() => 0) },
    } as unknown as Forecast;
    // a day and a half later: 2026-11-14 00:30 UTC = 01:30 local time
    const later = Date.UTC(2026, 10, 14, 0, 30);
    expect(placeNow(old, later)).toBe('2026-11-14T01:30');
    const now = placeNow(old, later);
    expect(currentHourIndex(old, now)).toBe(49);
    expect(todayIndex(old, now)).toBe(2);
    expect(chartRange(old, 0, now)).toEqual([49, 97]);
    expect(chartRange(old, 3, now)).toEqual([72, 96]);
    expect(nowValues(old, now).temperature_2m).toBe(49);
    // fresh data: the current block is used as is
    expect(nowValues(old, placeNow(old, Date.UTC(2026, 10, 12, 13, 20))).temperature_2m).toBe(5);
  });

  it('makes stable place ids', () => {
    expect(placeId(59.32938, 18.06871)).toBe('59.329,18.069');
  });
});
