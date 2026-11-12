import { describe, expect, it } from 'vitest';
import { containsPoint, inSweden, warningsAt, type ApiWarning } from './warnings';

// a square around Göteborg with a hole in the middle, and a red warning somewhere else
const square = [[[11.5, 57.5], [12.5, 57.5], [12.5, 58.0], [11.5, 58.0], [11.5, 57.5]], [[11.9, 57.65], [12.0, 57.65], [12.0, 57.75], [11.9, 57.75], [11.9, 57.65]]] as [number, number][][];
const far = [[[20, 64], [21, 64], [21, 65], [20, 65], [20, 64]]] as [number, number][][];

const area = (id: number, code: string, coords: [number, number][][], end?: string) => ({
  id,
  areaName: { sv: 'Område ' + id },
  affectedAreas: [{ id, sv: 'Län ' + id, en: 'County ' + id }],
  warningLevel: { sv: code === 'YELLOW' ? 'Gul' : 'Röd', en: code === 'YELLOW' ? 'Yellow' : 'Red', code },
  eventDescription: { sv: 'x', en: 'x', code: 'X' },
  approximateStart: '2026-11-12T10:00:00Z',
  approximateEnd: end,
  descriptions: [{ title: { sv: 'Vad händer?', en: 'What happens?' }, text: { sv: 'Mycket snö.', en: 'Lots of snow.' } }],
  area: { geometry: { type: 'Polygon' as const, coordinates: coords } },
});

const data = [
  { id: 1, event: { sv: 'Snö', en: 'Snow', code: 'SNOW' }, warningAreas: [area(10, 'YELLOW', square, '2026-11-13T22:00:00Z'), area(11, 'RED', far, '2026-11-13T22:00:00Z')] },
  { id: 2, event: { sv: 'Vind', en: 'Wind', code: 'WIND' }, warningAreas: [area(20, 'RED', square, '2026-11-12T11:00:00Z')] },
] as unknown as ApiWarning[];

describe('SMHI warnings', () => {
  it('finds points in polygons, with holes', () => {
    const g = data[0].warningAreas[0].area.geometry;
    expect(containsPoint(g, 57.55, 11.6)).toBe(true);
    expect(containsPoint(g, 57.7, 11.95)).toBe(false); // in the hole
    expect(containsPoint(g, 59.3, 18.0)).toBe(false);
  });

  it('gives the warnings for a place, in its language, without expired ones', () => {
    const now = Date.parse('2026-11-12T12:00:00Z');
    const w = warningsAt(data, 57.55, 11.6, 'sv', now);
    expect(w.map((x) => [x.title, x.level, x.area])).toEqual([['Snö', 'YELLOW', 'Område 10']]);
    expect(w[0].details).toEqual([{ title: 'Vad händer?', text: 'Mycket snö.' }]);
    expect(warningsAt(data, 57.55, 11.6, 'en', now)[0]).toMatchObject({ title: 'Snow', area: 'County 10' });
    // before the wind warning ended, it comes first (red)
    expect(warningsAt(data, 57.55, 11.6, 'sv', Date.parse('2026-11-12T10:30:00Z')).map((x) => x.level)).toEqual(['RED', 'YELLOW']);
  });

  it('only asks SMHI about places in or near Sweden', () => {
    expect(inSweden(57.7, 11.97)).toBe(true);
    expect(inSweden(35.7, 139.7)).toBe(false);
  });
});
