<script lang="ts">
  import { nowValues, todayIndex, type Forecast, type Place } from '../lib/api';
  import { fmtStamp } from '../lib/i18n';
  import { fmtTemp } from '../lib/units';
  import { weatherInfo } from '../lib/weather';
  import { isSaved, settings, t, toggleSaved } from '../lib/state.svelte';
  import StarIcon from '@lucide/svelte/icons/star';
  import WxIcon from './WxIcon.svelte';

  let { forecast, place, fetchedAt, loading }: { forecast: Forecast; place: Place; fetchedAt: number; loading: boolean } = $props();

  const c = $derived(nowValues(forecast));
  const today = $derived(todayIndex(forecast));
  const w = $derived(weatherInfo(c.weather_code, c.is_day === 1));
  const u = $derived(settings.units);
  const saved = $derived(isSaved(place));
</script>

<div class="current">
  <div class="title">
    <h1>{place.name}</h1>
    <button
      class="star"
      class:on={saved}
      aria-pressed={saved}
      aria-label={saved ? t('unsave') : t('save')}
      title={saved ? t('unsave') : t('save')}
      onclick={() => toggleSaved(place)}>
      <StarIcon size={22} fill={saved ? 'currentColor' : 'none'} />
    </button>
  </div>
  {#if place.detail}<p class="detail">{place.detail}</p>{/if}

  <p class="temp">{fmtTemp(c.temperature_2m, u.temp)}</p>
  <p class="desc"><WxIcon name={w.icon} size={36} /> {t(w.key as never)}</p>
  <p class="range">
    {t('high')} {fmtTemp(forecast.daily.temperature_2m_max[today], u.temp)}
    · {t('low')} {fmtTemp(forecast.daily.temperature_2m_min[today], u.temp)}
    · {t('feelsLike')} {fmtTemp(c.apparent_temperature, u.temp)}
  </p>

  <p class="updated">
    {#if loading}<span class="dot" aria-hidden="true"></span>{/if}
    {t('updated', { time: fmtStamp(settings.lang, new Date(fetchedAt)) })}
  </p>
</div>

<style>
  .current { text-align: center; padding: 6px 4px 2px; }
  .title { display: flex; justify-content: center; align-items: center; gap: 2px; padding-left: 40px; }
  h1 { margin: 0; font-size: 28px; font-weight: 600; overflow-wrap: anywhere; line-height: 1.2; }
  .star {
    border: 0;
    background: none;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    cursor: pointer;
    color: var(--muted);
    display: grid;
    place-items: center;
  }
  .star:hover { background: var(--hover); }
  .star.on { color: var(--accent); }
  .detail { margin: 0; color: var(--muted); font-size: 14px; }
  .temp { margin: 4px 0 0; font-size: 96px; font-weight: 200; line-height: 1; letter-spacing: -3px; padding-left: 0.12em; }
  .desc { margin: 2px 0 0; font-size: 19px; display: flex; justify-content: center; align-items: center; gap: 4px; }
  .range { margin: 2px 0 0; color: var(--muted); font-size: 15px; }
  .updated { margin: 10px 0 0; font-size: 12px; color: var(--muted); display: flex; justify-content: center; align-items: center; gap: 6px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: pulse 1s ease-in-out infinite alternate; }
  @keyframes pulse { from { opacity: 0.3; } to { opacity: 1; } }
</style>
