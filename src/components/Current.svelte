<script lang="ts">
  import type { Forecast, Place } from '../lib/api';
  import { compassLabel, fmtClock } from '../lib/i18n';
  import { fmtPrecip, fmtTemp, fmtWind } from '../lib/units';
  import { compassIndex, weatherInfo } from '../lib/weather';
  import { isSaved, locale, settings, t, toggleSaved } from '../lib/state.svelte';
  import WindArrow from './WindArrow.svelte';

  let { forecast, place, fetchedAt, loading }: { forecast: Forecast; place: Place; fetchedAt: number; loading: boolean } = $props();

  const c = $derived(forecast.current);
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
      onclick={() => toggleSaved(place)}>{saved ? '★' : '☆'}</button>
  </div>
  {#if place.detail}<p class="detail">{place.detail}</p>{/if}

  <div class="now">
    <span class="icon" aria-hidden="true">{w.icon}</span>
    <span class="temp">{fmtTemp(c.temperature_2m, u.temp)}</span>
  </div>
  <p class="desc">{t(w.key as never)}</p>
  <p class="range">
    {t('high')}: {fmtTemp(forecast.daily.temperature_2m_max[0], u.temp)}
    &nbsp; {t('low')}: {fmtTemp(forecast.daily.temperature_2m_min[0], u.temp)}
  </p>

  <dl class="facts">
    <div><dt>{t('feelsLike')}</dt><dd>{fmtTemp(c.apparent_temperature, u.temp)}</dd></div>
    <div>
      <dt>{t('wind')}</dt>
      <dd>
        <WindArrow deg={c.wind_direction_10m} />
        {fmtWind(c.wind_speed_10m, u.wind, locale())}
        <small>{compassLabel(settings.lang, compassIndex(c.wind_direction_10m))}</small>
      </dd>
    </div>
    <div><dt>{t('gusts')}</dt><dd>{fmtWind(c.wind_gusts_10m, u.wind, locale())}</dd></div>
    <div><dt>{t('humidity')}</dt><dd>{c.relative_humidity_2m} %</dd></div>
    <div><dt>{t('precipitation')}</dt><dd>{fmtPrecip(c.precipitation, u.precip, locale())}</dd></div>
    <div><dt>{t('pressure')}</dt><dd>{Math.round(c.pressure_msl)} hPa</dd></div>
  </dl>

  <p class="updated">
    {#if loading}<span class="dot" aria-hidden="true"></span>{/if}
    {t('updated', { time: fmtClock(settings.lang, new Date(fetchedAt)) })}
  </p>
</div>

<style>
  .current { text-align: center; padding: 8px 4px 0; }
  .title { display: flex; justify-content: center; align-items: center; gap: 4px; }
  h1 { margin: 0; font-size: 28px; font-weight: 600; overflow-wrap: anywhere; }
  .star {
    border: 0;
    background: none;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    cursor: pointer;
    color: var(--muted);
  }
  .star:hover { background: var(--hover); }
  .star.on { color: var(--accent); }
  .detail { margin: 0; color: var(--muted); font-size: 14px; }
  .now { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 6px; }
  .icon { font-size: 54px; line-height: 1; }
  .temp { font-size: 80px; font-weight: 200; line-height: 1; letter-spacing: -2px; }
  .desc { margin: 4px 0 0; font-size: 19px; }
  .range { margin: 2px 0 0; color: var(--muted); }

  .facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 18px 0 0;
  }
  .facts div {
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    padding: 10px 6px;
  }
  dt { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  dd { margin: 4px 0 0; font-size: 16px; font-weight: 500; display: flex; justify-content: center; align-items: center; gap: 4px; flex-wrap: wrap; }
  dd small { color: var(--muted); font-weight: 400; }

  .updated { margin: 12px 0 0; font-size: 12px; color: var(--faint); display: flex; justify-content: center; align-items: center; gap: 6px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: pulse 1s ease-in-out infinite alternate; }
  @keyframes pulse { from { opacity: 0.3; } to { opacity: 1; } }
</style>
