// Swedish and English texts, and date / time formatting.
//
// Open-Meteo returns times in the location's local time without an offset
// ("2026-11-12T14:00"). They are parsed as UTC and formatted with timeZone UTC, so the
// wall-clock time of the place is shown regardless of the computer's time zone.

export type Lang = 'sv' | 'en';

export const LOCALE: Record<Lang, string> = { sv: 'sv-SE', en: 'en-GB' };

const sv = {
  appName: 'Väder',
  search: 'Sök ort',
  searchLabel: 'Sök efter en ort',
  noMatches: 'Inga träffar',
  myLocation: 'Min plats',
  useLocation: 'Använd min plats',
  locating: 'Hittar din plats…',
  locationDenied: 'Platsen kunde inte hämtas. Visar {place}.',
  locationUnavailable: 'Platstjänster finns inte på den här enheten.',
  loading: 'Hämtar väder…',
  loadFailed: 'Kunde inte hämta vädret.',
  retry: 'Försök igen',
  offlineData: 'Visar sparad prognos från {time}.',
  updated: 'Uppdaterad {time}',
  save: 'Spara plats',
  saved: 'Sparad plats',
  unsave: 'Ta bort från sparade',
  settings: 'Inställningar',
  close: 'Stäng',
  language: 'Språk',
  units: 'Enheter',
  temperature: 'Temperatur',
  wind: 'Vind',
  precipitation: 'Nederbörd',
  savedPlaces: 'Sparade platser',
  noSavedPlaces: 'Inga sparade platser än. Tryck på stjärnan vid en ort för att spara den.',
  moveUp: 'Flytta upp',
  moveDown: 'Flytta ned',
  remove: 'Ta bort',
  feelsLike: 'Känns som',
  rightNow: 'Just nu',
  windGusts: 'Vind (byar)',
  precipLastHour: 'Nederbörd senaste timmen',
  humidity: 'Luftfuktighet',
  gusts: 'Byar',
  pressure: 'Lufttryck',
  high: 'Max',
  low: 'Min',
  next48: 'Kommande 48 timmar',
  next24: 'Kommande 24 timmar',
  hoursOf: 'Timme för timme, {day}',
  forecast7: '7 dagar',
  today: 'Idag',
  tomorrow: 'Imorgon',
  now: 'Nu',
  sunrise: 'Soluppgång',
  sunset: 'Solnedgång',
  daylight: 'Dagsljus',
  uvIndex: 'UV-index',
  precipSum: 'Nederbörd totalt',
  precipChance: 'Risk för nederbörd',
  maxWind: 'Max vind',
  map: 'Karta',
  mapHint: 'Tryck på kartan för att se vädret där.',
  radar: 'Regnradar',
  play: 'Spela',
  pause: 'Pausa',
  radarTime: 'Radarbild {time}',
  radarFailed: 'Radarn kunde inte hämtas.',
  chartLabel: 'Temperatur och nederbörd per timme. Använd piltangenterna för att stega.',
  chartValue: '{time}: {temp}, {desc}, nederbörd {precip}, risk {pop}, vind {wind}',
  dayButton: '{day}: {desc}, {low} till {high}',
  data: 'Data',
  hours: '{n} h {m} min',
  // summary of the coming hours
  sumDry: 'Inget regn de närmaste {h} timmarna.',
  sumWetAll: '{kind} de närmaste {h} timmarna.',
  sumWetUntil: '{kind} fram till ca {end}.',
  sumWetFrom: '{kind} från ca {start}.',
  sumWetFromTo: '{kind} från ca {start} till {end}.',
  sumUpTo: ', upp till {amount} per timme',
  sumGusts: 'Byar upp till {wind} kring {time}.',
  sumFrost: 'Minusgrader från ca {time}, risk för halka.',
  sumWarmer: 'Upp mot {temp} kring {time}.',
  sumColder: 'Ner mot {temp} kring {time}.',
  kind_rain: 'Regn',
  kind_snow: 'Snö',
  kind_sleet: 'Underkylt regn',
  restOfDay: 'Resten av dagen',
  precipRest: 'Nederbörd resten av dagen',
  soFar: 'hittills {amount}',
  showDay: 'Visa timmar för {day}',
  // weather codes
  clear: 'Klart',
  mostlyClear: 'Mest klart',
  partlyCloudy: 'Växlande molnighet',
  overcast: 'Mulet',
  fog: 'Dimma',
  freezingFog: 'Underkyld dimma',
  lightDrizzle: 'Lätt duggregn',
  drizzle: 'Duggregn',
  heavyDrizzle: 'Kraftigt duggregn',
  freezingDrizzle: 'Underkylt duggregn',
  lightRain: 'Lätt regn',
  rain: 'Regn',
  heavyRain: 'Kraftigt regn',
  freezingRain: 'Underkylt regn',
  lightSnow: 'Lätt snöfall',
  snow: 'Snöfall',
  heavySnow: 'Kraftigt snöfall',
  snowGrains: 'Kornsnö',
  lightShowers: 'Lätta skurar',
  showers: 'Skurar',
  violentShowers: 'Kraftiga skurar',
  snowShowers: 'Snöbyar',
  heavySnowShowers: 'Kraftiga snöbyar',
  thunderstorm: 'Åska',
  thunderstormHail: 'Åska med hagel',
  unknown: 'Okänt',
  compass: 'N,NO,O,SO,S,SV,V,NV',
};

export type Key = keyof typeof sv;

const en: Record<Key, string> = {
  appName: 'Weather',
  search: 'Search place',
  searchLabel: 'Search for a place',
  noMatches: 'No matches',
  myLocation: 'My location',
  useLocation: 'Use my location',
  locating: 'Finding your location…',
  locationDenied: 'Could not get your location. Showing {place}.',
  locationUnavailable: 'Location is not available on this device.',
  loading: 'Loading weather…',
  loadFailed: 'Could not load the weather.',
  retry: 'Try again',
  offlineData: 'Showing a saved forecast from {time}.',
  updated: 'Updated {time}',
  save: 'Save place',
  saved: 'Saved place',
  unsave: 'Remove from saved',
  settings: 'Settings',
  close: 'Close',
  language: 'Language',
  units: 'Units',
  temperature: 'Temperature',
  wind: 'Wind',
  precipitation: 'Precipitation',
  savedPlaces: 'Saved places',
  noSavedPlaces: 'No saved places yet. Tap the star next to a place to save it.',
  moveUp: 'Move up',
  moveDown: 'Move down',
  remove: 'Remove',
  feelsLike: 'Feels like',
  rightNow: 'Right now',
  windGusts: 'Wind (gusts)',
  precipLastHour: 'Precipitation, last hour',
  humidity: 'Humidity',
  gusts: 'Gusts',
  pressure: 'Pressure',
  high: 'High',
  low: 'Low',
  next48: 'Next 48 hours',
  next24: 'Next 24 hours',
  hoursOf: 'Hour by hour, {day}',
  forecast7: '7 days',
  today: 'Today',
  tomorrow: 'Tomorrow',
  now: 'Now',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  daylight: 'Daylight',
  uvIndex: 'UV index',
  precipSum: 'Total precipitation',
  precipChance: 'Chance of precipitation',
  maxWind: 'Max wind',
  map: 'Map',
  mapHint: 'Tap the map to see the weather there.',
  radar: 'Rain radar',
  play: 'Play',
  pause: 'Pause',
  radarTime: 'Radar image {time}',
  radarFailed: 'Could not load the radar.',
  chartLabel: 'Temperature and precipitation by hour. Use the arrow keys to step.',
  chartValue: '{time}: {temp}, {desc}, precipitation {precip}, chance {pop}, wind {wind}',
  dayButton: '{day}: {desc}, {low} to {high}',
  data: 'Data',
  hours: '{n} h {m} min',
  sumDry: 'No rain in the next {h} hours.',
  sumWetAll: '{kind} for the next {h} hours.',
  sumWetUntil: '{kind} until about {end}.',
  sumWetFrom: '{kind} from about {start}.',
  sumWetFromTo: '{kind} from about {start} to {end}.',
  sumUpTo: ', up to {amount} an hour',
  sumGusts: 'Gusts up to {wind} around {time}.',
  sumFrost: 'Below freezing from about {time}; roads may be icy.',
  sumWarmer: 'Up to {temp} around {time}.',
  sumColder: 'Down to {temp} around {time}.',
  kind_rain: 'Rain',
  kind_snow: 'Snow',
  kind_sleet: 'Freezing rain',
  restOfDay: 'Rest of the day',
  precipRest: 'Precipitation, rest of the day',
  soFar: '{amount} so far',
  showDay: 'Show hours for {day}',
  clear: 'Clear',
  mostlyClear: 'Mostly clear',
  partlyCloudy: 'Partly cloudy',
  overcast: 'Overcast',
  fog: 'Fog',
  freezingFog: 'Freezing fog',
  lightDrizzle: 'Light drizzle',
  drizzle: 'Drizzle',
  heavyDrizzle: 'Heavy drizzle',
  freezingDrizzle: 'Freezing drizzle',
  lightRain: 'Light rain',
  rain: 'Rain',
  heavyRain: 'Heavy rain',
  freezingRain: 'Freezing rain',
  lightSnow: 'Light snow',
  snow: 'Snow',
  heavySnow: 'Heavy snow',
  snowGrains: 'Snow grains',
  lightShowers: 'Light showers',
  showers: 'Showers',
  violentShowers: 'Violent showers',
  snowShowers: 'Snow showers',
  heavySnowShowers: 'Heavy snow showers',
  thunderstorm: 'Thunderstorm',
  thunderstormHail: 'Thunderstorm with hail',
  unknown: 'Unknown',
  compass: 'N,NE,E,SE,S,SW,W,NW',
};

export const DICTS: Record<Lang, Record<Key, string>> = { sv, en };

export function detectLang(languages: readonly string[]): Lang {
  for (const l of languages) {
    if (/^(sv|nb|nn|no|da)\b/i.test(l)) return 'sv';
    if (/^en\b/i.test(l)) return 'en';
  }
  return 'en';
}

export function translate(lang: Lang, key: Key | string, params?: Record<string, string | number>): string {
  const text = DICTS[lang][key as Key] ?? DICTS.en[key as Key] ?? String(key);
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m));
}

/** "2026-11-12T14:00" or "2026-11-12" (local time of the place) -> Date in UTC with the same wall clock. */
export function parseLocal(iso: string): Date {
  const [d, t = '00:00'] = iso.split('T');
  const [y, mo, day] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, day, h, mi));
}

function fmt(lang: Lang, iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: 'UTC', ...opts }).format(parseLocal(iso));
}

/** 24 h in Swedish ("14:05"), 12 h in English ("2:05 pm"). */
export function fmtTime(lang: Lang, iso: string): string {
  return fmt(lang, iso, { hour: lang === 'sv' ? '2-digit' : 'numeric', minute: '2-digit', hour12: lang === 'en' });
}

/** Hour label for the chart: "14" in Swedish, "2 pm" in English. */
export function fmtHour(lang: Lang, iso: string): string {
  if (lang === 'sv') return iso.slice(11, 13);
  return fmt(lang, iso, { hour: 'numeric', hour12: true });
}

/** "Today", "Tomorrow", else a short weekday ("tors" / "Thu"). */
export function fmtDayShort(lang: Lang, isoDate: string, index: number): string {
  if (index === 0) return translate(lang, 'today');
  if (index === 1) return translate(lang, 'tomorrow');
  const s = fmt(lang, isoDate, { weekday: 'short' }).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "torsdag 12 november" / "Thursday 12 November". */
export function fmtDayLong(lang: Lang, isoDate: string): string {
  const s = fmt(lang, isoDate, { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Time of a real instant (e.g. when data was fetched) in the computer's own time zone. */
export function fmtClock(lang: Lang, date: Date): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { hour: lang === 'sv' ? '2-digit' : 'numeric', minute: '2-digit', hour12: lang === 'en' }).format(date);
}

/** When something happened: "12:35" today, otherwise with the weekday ("ons 12:35" / "Wed 12:35"). */
export function fmtStamp(lang: Lang, date: Date, now = new Date()): string {
  const time = fmtClock(lang, date);
  if (date.toDateString() === now.toDateString()) return time;
  const wd = new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'short' }).format(date).replace('.', '');
  return `${wd} ${time}`;
}

export function compassLabel(lang: Lang, index: number): string {
  return translate(lang, 'compass').split(',')[index] ?? '';
}

/** Percentage: "61 %" in Swedish (with a no-break space), "61%" in English; "–" if unknown. */
export function fmtPct(lang: Lang, v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '–';
  return lang === 'sv' ? `${Math.round(v)}\u00a0%` : `${Math.round(v)}%`;
}
