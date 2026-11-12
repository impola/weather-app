// Weather warnings from SMHI (Sweden only): the areas are polygons, so a place gets the
// warnings whose polygon contains it. https://opendata.smhi.se (CORS allowed, no key).
import type { Lang } from './i18n';

const URL = 'https://opendata-download-warnings.smhi.se/ibww/api/version/1/warning.json';
const CACHE_MS = 15 * 60 * 1000;

type Text = { sv?: string; en?: string };
type Ring = [number, number][]; // [lon, lat]

interface ApiArea {
  id: number;
  areaName: Text;
  affectedAreas?: (Text & { id: number })[];
  warningLevel: Text & { code: string };
  eventDescription: Text & { code: string };
  approximateStart?: string;
  approximateEnd?: string;
  descriptions?: { title: Text; text: Text }[];
  area: { geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] } };
}

interface ApiWarning {
  id: number;
  event: Text & { code: string };
  warningAreas: ApiArea[];
}

export type Level = 'RED' | 'ORANGE' | 'YELLOW' | 'MESSAGE';
const ORDER: Level[] = ['RED', 'ORANGE', 'YELLOW', 'MESSAGE'];

export interface Warning {
  id: number;
  level: Level;
  title: string; // "Snö" / "Snow"
  levelName: string; // "Gul varning" etc. comes from i18n; this is SMHI's own word
  area: string;
  start?: Date;
  end?: Date;
  details: { title: string; text: string }[];
}

/** Rough box around Sweden and its waters: no need to fetch SMHI for other places. */
export function inSweden(lat: number, lon: number): boolean {
  return lat > 54.8 && lat < 69.2 && lon > 10.0 && lon < 24.5;
}

function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point in a polygon with holes: inside the outer ring and outside every hole. */
function inPolygon(lon: number, lat: number, rings: Ring[]): boolean {
  if (!rings.length || !inRing(lon, lat, rings[0])) return false;
  return !rings.slice(1).some((hole) => inRing(lon, lat, hole));
}

export function containsPoint(geometry: ApiArea['area']['geometry'], lat: number, lon: number): boolean {
  if (geometry.type === 'Polygon') return inPolygon(lon, lat, geometry.coordinates);
  return geometry.coordinates.some((poly) => inPolygon(lon, lat, poly));
}

const pick = (t: Text | undefined, lang: Lang) => (t ? t[lang] ?? t.sv ?? t.en ?? '' : '');

/** The warnings for a point, most severe first; expired ones are left out. */
export function warningsAt(data: ApiWarning[], lat: number, lon: number, lang: Lang, now = Date.now()): Warning[] {
  const out: Warning[] = [];
  for (const w of data) {
    for (const a of w.warningAreas) {
      const level = a.warningLevel.code as Level;
      if (!ORDER.includes(level)) continue;
      const end = a.approximateEnd ? new Date(a.approximateEnd) : undefined;
      if (end && end.getTime() < now) continue;
      if (!containsPoint(a.area.geometry, lat, lon)) continue;
      out.push({
        id: a.id,
        level,
        title: pick(w.event, lang),
        levelName: pick(a.warningLevel, lang),
        area: lang === 'en' ? pick(a.affectedAreas?.[0], 'en') || pick(a.areaName, 'sv') : pick(a.areaName, 'sv'),
        start: a.approximateStart ? new Date(a.approximateStart) : undefined,
        end,
        details: (a.descriptions ?? []).map((d) => ({ title: pick(d.title, lang), text: pick(d.text, lang) })).filter((d) => d.text),
      });
    }
  }
  return out.sort((x, y) => ORDER.indexOf(x.level) - ORDER.indexOf(y.level));
}

let cache: { at: number; data: ApiWarning[] } | null = null;

export async function fetchWarnings(signal?: AbortSignal): Promise<ApiWarning[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const res = await fetch(URL, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as ApiWarning[];
  cache = { at: Date.now(), data };
  return data;
}

export type { ApiWarning };
