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
