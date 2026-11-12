<script lang="ts">
  import type { Forecast } from '../lib/api';
  import { compassLabel, fmtDayLong, fmtTime, parseLocal } from '../lib/i18n';
  import { fmtPrecip, fmtWind } from '../lib/units';
  import { compassIndex, weatherInfo } from '../lib/weather';
  import { locale, settings, t } from '../lib/state.svelte';
  import WindArrow from './WindArrow.svelte';

  let { forecast, day }: { forecast: Forecast; day: number } = $props();

  const d = $derived(forecast.daily);
  const u = $derived(settings.units);
  const w = $derived(weatherInfo(d.weather_code[day]));
  const daylight = $derived.by(() => {
    const ms = parseLocal(d.sunset[day]).getTime() - parseLocal(d.sunrise[day]).getTime();
    const min = Math.max(0, Math.round(ms / 60000));
    return t('hours', { n: Math.floor(min / 60), m: min % 60 });
  });
  const uv = $derived(d.uv_index_max[day]);
  const uvLevel = $derived(uv == null ? '' : uv < 3 ? 'low' : uv < 6 ? 'mid' : uv < 8 ? 'high' : 'vhigh');
</script>

<h2>{fmtDayLong(settings.lang, d.time[day])}</h2>
<p class="summary"><span aria-hidden="true">{w.icon}</span> {t(w.key as never)}</p>

<dl>
  <div><dt>{t('sunrise')}</dt><dd>🌅 {fmtTime(settings.lang, d.sunrise[day])}</dd></div>
  <div><dt>{t('sunset')}</dt><dd>🌇 {fmtTime(settings.lang, d.sunset[day])}</dd></div>
  <div><dt>{t('daylight')}</dt><dd>{daylight}</dd></div>
  <div><dt>{t('precipSum')}</dt><dd class="rain">{fmtPrecip(d.precipitation_sum[day], u.precip, locale())}</dd></div>
  <div><dt>{t('precipChance')}</dt><dd class="rain">{d.precipitation_probability_max[day] ?? 0} %</dd></div>
  <div><dt>{t('uvIndex')}</dt><dd><span class="uv {uvLevel}">{uv == null ? '–' : Math.round(uv)}</span></dd></div>
  <div class="wide">
    <dt>{t('maxWind')}</dt>
    <dd>
      <WindArrow deg={d.wind_direction_10m_dominant[day]} />
      {fmtWind(d.wind_speed_10m_max[day], u.wind, locale())}
      <small>({t('gusts').toLowerCase()} {fmtWind(d.wind_gusts_10m_max[day], u.wind, locale())}) · {compassLabel(settings.lang, compassIndex(d.wind_direction_10m_dominant[day]))}</small>
    </dd>
  </div>
</dl>

<style>
  .summary { margin: -4px 0 12px; font-size: 17px; }
  dl { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 10px; margin: 0; }
  .wide { grid-column: 1 / -1; }
  dt { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  dd { margin: 3px 0 0; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  dd small { color: var(--muted); font-weight: 400; font-size: 13px; }
  .rain { color: var(--rain); }
  .uv { display: inline-block; min-width: 28px; text-align: center; padding: 1px 8px; border-radius: 8px; color: #111; }
  .uv.low { background: #86efac; }
  .uv.mid { background: #fde047; }
  .uv.high { background: #fb923c; }
  .uv.vhigh { background: #f87171; }
</style>
