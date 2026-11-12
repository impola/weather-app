import { describe, expect, it } from 'vitest';
import { DICTS, detectLang, fmtDayLong, fmtDayShort, fmtHour, fmtTime, parseLocal, translate, compassLabel } from './i18n';
import { convertPrecip, convertTemp, convertWind, defaultUnits, fmtPrecip, fmtTemp, fmtWind } from './units';
import { WMO_KEYS, compassIndex, weatherInfo } from './weather';
import { chartRange, currentHourIndex, placeId, type Forecast } from './api';

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
    expect(weatherInfo(0, true)).toEqual({ key: 'clear', icon: '☀️' });
    expect(weatherInfo(0, false)).toEqual({ key: 'clear', icon: '🌙' });
    expect(weatherInfo(1234).key).toBe('unknown');
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

  it('makes stable place ids', () => {
    expect(placeId(59.32938, 18.06871)).toBe('59.329,18.069');
  });
});
