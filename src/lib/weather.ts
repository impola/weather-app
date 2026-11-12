// WMO weather codes (as used by Open-Meteo) -> text key in i18n + day / night icon.

export interface WeatherInfo {
  key: string;
  icon: string;
}

const WMO: Record<number, [key: string, day: string, night: string]> = {
  0: ['clear', '☀️', '🌙'],
  1: ['mostlyClear', '🌤️', '🌙'],
  2: ['partlyCloudy', '⛅', '☁️'],
  3: ['overcast', '☁️', '☁️'],
  45: ['fog', '🌫️', '🌫️'],
  48: ['freezingFog', '🌫️', '🌫️'],
  51: ['lightDrizzle', '🌦️', '🌧️'],
  53: ['drizzle', '🌦️', '🌧️'],
  55: ['heavyDrizzle', '🌧️', '🌧️'],
  56: ['freezingDrizzle', '🌧️', '🌧️'],
  57: ['freezingDrizzle', '🌧️', '🌧️'],
  61: ['lightRain', '🌦️', '🌧️'],
  63: ['rain', '🌧️', '🌧️'],
  65: ['heavyRain', '🌧️', '🌧️'],
  66: ['freezingRain', '🌧️', '🌧️'],
  67: ['freezingRain', '🌧️', '🌧️'],
  71: ['lightSnow', '🌨️', '🌨️'],
  73: ['snow', '🌨️', '🌨️'],
  75: ['heavySnow', '❄️', '❄️'],
  77: ['snowGrains', '🌨️', '🌨️'],
  80: ['lightShowers', '🌦️', '🌧️'],
  81: ['showers', '🌧️', '🌧️'],
  82: ['violentShowers', '⛈️', '⛈️'],
  85: ['snowShowers', '🌨️', '🌨️'],
  86: ['heavySnowShowers', '❄️', '❄️'],
  95: ['thunderstorm', '⛈️', '⛈️'],
  96: ['thunderstormHail', '⛈️', '⛈️'],
  99: ['thunderstormHail', '⛈️', '⛈️'],
};

export const WMO_KEYS = [...new Set(Object.values(WMO).map(([k]) => k)), 'unknown'];

export function weatherInfo(code: number, isDay = true): WeatherInfo {
  const entry = WMO[code];
  if (!entry) return { key: 'unknown', icon: '🌡️' };
  return { key: entry[0], icon: isDay ? entry[1] : entry[2] };
}

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
