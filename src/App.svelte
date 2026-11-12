<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchForecast, nowValues, placeId, placeName, todayIndex, type Forecast, type Place } from './lib/api';
  import { fmtStamp } from './lib/i18n';
  import { cacheForecast, cachedForecast, settings, t, tabs } from './lib/state.svelte';
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
  import { nowcast } from './lib/summary';
  import { fetchWarnings, inSweden, warningsAt, type ApiWarning } from './lib/warnings';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import { SKY_TOP, skyFor } from './lib/weather';

  const STOCKHOLM: Place = { id: placeId(59.3293, 18.0686), name: 'Stockholm', detail: 'Sverige', lat: 59.3293, lon: 18.0686 };
  const FRESH_MS = 10 * 60 * 1000;

  let forecast = $state<Forecast | null>(null);
  let fetchedAt = $state(0);
  /** the forecast shown is an old copy because the network failed */
  let offline = $state(false);
  let loading = $state(false);
  let failed = $state(false);
  let message = $state('');
  /** chosen day (index in the daily data); -1 or anything before today means today */
  let day = $state(-1);
  let settingsOpen = $state(false);
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

  // the first day that is not in the past (an old offline copy can start yesterday)
  const today = $derived(forecast ? todayIndex(forecast) : 0);
  const selDay = $derived(Math.max(day, today));

  // phones open a day inside the day list; wide screens show it in the chart and detail cards
  const wide = matchMedia('(min-width: 900px)');
  let narrow = $state(!wide.matches);
  onMount(() => {
    const onChange = () => (narrow = !wide.matches);
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  });

  function show(place: Place) {
    settings.active = place;
    message = '';
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      message = t('locationUnavailable');
      if (!settings.active) show(STOCKHOLM);
      return;
    }
    message = t('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const named = await placeName(lat, lon, settings.lang);
        const here: Place = { id: placeId(lat, lon), name: named?.name ?? t('myLocation'), detail: named?.detail, lat, lon };
        settings.here = here;
        show(here);
      },
      (err) => {
        console.warn(err);
        const fallback = settings.active ?? STOCKHOLM;
        show(fallback);
        message = t('locationDenied', { place: fallback.name });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  function pickOnMap(p: { lat: number; lon: number; name: string; detail?: string }) {
    show({ id: placeId(p.lat, p.lon), name: p.name, detail: p.detail, lat: p.lat, lon: p.lon });
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    if (!settings.active) {
      if (settings.here) show(settings.here);
      else if (settings.places.length) show(settings.places[0]);
      else locate();
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && settings.active && Date.now() - fetchedAt > FRESH_MS) {
        load(settings.active, true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  });

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

<div class="app">
  <header class="top">
    <div class="placebar"><PlaceBar onshow={show} onlocate={locate} /></div>
    <button class="icon-btn gear" aria-label={t('settings')} title={t('settings')} onclick={() => (settingsOpen = true)}><SettingsIcon size={20} /></button>
    <div class="tabs-wrap"><PlaceTabs onshow={show} /></div>
  </header>

  {#if message}
    <p class="status" role="status">{message}</p>
  {/if}
  {#if offline}
    <p class="status warn" role="status">
      {t('offlineData', { time: fmtStamp(settings.lang, new Date(fetchedAt)) })}
      <button class="link" onclick={() => settings.active && load(settings.active, true)}>{t('retry')}</button>
    </p>
  {/if}

  {#if forecast && settings.active}
    <main class="grid" onpointerdown={swipeStart} onpointerup={swipeEnd} onpointercancel={() => (swipe = null)}>
      <section class="current"><Current {forecast} place={settings.active} {fetchedAt} {loading} /></section>
      {#if warnings.length || nc}
        <section class="notices">
          <Alerts {warnings} />
          {#if nc}<div class="card"><Nowcast {nc} /></div>{/if}
        </section>
      {/if}
      <section class="card now"><Details {forecast} /></section>
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
  {:else if failed}
    <div class="empty">
      <p>{t('loadFailed')}</p>
      <button class="btn" onclick={() => settings.active && load(settings.active, true)}>{t('retry')}</button>
    </div>
  {:else}
    <div class="empty" aria-busy="true"><div class="spinner"></div><p>{t('loading')}</p></div>
  {/if}
</div>

<Settings bind:open={settingsOpen} onshow={show} />
