<script lang="ts">
  import PlayIcon from '@lucide/svelte/icons/play';
  import PauseIcon from '@lucide/svelte/icons/pause';
  import { onDestroy, onMount } from 'svelte';
  import type * as Leaflet from 'leaflet';
  import { radarFrames, type Place, type RadarFrame } from '../lib/api';
  import { fmtClock } from '../lib/i18n';
  import { settings, t } from '../lib/state.svelte';

  let { place, onpick }: { place: Place; onpick: (lat: number, lon: number) => void } = $props();

  let el: HTMLDivElement;
  let L: typeof Leaflet | null = null;
  let map: Leaflet.Map | null = null;
  let marker: Leaflet.CircleMarker | null = null;
  let radarLayer: Leaflet.TileLayer | null = null;

  let ready = $state(false);
  let radarOn = $state(false);
  let frames = $state<RadarFrame[]>([]);
  let frame = $state(0);
  let playing = $state(false);
  let radarError = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  onMount(async () => {
    // Leaflet is loaded only when the map is shown, to keep the first load small
    const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
    L = mod.default ?? mod;
    map = L.map(el, { zoomControl: true, attributionControl: true }).setView([place.lat, place.lon], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    marker = L.circleMarker([place.lat, place.lon], {
      radius: 9, color: '#fff', weight: 3, fillColor: '#f59e0b', fillOpacity: 1,
    }).addTo(map);
    map.on('click', (e: Leaflet.LeafletMouseEvent) => onpick(e.latlng.lat, e.latlng.lng));
    ready = true;
  });

  onDestroy(() => {
    clearInterval(timer);
    map?.remove();
  });

  // follow the shown place
  $effect(() => {
    const p = place;
    if (!ready || !map || !marker) return;
    marker.setLatLng([p.lat, p.lon]);
    map.setView([p.lat, p.lon], Math.max(map.getZoom(), 6), { animate: true });
  });

  async function toggleRadar() {
    radarOn = !radarOn;
    if (!radarOn) {
      stop();
      radarLayer?.remove();
      radarLayer = null;
      return;
    }
    radarError = false;
    try {
      frames = await radarFrames();
      frame = Math.max(0, frames.findLastIndex((f) => f.time * 1000 <= Date.now()));
      showFrame();
    } catch (err) {
      console.warn(err);
      radarError = true;
      radarOn = false;
    }
  }

  function showFrame() {
    if (!L || !map || !radarOn || !frames[frame]) return;
    const next = L.tileLayer(frames[frame].url, {
      opacity: 0.75,
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
</script>

<div class="head">
  <h2>{t('map')}</h2>
  <label class="toggle">
    <input type="checkbox" checked={radarOn} onchange={toggleRadar} />
    <span>{t('radar')}</span>
  </label>
</div>

<div class="map" bind:this={el}></div>

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
    <span class="time">{fmtClock(settings.lang, new Date(frames[frame].time * 1000))}</span>
  </div>
{/if}
{#if radarError}<p class="hint">{t('radarFailed')}</p>{/if}
<p class="hint">{t('mapHint')}</p>

<style>
  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .head h2 { margin: 0; }
  .toggle { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
  .toggle input { width: 18px; height: 18px; accent-color: var(--accent); }

  .map {
    height: 340px;
    border-radius: 14px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.2);
    z-index: 0;
  }
  :global(.leaflet-container) { font: inherit; font-size: 12px; }

  .radar { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .radar input { flex: 1; accent-color: var(--accent); }
  .small { width: 36px; height: 36px; font-size: 15px; }
  .time { font-variant-numeric: tabular-nums; min-width: 4.5em; text-align: right; }
  .hint { margin: 8px 0 0; font-size: 12px; color: var(--faint); }
</style>
