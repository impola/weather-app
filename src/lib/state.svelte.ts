// App state shared by the components, kept in localStorage between visits.
import { detectLang, translate, LOCALE, type Key, type Lang } from './i18n';
import { defaultUnits, type Units } from './units';
import type { Forecast, Place } from './api';

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or full: the app still works, it just forgets */
  }
}

export const settings = $state({
  lang: load<Lang | null>('lang', null) ?? detectLang(navigator.languages ?? [navigator.language]),
  units: load<Units>('units', defaultUnits(navigator.language)),
  /** places the user saved, in their order */
  places: load<Place[]>('places', []),
  /** where the user is (from the location service), if known */
  here: load<Place | null>('here', null),
  /** the place shown now: saved, here, or a search / map result not saved */
  active: load<Place | null>('active', null),
});

/** Start saving the settings whenever they change (call once, at start-up). */
export function persistSettings(): void {
  $effect.root(() => {
    $effect(() => save('lang', settings.lang));
    $effect(() => save('units', $state.snapshot(settings.units)));
    $effect(() => save('places', $state.snapshot(settings.places)));
    $effect(() => save('here', $state.snapshot(settings.here)));
    $effect(() => save('active', $state.snapshot(settings.active)));
    $effect(() => {
      document.documentElement.lang = settings.lang;
      document.title = translate(settings.lang, 'appName');
    });
  });
}

/** Translated text in the chosen language (reactive inside components). */
export function t(key: Key, params?: Record<string, string | number>): string {
  return translate(settings.lang, key, params);
}

export function locale(): string {
  return LOCALE[settings.lang];
}

export function isSaved(place: Place | null): boolean {
  return !!place && settings.places.some((p) => p.id === place.id);
}

export function toggleSaved(place: Place): void {
  if (isSaved(place)) settings.places = settings.places.filter((p) => p.id !== place.id);
  else settings.places = [...settings.places, { ...place }];
}

export function movePlace(id: string, delta: number): void {
  const list = [...settings.places];
  const i = list.findIndex((p) => p.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  settings.places = list;
}

/** The tabs: here first, then saved places, then the shown place if it is neither. */
export function tabs(): { place: Place; here: boolean }[] {
  const out: { place: Place; here: boolean }[] = [];
  if (settings.here) out.push({ place: settings.here, here: true });
  for (const p of settings.places) if (p.id !== settings.here?.id) out.push({ place: p, here: false });
  const a = settings.active;
  if (a && !out.some((x) => x.place.id === a.id)) out.push({ place: a, here: false });
  return out;
}

// ---------- forecast copies for offline use ----------

interface Cached {
  at: number; // when it was fetched (ms since epoch)
  data: Forecast;
}

const CACHE_PREFIX = 'fc:';

export function cachedForecast(id: string): Cached | null {
  return load<Cached | null>(CACHE_PREFIX + id, null);
}

export function cacheForecast(id: string, data: Forecast): void {
  save(CACHE_PREFIX + id, { at: Date.now(), data });
  // keep copies only for places that are still in use
  const keep = new Set([id, settings.here?.id, ...settings.places.map((p) => p.id)].filter(Boolean).map((x) => CACHE_PREFIX + x));
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX) && !keep.has(k)) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
