<script lang="ts">
  import WxIcon from './WxIcon.svelte';
  import SunriseIcon from '@lucide/svelte/icons/sunrise';
  import SunsetIcon from '@lucide/svelte/icons/sunset';
  import type { Forecast } from '../lib/api';
  import { compassLabel, fmtDayLong, fmtPct, fmtTime, parseLocal } from '../lib/i18n';
  import { fmtPrecip, fmtWind } from '../lib/units';
  import { compassIndex, weatherInfo } from '../lib/weather';
  import { restOfToday } from '../lib/summary';
  import { locale, settings, t } from '../lib/state.svelte';
  import WindArrow from './WindArrow.svelte';

  let { forecast, day, today, compact = false }: { forecast: Forecast; day: number; today: number; compact?: boolean } = $props();

  const d = $derived(forecast.daily);
  const u = $derived(settings.units);
  /** today counts from now: hours that have passed don't matter any more */
  const rest = $derived(day === today ? restOfToday(forecast) : null);
  const w = $derived(rest ? weatherInfo(rest.code, true) : weatherInfo(d.weather_code[day]));
  const precip = $derived(rest ? rest.precip : d.precipitation_sum[day]);
  const pop = $derived(rest ? rest.pop : d.precipitation_probability_max[day]);
  const wind = $derived(rest ? rest.windMax : d.wind_speed_10m_max[day]);
  const gust = $derived(rest ? rest.gustMax : d.wind_gusts_10m_max[day]);
  const daylight = $derived.by(() => {
    const ms = parseLocal(d.sunset[day]).getTime() - parseLocal(d.sunrise[day]).getTime();
    const min = Math.max(0, Math.round(ms / 60000));
    return t('hours', { n: Math.floor(min / 60), m: min % 60 });
  });
  const uv = $derived(d.uv_index_max[day]);
  const uvLevel = $derived(uv == null ? '' : uv < 3 ? 'low' : uv < 6 ? 'mid' : uv < 8 ? 'high' : 'vhigh');
</script>

{#if !compact}<h2>{fmtDayLong(settings.lang, d.time[day])}</h2>{/if}
<p class="summary">
  <WxIcon name={w.icon} size={36} />
  <span>{t(w.key as never)}{#if rest}<small> · {t('restOfDay').toLowerCase()}</small>{/if}</span>
</p>

<dl>
  <div><dt>{t('sunrise')}</dt><dd><SunriseIcon size={18} /> {fmtTime(settings.lang, d.sunrise[day])}</dd></div>
  <div><dt>{t('sunset')}</dt><dd><SunsetIcon size={18} /> {fmtTime(settings.lang, d.sunset[day])}</dd></div>
  <div><dt>{t('daylight')}</dt><dd>{daylight}</dd></div>
  <div>
    <dt>{rest ? t('precipRest') : t('precipSum')}</dt>
    <dd class="rain">
      {fmtPrecip(precip, u.precip, locale())}
      {#if rest && rest.precipSoFar >= 0.1}<small>({t('soFar', { amount: fmtPrecip(rest.precipSoFar, u.precip, locale()) })})</small>{/if}
    </dd>
  </div>
  <div><dt>{t('precipChance')}</dt><dd class="rain">{fmtPct(settings.lang, pop)}</dd></div>
  <div><dt>{t('uvIndex')}</dt><dd><span class="uv {uvLevel}">{uv == null ? '–' : Math.round(uv)}</span></dd></div>
  <div class="wide">
    <dt>{t('maxWind')}</dt>
    <dd>
      <WindArrow deg={d.wind_direction_10m_dominant[day]} />
      {fmtWind(wind, u.wind, locale())}
      <small>({t('gusts').toLowerCase()} {fmtWind(gust, u.wind, locale())}) · {compassLabel(settings.lang, compassIndex(d.wind_direction_10m_dominant[day]))}</small>
    </dd>
  </div>
</dl>

<style>
  .summary { margin: -4px 0 12px; font-size: 17px; display: flex; align-items: center; gap: 6px; }
  .summary small { color: var(--muted); font-size: 14px; }
  dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 10px; margin: 0; }
  .wide { grid-column: 1 / -1; }
  dt { font-size: 13px; color: var(--muted); }
  dd { margin: 3px 0 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  dd small { color: var(--muted); font-weight: 400; font-size: 13px; }
  .rain { color: var(--rain); }
  .uv { display: inline-block; min-width: 28px; text-align: center; padding: 1px 8px; border-radius: 8px; color: #111; }
  .uv.low { background: #86efac; }
  .uv.mid { background: #fde047; }
  .uv.high { background: #fb923c; }
  .uv.vhigh { background: #f87171; }
</style>
