<script lang="ts">
  import PlayIcon from '@lucide/svelte/icons/play';
  import PauseIcon from '@lucide/svelte/icons/pause';
  import { onDestroy, onMount } from 'svelte';
  import type * as Leaflet from 'leaflet';
  import { fetchPoint, placeName, radarFrames, type Place, type RadarFrame } from '../lib/api';
  import { fmtClock } from '../lib/i18n';
  import { fmtTemp } from '../lib/units';
  import { weatherInfo } from '../lib/weather';
  import { settings, t } from '../lib/state.svelte';
  import { wxUrl } from './WxIcon.svelte';

  let {
    place,
    night = false,
    onpick,
  }: {
    place: Place;
    night?: boolean;
    onpick: (p: { lat: number; lon: number; name: string; detail?: string }) => void;
  } = $props();

  let card: HTMLDivElement;
  let el: HTMLDivElement;
  let L: typeof Leaflet | null = null;
  let map: Leaflet.Map | null = null;
  let base: Leaflet.TileLayer | null = null;
  let marker: Leaflet.CircleMarker | null = null;
  let radarLayer: Leaflet.TileLayer | null = null;

  let ready = $state(false);
  let radarOn = $state(readRadarSetting());
  let frames = $state<RadarFrame[]>([]);
  let frame = $state(0);
  let playing = $state(false);
  let radarError = $state(false);
  let hint = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  let refresher: ReturnType<typeof setInterval> | undefined;
  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: IntersectionObserver | undefined;

  /** touch screens: one finger scrolls the page, two move the map */
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  function readRadarSetting(): boolean {
    try { return localStorage.getItem('radar') === '1'; } catch { return false; }
  }
  function saveRadarSetting(on: boolean) {
    try { localStorage.setItem('radar', on ? '1' : '0'); } catch { /* ignore */ }
  }

  // OpenStreetMap tiles, toned down with a CSS filter (grey by day, dark by night) so the
  // radar and the marker stand out; the filter is on the base layer only.
  const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  onMount(() => {
    // Leaflet (~45 kB) is loaded only when the map comes near the screen
    observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        observer?.disconnect();
        void init();
      }
    }, { rootMargin: '300px' });
    observer.observe(card);
  });

  async function init() {
    const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
    L = mod.default ?? mod;
    map = L.map(el, { zoomControl: true, attributionControl: true, dragging: !coarse }).setView([place.lat, place.lon], 7);
    base = L.tileLayer(TILES, {
      maxZoom: 18,
      className: 'base-tiles',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    marker = L.circleMarker([place.lat, place.lon], {
      radius: 9, color: '#fff', weight: 3, fillColor: '#f59e0b', fillOpacity: 1,
    }).addTo(map);
    map.on('click', (e: Leaflet.LeafletMouseEvent) => void showPopup(e.latlng.lat, e.latlng.lng));
    if (coarse) {
      el.addEventListener('touchstart', (e) => { if (e.touches.length >= 2) map?.dragging.enable(); }, { passive: true });
      el.addEventListener('touchend', (e) => { if (e.touches.length < 2) map?.dragging.disable(); }, { passive: true });
      el.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1) return;
        hint = true;
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => (hint = false), 1400);
      }, { passive: true });
    }
    ready = true;
    if (radarOn) void loadRadar();
  }

  onDestroy(() => {
    observer?.disconnect();
    clearInterval(timer);
    clearInterval(refresher);
    clearTimeout(hintTimer);
    map?.remove();
  });

  // follow the shown place
  $effect(() => {
    const p = place;
    if (!ready || !map || !marker) return;
    marker.setLatLng([p.lat, p.lon]);
    map.closePopup();
    map.setView([p.lat, p.lon], Math.max(map.getZoom(), 6), { animate: true });
  });


  /** A tap shows the weather at that point first; the app moves there only on request. */
  async function showPopup(lat: number, lon: number) {
    if (!L || !map) return;
    const box = document.createElement('div');
    box.className = 'map-pop';
    const title = document.createElement('b');
    title.textContent = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    const wx = document.createElement('div');
    wx.className = 'map-pop-wx';
    wx.textContent = '…';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = t('mapShowHere');
    box.append(title, wx, btn);
    const popup = L.popup({ closeButton: true, autoPan: true }).setLatLng([lat, lon]).setContent(box).openOn(map);

    let named: { name: string; detail?: string } | null = null;
    btn.onclick = () => {
      map?.closePopup(popup);
      onpick({ lat, lon, name: named?.name ?? title.textContent ?? '', detail: named?.detail });
    };
    const [n, w] = await Promise.allSettled([placeName(lat, lon, settings.lang), fetchPoint(lat, lon)]);
    if (n.status === 'fulfilled' && n.value) {
      named = n.value;
      title.textContent = n.value.name;
    }
    if (w.status === 'fulfilled') {
      const info = weatherInfo(w.value.weather_code, w.value.is_day === 1);
      wx.textContent = '';
      const img = document.createElement('img');
      img.src = wxUrl(info.icon);
      img.width = img.height = 32;
      img.alt = '';
      const txt = document.createElement('span');
      txt.textContent = `${fmtTemp(w.value.temperature_2m, settings.units.temp)} ${t(info.key as never)}`;
      wx.append(img, txt);
    } else {
      wx.textContent = '';
    }
    popup.update();
  }

  async function loadRadar() {
    radarError = false;
    try {
      frames = await radarFrames();
      frame = Math.max(0, frames.findLastIndex((f) => f.time * 1000 <= Date.now()));
      showFrame();
      // new radar images come every 10 minutes
      if (!refresher) refresher = setInterval(() => { if (radarOn && !playing) void loadRadar(); }, 10 * 60 * 1000);
    } catch (err) {
      console.warn(err);
      radarError = true;
    }
  }

  async function toggleRadar() {
    radarOn = !radarOn;
    saveRadarSetting(radarOn);
    if (!radarOn) {
      clearInterval(refresher);
      refresher = undefined;
      stop();
      radarLayer?.remove();
      radarLayer = null;
      return;
    }
    await loadRadar();
  }

  function showFrame() {
    if (!L || !map || !radarOn || !frames[frame]) return;
    const next = L.tileLayer(frames[frame].url, {
      opacity: 0.8,
      maxNativeZoom: 7, // the free radar tiles stop at zoom 7; Leaflet scales them up
      maxZoom: 18,
      attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>',
      zIndex: 10,
    }).addTo(map);
    const old = radarLayer;
    radarLayer = next;
    // remove the old frame once the new one has drawn, so it doesn't flicker
    if (old) next.once('load', () => old.remove());
  }

  function play() {
    if (playing) return stop();
    playing = true;
    timer = setInterval(() => {
      frame = (frame + 1) % frames.length;
      showFrame();
    }, 700);
  }

  function stop() {
    playing = false;
    clearInterval(timer);
  }

  function ago(time: number): string {
    const min = Math.round((Date.now() - time * 1000) / 60000);
    return min <= 5 ? t('radarNow') : t('radarAgo', { min });
  }
</script>

<div class="head" bind:this={card}>
  <h2>{t('map')}</h2>
  <label class="toggle">
    <input type="checkbox" checked={radarOn} onchange={toggleRadar} />
    <span>{t('radar')}</span>
  </label>
</div>

<div class="map-wrap">
  <div class="map" class:dark={night} bind:this={el}></div>
  {#if hint}<div class="hint-overlay">{t('mapTwoFingers')}</div>{/if}
</div>

{#if radarOn && frames.length}
  <div class="radar">
    <button class="icon-btn small" aria-label={playing ? t('pause') : t('play')} title={playing ? t('pause') : t('play')} onclick={play}>
      {#if playing}<PauseIcon size={16} />{:else}<PlayIcon size={16} />{/if}
    </button>
    <input
      type="range"
      min="0"
      max={frames.length - 1}
      bind:value={frame}
      oninput={() => { stop(); showFrame(); }}
      aria-label={t('radar')}
      aria-valuetext={t('radarTime', { time: fmtClock(settings.lang, new Date(frames[frame].time * 1000)) })} />
    <span class="time">
      {fmtClock(settings.lang, new Date(frames[frame].time * 1000))}
      <small>{ago(frames[frame].time)}</small>
    </span>
  </div>
  <div class="legend" aria-hidden="true"><span>{t('radarLight')}</span><i></i><span>{t('radarHeavy')}</span></div>
{/if}
{#if radarError}<p class="hint">{t('radarFailed')}</p>{/if}
<p class="hint">{t('mapHint')}</p>

<style>
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .head h2 { margin: 0; }
  .toggle { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
  .toggle input { width: 18px; height: 18px; accent-color: var(--accent); }

  .map-wrap { position: relative; }
  .map {
    height: 340px;
    border-radius: 14px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
    z-index: 0;
  }
  .hint-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    text-align: center;
    border-radius: 14px;
    background: rgba(2, 6, 23, 0.55);
    color: #fff;
    font-weight: 600;
    pointer-events: none;
    z-index: 500;
  }
  :global(.leaflet-container) { font: inherit; font-size: 12px; }
  .map :global(.base-tiles) { filter: grayscale(0.9) contrast(0.92) brightness(1.04); }
  .map.dark :global(.base-tiles) { filter: grayscale(1) invert(1) contrast(0.82) brightness(0.85); }
  .map.dark { background: #1a1d21; }
  :global(.map-pop) { display: grid; gap: 6px; min-width: 150px; color: #0f172a; font-size: 14px; }
  :global(.map-pop b) { font-size: 15px; }
  :global(.map-pop-wx) { display: flex; align-items: center; gap: 6px; min-height: 32px; }
  :global(.map-pop button) {
    border: 0;
    border-radius: 10px;
    padding: 8px 10px;
    background: #1f6fd1;
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }

  .radar { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .radar input { flex: 1; accent-color: var(--accent); }
  .small { width: 36px; height: 36px; }
  .time { min-width: 5.5em; text-align: right; display: grid; line-height: 1.2; }
  .time small { color: var(--muted); font-size: 12px; }
  .legend { display: flex; align-items: center; gap: 8px; margin-top: 6px; font-size: 12px; color: var(--muted); }
  .legend i { flex: 1; max-width: 160px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #88ddee, #0099cc, #0077aa, #005588, #ffee00, #ffaa00, #ff4400); }
  .hint { margin: 8px 0 0; font-size: 12px; color: var(--muted); }
</style>
