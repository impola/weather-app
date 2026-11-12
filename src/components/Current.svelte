<script lang="ts">
  import { nowValues, todayIndex, type Forecast, type Place } from '../lib/api';
  import { fmtStamp } from '../lib/i18n';
  import { fmtTemp } from '../lib/units';
  import { weatherInfo } from '../lib/weather';
  import { summarize } from '../lib/summary';
  import { isSaved, settings, t, tabs, toggleSaved } from '../lib/state.svelte';
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw';
  import MapPinIcon from '@lucide/svelte/icons/map-pin';
  import StarIcon from '@lucide/svelte/icons/star';
  import WxIcon from './WxIcon.svelte';

  let {
    forecast,
    place,
    fetchedAt,
    loading,
    onrefresh,
    onshow,
  }: { forecast: Forecast; place: Place; fetchedAt: number; loading: boolean; onrefresh: () => void; onshow: (p: Place) => void } = $props();

  const pages = $derived(tabs());
  const pageIndex = $derived(pages.findIndex((x) => x.place.id === place.id));

  const c = $derived(nowValues(forecast));
  const today = $derived(todayIndex(forecast));
  const w = $derived(weatherInfo(c.weather_code, c.is_day === 1));
  const u = $derived(settings.units);
  const saved = $derived(isSaved(place));
  const summary = $derived(summarize(forecast, settings.lang, settings.units));
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
  {#if pages.length > 1}
    <div class="dots" role="group" aria-label={t('page', { n: pageIndex + 1, total: pages.length })}>
      {#each pages as pg, i (pg.place.id)}
        <button class="dot-btn" class:on={i === pageIndex} aria-label={pg.place.name} aria-current={i === pageIndex ? 'true' : undefined} onclick={() => onshow(pg.place)}>
          {#if pg.here}<MapPinIcon size={10} strokeWidth={3} />{:else}<span class="dot-mark"></span>{/if}
        </button>
      {/each}
    </div>
  {/if}

  <p class="temp">{fmtTemp(c.temperature_2m, u.temp)}</p>
  <p class="desc"><WxIcon name={w.icon} size={36} /> {t(w.key as never)}</p>
  <p class="range">
    {t('high')} {fmtTemp(forecast.daily.temperature_2m_max[today], u.temp)}
    · {t('low')} {fmtTemp(forecast.daily.temperature_2m_min[today], u.temp)}
    · {t('feelsLike')} {fmtTemp(c.apparent_temperature, u.temp)}
  </p>

  {#if summary.length}<p class="summary">{summary.join(' ')}</p>{/if}

  <button class="updated" onclick={onrefresh} title={t('refresh')} disabled={loading}>
    <span class="spin" class:busy={loading}><RefreshIcon size={13} /></span>
    {t('updated', { time: fmtStamp(settings.lang, new Date(fetchedAt)) })}
  </button>
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
  .summary { margin: 12px auto 0; max-width: 34em; font-size: 15px; line-height: 1.45; text-wrap: pretty; }
  .updated {
    margin: 8px auto 0;
    font-size: 12px;
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: none;
    padding: 6px 10px;
    border-radius: 999px;
    cursor: pointer;
  }
  .updated:hover { background: var(--hover); color: var(--fg); }
  .updated:disabled { cursor: default; }
  .spin { display: grid; }
  .spin.busy { animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .dots { display: flex; justify-content: center; gap: 2px; margin-top: 6px; }
  .dot-btn { border: 0; background: none; width: 20px; height: 20px; display: grid; place-items: center; cursor: pointer; color: var(--faint); padding: 0; }
  .dot-btn.on { color: var(--fg); }
  .dot-mark { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  @media (min-width: 900px) { .dots { display: none; } }
</style>
