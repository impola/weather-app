<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { registerSW } from 'virtual:pwa-register';
  import { fetchAir, fetchForecast, nowValues, placeId, placeName, todayIndex, type Air, type Forecast, type Place } from './lib/api';
  import { fmtStamp } from './lib/i18n';
  import { cacheForecast, cachedForecast, settings, t, tabs, ui } from './lib/state.svelte';
  import { nowcast } from './lib/summary';
  import { fetchWarnings, inSweden, warningsAt, type ApiWarning } from './lib/warnings';
  import { SKY_TOP, skyFor } from './lib/weather';
  import PlaceBar from './components/PlaceBar.svelte';
  import PlaceTabs from './components/PlaceTabs.svelte';
  import Current from './components/Current.svelte';
  import DayList from './components/DayList.svelte';
  import HourChart from './components/HourChart.svelte';
  import DayDetail from './components/DayDetail.svelte';
  import MapView from './components/MapView.svelte';
  import Settings from './components/Settings.svelte';
  import Details from './components/Details.svelte';
  import Nowcast from './components/Nowcast.svelte';
  import Alerts from './components/Alerts.svelte';
  import WxIcon from './components/WxIcon.svelte';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw';
  import LocateIcon from '@lucide/svelte/icons/locate-fixed';
  import SearchIcon from '@lucide/svelte/icons/search';

  const STOCKHOLM: Place = { id: placeId(59.3293, 18.0686), name: 'Stockholm', detail: 'Sverige', cc: 'SE', lat: 59.3293, lon: 18.0686 };
  const FRESH_MS = 10 * 60 * 1000;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let forecast = $state<Forecast | null>(null);
  let fetchedAt = $state(0);
  /** the forecast shown is an old copy because the network failed */
  let offline = $state(false);
  let loading = $state(false);
  let failed = $state(false);
  let online = $state(navigator.onLine);
  let message = $state('');
  /** first visit, nothing known yet: say hello instead of asking for the location at once */
  let welcome = $state(false);
  /** chosen day (index in the daily data); -1 or anything before today means today */
  let day = $state(-1);
  let settingsOpen = $state(false);
  /** direction of the last change of place (for the slide), -1, 0 or 1 */
  let dir = $state(0);
  let needRefresh = $state(false);
  let updateSW: ((reload?: boolean) => Promise<void>) | null = null;
  let controller: AbortController | null = null;

  async function load(place: Place, force = false) {
    // stop a fetch for the previous place first, so it can never overwrite this one
    controller?.abort();
    controller = null;
    loading = false;
    failed = false;
    const copy = cachedForecast(place.id);
    forecast = copy?.data ?? null;
    fetchedAt = copy?.at ?? 0;
    offline = false;
    if (copy && !force && Date.now() - copy.at < FRESH_MS) return;

    const c = new AbortController();
    controller = c;
    loading = true;
    try {
      const data = await fetchForecast(place, c.signal);
      if (c.signal.aborted || settings.active?.id !== place.id) return;
      forecast = data;
      fetchedAt = Date.now();
      cacheForecast(place.id, data);
    } catch (err) {
      if (c.signal.aborted || settings.active?.id !== place.id) return;
      console.warn(err);
      offline = !!copy;
      failed = !copy;
    } finally {
      if (controller === c) {
        loading = false;
        controller = null;
      }
    }
  }

  function refresh() {
    if (settings.active) void load(settings.active, true);
  }

  // load when the shown place changes
  let lastId = '';
  $effect(() => {
    const place = settings.active;
    if (!place || place.id === lastId) return;
    lastId = place.id;
    day = -1; // today, whatever index that is in the data
    load(place);
  });

  // SMHI warnings for places in Sweden (fetched with the forecast, kept 15 min)
  let warningData = $state<ApiWarning[] | null>(null);
  $effect(() => {
    const p = settings.active;
    void fetchedAt; // again when the forecast is refreshed
    if (!p || !inSweden(p.lat, p.lon)) return;
    fetchWarnings().then((d) => (warningData = d)).catch((err) => console.warn('warnings', err));
  });
  const warnings = $derived(settings.active && warningData && inSweden(settings.active.lat, settings.active.lon)
    ? warningsAt(warningData, settings.active.lat, settings.active.lon, settings.lang) : []);
  const nc = $derived(forecast ? nowcast(forecast) : null);

  // air quality and pollen (Open-Meteo), kept 30 minutes per place
  const airCache = new Map<string, { at: number; data: Air }>();
  let air = $state<Air | null>(null);
  $effect(() => {
    const p = settings.active;
    void fetchedAt;
    if (!p) return;
    const hit = airCache.get(p.id);
    if (hit && Date.now() - hit.at < 30 * 60 * 1000) {
      air = hit.data;
      return;
    }
    air = null;
    fetchAir(p.lat, p.lon)
      .then((data) => {
        airCache.set(p.id, { at: Date.now(), data });
        if (settings.active?.id === p.id) air = data;
      })
      .catch((err) => console.warn('air', err));
  });

  // the first day that is not in the past (an old offline copy can start yesterday)
  const today = $derived(forecast ? todayIndex(forecast) : 0);
  const selDay = $derived(Math.max(day, today));

  // phones open a day inside the day list; wide screens show it in the chart and detail cards
  const wide = matchMedia('(min-width: 900px)');
  let narrow = $state(!wide.matches);

  function show(place: Place) {
    const list = tabs();
    const from = list.findIndex((x) => x.place.id === settings.active?.id);
    const to = list.findIndex((x) => x.place.id === place.id);
    dir = from >= 0 && to >= 0 ? Math.sign(to - from) : 0;
    settings.active = place;
    message = '';
    welcome = false;
  }

  async function geoPermission(): Promise<string> {
    try {
      return (await navigator.permissions.query({ name: 'geolocation' as PermissionName })).state;
    } catch {
      return 'unknown';
    }
  }

  function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    const r = Math.PI / 180;
    const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
    const y = (b.lat - a.lat) * r;
    return Math.hypot(x, y) * 6371;
  }

  async function setHere(lat: number, lon: number): Promise<Place> {
    const named = await placeName(lat, lon, settings.lang);
    const here: Place = { id: placeId(lat, lon), name: named?.name ?? t('myLocation'), detail: named?.detail, lat, lon };
    settings.here = here;
    return here;
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      message = t('locationUnavailable');
      if (!settings.active) show(STOCKHOLM);
      return;
    }
    message = t('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => show(await setHere(pos.coords.latitude, pos.coords.longitude)),
      (err) => {
        console.warn(err);
        const fallback = settings.active ?? STOCKHOLM;
        show(fallback);
        message = t('locationDenied', { place: fallback.name });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  /** "My location" follows the user: check quietly at start (only if already allowed). */
  async function refreshHere() {
    if (!settings.here || (await geoPermission()) !== 'granted') return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const old = settings.here;
        if (!old || distanceKm(old, { lat: pos.coords.latitude, lon: pos.coords.longitude }) < 2) return;
        const wasShown = settings.active?.id === old.id;
        const here = await setHere(pos.coords.latitude, pos.coords.longitude);
        if (wasShown) show(here);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  }

  function pickOnMap(p: { lat: number; lon: number; name: string; detail?: string }) {
    show({ id: placeId(p.lat, p.lon), name: p.name, detail: p.detail, lat: p.lat, lon: p.lon });
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  function focusSearch() {
    welcome = false;
    document.querySelector<HTMLInputElement>('.placebar input')?.focus();
  }

  onMount(() => {
    // start where the user is, else where they were, else the first saved place
    const start = settings.here ?? settings.active ?? settings.places[0];
    if (start) {
      show(start);
      void refreshHere();
    } else {
      void geoPermission().then((state) => (state === 'granted' ? locate() : (welcome = true)));
    }

    const onWide = () => (narrow = !wide.matches);
    wide.addEventListener('change', onWide);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && settings.active && Date.now() - fetchedAt > FRESH_MS) refresh();
      // a new version is waiting: take it while the app is in the background
      if (document.visibilityState === 'hidden' && needRefresh) void updateSW?.(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    // an open window keeps itself up to date
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && settings.active && Date.now() - fetchedAt > FRESH_MS && !loading) refresh();
    }, 60 * 1000);
    const onOnline = () => {
      online = true;
      if (failed || offline) refresh();
    };
    const onOffline = () => (online = false);
    addEventListener('online', onOnline);
    addEventListener('offline', onOffline);

    // pull down at the top of the page to refresh (iOS home-screen apps have no reload)
    let pullStart: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const target = e.target as Element;
      pullStart = scrollY <= 0 && e.touches.length === 1 && !target.closest('.no-swipe, dialog, .results') ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pullStart == null) return;
      const dy = e.touches[0].clientY - pullStart;
      pull = dy > 0 && scrollY <= 0 ? Math.min(dy * 0.5, 80) : 0;
    };
    const onTouchEnd = () => {
      if (pull >= 60) refresh();
      pull = 0;
      pullStart = null;
    };
    addEventListener('touchstart', onTouchStart, { passive: true });
    addEventListener('touchmove', onTouchMove, { passive: true });
    addEventListener('touchend', onTouchEnd, { passive: true });

    // new versions: ask instead of switching under the user's feet
    updateSW = registerSW({
      onNeedRefresh: () => (needRefresh = true),
      onRegisteredSW: (_url, reg) => {
        if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000);
      },
    });

    addEventListener('keydown', onKey);
    return () => {
      wide.removeEventListener('change', onWide);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(tick);
      removeEventListener('online', onOnline);
      removeEventListener('offline', onOffline);
      removeEventListener('touchstart', onTouchStart);
      removeEventListener('touchmove', onTouchMove);
      removeEventListener('touchend', onTouchEnd);
      removeEventListener('keydown', onKey);
    };
  });

  let pull = $state(0);

  // keyboard: / search, 1–9 places, ← → days (wide screens)
  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (target.closest('input, textarea, select, [role=slider], dialog, .days')) return;
    if (e.key === '/') {
      e.preventDefault();
      focusSearch();
    } else if (/^[1-9]$/.test(e.key)) {
      const tab = tabs()[Number(e.key) - 1];
      if (tab) show(tab.place);
    } else if (!narrow && forecast && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      day = Math.max(today, Math.min(forecast.daily.time.length - 1, selDay + (e.key === 'ArrowRight' ? 1 : -1)));
    }
  }

  // colours follow the weather and the time of day at the place shown
  $effect(() => {
    const nv = forecast ? nowValues(forecast) : null;
    const sky = nv ? skyFor(nv.weather_code, nv.is_day === 1) : 'clear';
    const body = document.body;
    for (const c of ['sky-clear', 'sky-cloudy', 'sky-rain', 'sky-snow', 'night']) body.classList.remove(c);
    body.classList.add(sky === 'night' ? 'night' : `sky-${sky}`);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', SKY_TOP[sky]);
  });

  // swipe left / right between places (not on the chart or the map)
  let swipe: { x: number; y: number } | null = null;
  function swipeStart(e: PointerEvent) {
    if (e.pointerType !== 'touch' || (e.target as Element).closest('.no-swipe')) return;
    swipe = { x: e.clientX, y: e.clientY };
  }
  function swipeEnd(e: PointerEvent) {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 50) return;
    const list = tabs();
    const i = list.findIndex((x) => x.place.id === settings.active?.id);
    const next = list[i + (dx < 0 ? 1 : -1)];
    if (next) show(next.place);
  }
</script>

{#if pull > 0}
  <div class="pull" style="transform: translate(-50%, {pull - 40}px); opacity: {Math.min(1, pull / 60)}" aria-hidden="true">
    <span style="transform: rotate({pull * 4}deg)"><RefreshIcon size={18} /></span>
    {#if pull >= 60}<small>{t('pullRefresh')}</small>{/if}
  </div>
{/if}

<div class="app">
  <header class="top">
    <div class="placebar"><PlaceBar onshow={show} onlocate={locate} /></div>
    <button class="icon-btn gear" aria-label={t('settings')} title={t('settings')} onclick={() => (settingsOpen = true)}><SettingsIcon size={20} /></button>
    <div class="tabs-wrap"><PlaceTabs onshow={show} /></div>
  </header>

  {#if needRefresh}
    <p class="status update" role="status">
      {t('newVersion')}
      <button class="link" onclick={() => updateSW?.(true)}>{t('update')}</button>
    </p>
  {/if}
  {#if message}
    <p class="status" role="status">{message}</p>
  {/if}
  {#if offline}
    <p class="status warn" role="status">
      {t('offlineData', { time: fmtStamp(settings.lang, new Date(fetchedAt)) })}
      {#if online}<button class="link" onclick={refresh}>{t('retry')}</button>{/if}
    </p>
  {/if}

  {#if forecast && settings.active}
    <main class="grid" onpointerdown={swipeStart} onpointerup={swipeEnd} onpointercancel={() => (swipe = null)}>
      <section class="current">
        {#key settings.active.id}
          <div in:fly={{ x: dir * 40, duration: dir && !reduceMotion ? 220 : 0 }}>
            <Current {forecast} place={settings.active} {fetchedAt} {loading} onrefresh={refresh} onshow={show} />
          </div>
        {/key}
      </section>
      {#if warnings.length || nc}
        <section class="notices">
          <Alerts {warnings} />
          {#if nc}<div class="card"><Nowcast {nc} /></div>{/if}
        </section>
      {/if}
      <section class="card now"><Details {forecast} {air} /></section>
      <section class="card chart no-swipe"><HourChart {forecast} day={narrow ? today : selDay} {today} /></section>
      <section class="card days"><DayList {forecast} day={selDay} {today} inline={narrow} onselect={(d) => (day = d)} /></section>
      {#if !narrow}<section class="card dayinfo"><DayDetail {forecast} day={selDay} {today} /></section>{/if}
      <section class="card map no-swipe"><MapView place={settings.active} night={nowValues(forecast).is_day === 0} onpick={pickOnMap} /></section>
    </main>
    <p class="credit">
      {t('data')}: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>,
      <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a>,
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>,
      <a href="https://www.smhi.se/" target="_blank" rel="noopener">SMHI</a>
    </p>
    {#if !narrow}<p class="credit keys">{t('shortcuts')}</p>{/if}
  {:else if failed}
    <div class="empty">
      <p>{online ? t('loadFailed') : t('offline')}</p>
      {#if online}<button class="btn" onclick={refresh}>{t('retry')}</button>{/if}
    </div>
  {:else if welcome}
    <div class="welcome card">
      <WxIcon name="partly-cloudy-day" size={96} />
      <h1>{t('welcomeTitle')}</h1>
      <p>{t('welcomeText')}</p>
      <div class="actions">
        <button class="btn primary" onclick={locate}><LocateIcon size={18} /> {t('welcomeLocate')}</button>
        <button class="btn" onclick={focusSearch}><SearchIcon size={18} /> {t('welcomeSearch')}</button>
      </div>
      <p class="hint">{t('welcomeHint')}</p>
    </div>
  {:else}
    <div class="empty" aria-busy="true"><div class="spinner"></div><p>{t('loading')}</p></div>
  {/if}
</div>

{#if ui.toast}
  <div class="toast" role="status" transition:fade={{ duration: 150 }}>{ui.toast}</div>
{/if}

<Settings bind:open={settingsOpen} onshow={show} />

<style>
  .pull {
    position: fixed;
    top: calc(env(safe-area-inset-top) + 8px);
    left: 50%;
    z-index: 2000;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    background: var(--popup);
    border: 1px solid var(--card-border);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }
  .pull span { display: grid; }
  .pull small { font-size: 13px; }
  .update { background: rgba(96, 165, 250, 0.22); color: var(--fg); }
  .keys { margin-top: 4px; }
  .welcome {
    margin: 40px auto 0;
    max-width: 440px;
    display: grid;
    justify-items: center;
    text-align: center;
    padding: 28px 22px;
  }
  .welcome h1 { margin: 8px 0 4px; font-size: 24px; }
  .welcome p { margin: 0; color: var(--muted); }
  .actions { display: grid; gap: 10px; width: 100%; margin: 20px 0 16px; }
  .actions .btn { display: flex; justify-content: center; align-items: center; gap: 8px; padding: 12px; font-weight: 600; }
  .actions .primary { background: var(--fg); color: #0f172a; }
  .welcome .hint { font-size: 13px; }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom) + 20px);
    transform: translateX(-50%);
    z-index: 2000;
    padding: 10px 16px;
    border-radius: 999px;
    background: var(--fg);
    color: #0f172a;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    white-space: nowrap;
  }
</style>
