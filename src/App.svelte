<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchForecast, placeId, placeName, type Forecast, type Place } from './lib/api';
  import { fmtClock } from './lib/i18n';
  import { cacheForecast, cachedForecast, settings, t, tabs } from './lib/state.svelte';
  import PlaceBar from './components/PlaceBar.svelte';
  import Current from './components/Current.svelte';
  import DayList from './components/DayList.svelte';
  import HourChart from './components/HourChart.svelte';
  import DayDetail from './components/DayDetail.svelte';
  import MapView from './components/MapView.svelte';
  import Settings from './components/Settings.svelte';

  const STOCKHOLM: Place = { id: placeId(59.3293, 18.0686), name: 'Stockholm', detail: 'Sverige', lat: 59.3293, lon: 18.0686 };
  const FRESH_MS = 10 * 60 * 1000;

  let forecast = $state<Forecast | null>(null);
  let fetchedAt = $state(0);
  /** the forecast shown is an old copy because the network failed */
  let offline = $state(false);
  let loading = $state(false);
  let failed = $state(false);
  let message = $state('');
  let day = $state(0);
  let settingsOpen = $state(false);
  let controller: AbortController | null = null;

  async function load(place: Place, force = false) {
    const copy = cachedForecast(place.id);
    if (copy) {
      forecast = copy.data;
      fetchedAt = copy.at;
      if (!force && Date.now() - copy.at < FRESH_MS) {
        offline = false;
        return;
      }
    } else {
      forecast = null;
    }
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    loading = true;
    failed = false;
    try {
      const data = await fetchForecast(place, signal);
      if (signal.aborted) return;
      forecast = data;
      fetchedAt = Date.now();
      offline = false;
      cacheForecast(place.id, data);
    } catch (err) {
      if (signal.aborted) return;
      console.warn(err);
      offline = !!copy;
      failed = !copy;
    } finally {
      if (!signal.aborted) loading = false;
    }
  }

  // load when the shown place changes; start on today
  let lastId = '';
  $effect(() => {
    const place = settings.active;
    if (!place || place.id === lastId) return;
    lastId = place.id;
    day = 0;
    load(place);
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

  async function pickOnMap(lat: number, lon: number) {
    const named = await placeName(lat, lon, settings.lang);
    const name = named?.name ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    show({ id: placeId(lat, lon), name, detail: named?.detail, lat, lon });
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

  // night colours when it is dark at the place shown
  $effect(() => {
    document.body.classList.toggle('night', forecast ? forecast.current.is_day === 0 : false);
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
    <PlaceBar onshow={show} onlocate={locate} />
    <button class="icon-btn gear" aria-label={t('settings')} title={t('settings')} onclick={() => (settingsOpen = true)}>⚙️</button>
  </header>

  {#if message}
    <p class="status" role="status">{message}</p>
  {/if}
  {#if offline}
    <p class="status warn" role="status">
      {t('offlineData', { time: fmtClock(settings.lang, new Date(fetchedAt)) })}
      <button class="link" onclick={() => settings.active && load(settings.active, true)}>{t('retry')}</button>
    </p>
  {/if}

  {#if forecast && settings.active}
    <main class="grid" onpointerdown={swipeStart} onpointerup={swipeEnd} onpointercancel={() => (swipe = null)}>
      <section class="current"><Current {forecast} place={settings.active} {fetchedAt} {loading} /></section>
      <section class="card chart no-swipe"><HourChart {forecast} {day} /></section>
      <section class="card days"><DayList {forecast} bind:day /></section>
      <section class="card detail"><DayDetail {forecast} {day} /></section>
      <section class="card map no-swipe"><MapView place={settings.active} onpick={pickOnMap} /></section>
    </main>
    <p class="credit">
      {t('data')}: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>,
      <a href="https://www.rainviewer.com/" target="_blank" rel="noopener">RainViewer</a>,
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>
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
