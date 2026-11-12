// WMO weather codes (as used by Open-Meteo) -> text key in i18n + day / night icon
// (Meteocons file names in src/assets/wx/).

export interface WeatherInfo {
  key: string;
  icon: string;
}

const WMO: Record<number, [key: string, day: string, night: string]> = {
  0: ['clear', 'clear-day', 'clear-night'],
  1: ['mostlyClear', 'partly-cloudy-day', 'partly-cloudy-night'],
  2: ['partlyCloudy', 'overcast-day', 'overcast-night'],
  3: ['overcast', 'overcast', 'overcast'],
  45: ['fog', 'fog-day', 'fog-night'],
  48: ['freezingFog', 'fog', 'fog'],
  51: ['lightDrizzle', 'partly-cloudy-day-drizzle', 'partly-cloudy-night-drizzle'],
  53: ['drizzle', 'drizzle', 'drizzle'],
  55: ['heavyDrizzle', 'drizzle', 'drizzle'],
  56: ['freezingDrizzle', 'sleet', 'sleet'],
  57: ['freezingDrizzle', 'sleet', 'sleet'],
  61: ['lightRain', 'partly-cloudy-day-rain', 'partly-cloudy-night-rain'],
  63: ['rain', 'rain', 'rain'],
  65: ['heavyRain', 'rain', 'rain'],
  66: ['freezingRain', 'sleet', 'sleet'],
  67: ['freezingRain', 'sleet', 'sleet'],
  71: ['lightSnow', 'partly-cloudy-day-snow', 'partly-cloudy-night-snow'],
  73: ['snow', 'snow', 'snow'],
  75: ['heavySnow', 'snow', 'snow'],
  77: ['snowGrains', 'snow', 'snow'],
  80: ['lightShowers', 'partly-cloudy-day-rain', 'partly-cloudy-night-rain'],
  81: ['showers', 'rain', 'rain'],
  82: ['violentShowers', 'rain', 'rain'],
  85: ['snowShowers', 'partly-cloudy-day-snow', 'partly-cloudy-night-snow'],
  86: ['heavySnowShowers', 'snow', 'snow'],
  95: ['thunderstorm', 'thunderstorms-day', 'thunderstorms-night'],
  96: ['thunderstormHail', 'hail', 'hail'],
  99: ['thunderstormHail', 'hail', 'hail'],
};

export const WMO_KEYS = [...new Set(Object.values(WMO).map(([k]) => k)), 'unknown'];
export const WMO_ICONS = [...new Set(Object.values(WMO).flatMap(([, d, n]) => [d, n])), 'not-available'];

export function weatherInfo(code: number, isDay = true): WeatherInfo {
  const entry = WMO[code];
  if (!entry) return { key: 'unknown', icon: 'not-available' };
  return { key: entry[0], icon: isDay ? entry[1] : entry[2] };
}

export type Sky = 'clear' | 'cloudy' | 'rain' | 'snow' | 'night';

/** Background theme for the weather now. */
export function skyFor(code: number, isDay: boolean): Sky {
  if (!isDay) return 'night';
  if (code <= 1) return 'clear';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 51) return 'rain';
  return 'cloudy';
}

/** Top colour of each theme (for the browser / iOS status bar). */
export const SKY_TOP: Record<Sky, string> = {
  clear: '#1f6fd1',
  cloudy: '#4b6078',
  rain: '#3d5470',
  snow: '#6b7f96',
  night: '#1e293b',
};

/** Compass direction index 0..7 (N, NE, E, SE, S, SW, W, NW) for a direction in degrees. */
export function compassIndex(deg: number): number {
  return Math.round((((deg % 360) + 360) % 360) / 45) % 8;
}

// Temperature colours on an absolute scale (°C), the same in every view.
const TEMP_SCALE: [number, [number, number, number]][] = [
  [-20, [167, 139, 250]], // violet
  [-10, [96, 165, 250]], // blue
  [0, [103, 232, 249]], // cyan
  [10, [253, 224, 71]], // yellow
  [20, [251, 146, 60]], // orange
  [30, [239, 68, 68]], // red
];

/** CSS colour for a temperature in °C. */
export function tempColor(c: number): string {
  const s = TEMP_SCALE;
  if (c <= s[0][0]) return `rgb(${s[0][1].join(',')})`;
  for (let i = 1; i < s.length; i++) {
    const [t1, c1] = s[i];
    if (c <= t1) {
      const [t0, c0] = s[i - 1];
      const f = (c - t0) / (t1 - t0);
      return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * f)).join(',')})`;
    }
  }
  return `rgb(${s[s.length - 1][1].join(',')})`;
}

/** A left-to-right gradient for the range lo..hi °C (with the scale's colours in between). */
export function tempGradient(lo: number, hi: number): string {
  if (hi - lo < 0.01) return tempColor(lo);
  const stops = [lo, ...TEMP_SCALE.map(([t]) => t).filter((t) => t > lo && t < hi), hi];
  return `linear-gradient(90deg, ${stops.map((t) => `${tempColor(t)} ${(((t - lo) / (hi - lo)) * 100).toFixed(1)}%`).join(', ')})`;
}
