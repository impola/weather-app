// Data sources: Open-Meteo (forecast, place search), BigDataCloud (name of a
// coordinate), RainViewer (radar). All free, no API key, CORS-enabled.
import type { Lang } from './i18n';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
const RADAR_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export interface Place {
  id: string;
  name: string;
  /** region / country, shown in smaller text */
  detail?: string;
  lat: number;
  lon: number;
}

export function placeId(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export interface Forecast {
  timezone: string;
  /** offset of the place's local time from UTC; always sent by Open-Meteo */
  utc_offset_seconds?: number;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    wind_direction_10m: number;
    is_day: number;
    precipitation: number;
    pressure_msl: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    pressure_msl: number[];
    weather_code: number[];
    precipitation: number[];
    precipitation_probability: (number | null)[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    wind_direction_10m: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: (number | null)[];
  };
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function forecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day,precipitation,pressure_msl',
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,pressure_msl,weather_code,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,wind_direction_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max',
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: '7',
  });
  return `${FORECAST_URL}?${params}`;
}

export function fetchForecast(place: Place, signal?: AbortSignal): Promise<Forecast> {
  return getJSON<Forecast>(forecastUrl(place.lat, place.lon), signal);
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export async function searchPlaces(query: string, lang: Lang, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ name: query.trim(), count: '8', language: lang, format: 'json' });
  const data = await getJSON<{ results?: GeoResult[] }>(`${GEOCODE_URL}?${params}`, signal);
  return (data.results ?? []).map((r) => ({
    id: placeId(r.latitude, r.longitude),
    name: r.name,
    detail: [r.admin1, r.country].filter((x) => x && x !== r.name).join(', ') || undefined,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

/** A name for a coordinate (from the location or a click on the map); null if unknown. */
export async function placeName(lat: number, lon: number, lang: Lang): Promise<{ name: string; detail?: string } | null> {
  try {
    const params = new URLSearchParams({ latitude: String(lat), longitude: String(lon), localityLanguage: lang });
    const r = await getJSON<{ city?: string; locality?: string; principalSubdivision?: string; countryName?: string }>(
      `${REVERSE_URL}?${params}`);
    // BigDataCloud sometimes adds the ISO code: "Vastra Gotalands lan [SE-14]"
    const clean = (x?: string) => x?.replace(/\s*\[[A-Z]{2}-[\w-]+\]\s*$/, '').trim() || undefined;
    const region = clean(r.principalSubdivision);
    const name = clean(r.city) || clean(r.locality) || region;
    if (!name) return null;
    return { name, detail: [region, clean(r.countryName)].filter((x) => x && x !== name).join(', ') || undefined };
  } catch {
    return null;
  }
}

export interface RadarFrame {
  time: number; // unix seconds
  url: string; // tile template for Leaflet
}

export async function radarFrames(): Promise<RadarFrame[]> {
  const data = await getJSON<{ host: string; radar: { past: { time: number; path: string }[]; nowcast?: { time: number; path: string }[] } }>(RADAR_URL);
  const frames = [...data.radar.past, ...(data.radar.nowcast ?? [])];
  // 256 px tiles, colour scheme 2 (universal blue), smoothed, with snow shown
  return frames.map((f) => ({ time: f.time, url: `${data.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png` }));
}

/**
 * The place's local time now, as "YYYY-MM-DDTHH:MM". Computed from the clock (not from
 * the data), so an old offline copy still knows which hour is "now" and which day is today.
 */
export function placeNow(f: Forecast, nowMs = Date.now()): string {
  if (typeof f.utc_offset_seconds !== 'number') return f.current.time;
  return new Date(nowMs + f.utc_offset_seconds * 1000).toISOString().slice(0, 16);
}

/** Index of the first hourly entry at or after the current hour (all in the place's local time). */
export function currentHourIndex(f: Forecast, now = placeNow(f)): number {
  const hour = now.slice(0, 13);
  const i = f.hourly.time.findIndex((t) => t.slice(0, 13) >= hour);
  return i < 0 ? f.hourly.time.length - 1 : i;
}

/** Index of today in the daily data (days before it are past, e.g. in an old copy). */
export function todayIndex(f: Forecast, now = placeNow(f)): number {
  const date = now.slice(0, 10);
  const i = f.daily.time.findIndex((d) => d >= date);
  return i < 0 ? f.daily.time.length - 1 : i;
}

/** Hourly index range [start, end) shown in the chart for a day index. */
export function chartRange(f: Forecast, day: number, now = placeNow(f)): [number, number] {
  const n = f.hourly.time.length;
  if (day <= todayIndex(f, now)) {
    const start = currentHourIndex(f, now);
    return [start, Math.min(n, start + 48)];
  }
  const date = f.daily.time[day];
  const start = f.hourly.time.findIndex((t) => t.startsWith(date));
  if (start < 0) return [0, Math.min(n, 24)];
  return [start, Math.min(n, start + 24)];
}

export type NowValues = Forecast['current'];

/**
 * Conditions now: the "current" block while it is fresh (same hour), otherwise the
 * hourly forecast for this hour (an old offline copy would show stale "current" values).
 */
export function nowValues(f: Forecast, now = placeNow(f)): NowValues {
  if (f.current.time.slice(0, 13) === now.slice(0, 13)) return f.current;
  const h = f.hourly;
  const i = currentHourIndex(f, now);
  return {
    time: h.time[i],
    temperature_2m: h.temperature_2m[i],
    apparent_temperature: h.apparent_temperature?.[i] ?? h.temperature_2m[i],
    relative_humidity_2m: h.relative_humidity_2m?.[i] ?? f.current.relative_humidity_2m,
    weather_code: h.weather_code[i],
    wind_speed_10m: h.wind_speed_10m[i],
    wind_gusts_10m: h.wind_gusts_10m[i],
    wind_direction_10m: h.wind_direction_10m[i],
    is_day: h.is_day[i],
    precipitation: h.precipitation[i],
    pressure_msl: h.pressure_msl?.[i] ?? f.current.pressure_msl,
  };
}
