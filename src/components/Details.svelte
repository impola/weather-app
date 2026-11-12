<script lang="ts">
  import { nowValues, type Air, type Forecast } from '../lib/api';
  import { aqiLevel, pollenNow, pressureTrend } from '../lib/summary';
  import LeafIcon from '@lucide/svelte/icons/leaf';
  import FlowerIcon from '@lucide/svelte/icons/flower-2';
  import { compassLabel, fmtPct } from '../lib/i18n';
  import { fmtPrecip, fmtWind, convertWind, WIND_LABEL } from '../lib/units';
  import { compassIndex } from '../lib/weather';
  import { locale, settings, t } from '../lib/state.svelte';
  import WindIcon from '@lucide/svelte/icons/wind';
  import DropletsIcon from '@lucide/svelte/icons/droplets';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import UmbrellaIcon from '@lucide/svelte/icons/umbrella';
  import WindArrow from './WindArrow.svelte';

  let { forecast, air = null }: { forecast: Forecast; air?: Air | null } = $props();
  const pollen = $derived(air ? pollenNow(air) : []);

  const c = $derived(nowValues(forecast));
  const u = $derived(settings.units);
  const trend = $derived(pressureTrend(forecast));
  const gust = $derived(Math.round(convertWind(c.wind_gusts_10m, u.wind)));
</script>

<h2>{t('rightNow')}</h2>
<dl>
  <div class="wide">
    <dt><WindIcon size={16} /> {t('windGusts')}</dt>
    <dd>
      <WindArrow deg={c.wind_direction_10m} size={16} />
      {fmtWind(c.wind_speed_10m, u.wind, locale())}
      <span class="sub">({gust} {WIND_LABEL[u.wind]}) · {compassLabel(settings.lang, compassIndex(c.wind_direction_10m))}</span>
    </dd>
  </div>
  <div>
    <dt><DropletsIcon size={16} /> {t('humidity')}</dt>
    <dd>{fmtPct(settings.lang, c.relative_humidity_2m)}</dd>
  </div>
  <div>
    <dt><GaugeIcon size={16} /> {t('pressure')}</dt>
    <dd>
      {Math.round(c.pressure_msl)} hPa
      {#if trend != null}<span class="sub">{trend >= 1 ? '↑' : trend <= -1 ? '↓' : '→'} {t(trend >= 1 ? 'rising' : trend <= -1 ? 'falling' : 'steady')}</span>{/if}
    </dd>
  </div>
  <div class="wide">
    <dt><UmbrellaIcon size={16} /> {t('precipLastHour')}</dt>
    <dd>{fmtPrecip(c.precipitation, u.precip, locale())}</dd>
  </div>
  {#if air?.european_aqi != null}
    <div class="wide">
      <dt><LeafIcon size={16} /> {t('airQuality')}</dt>
      <dd>
        <span class="aq {aqiLevel(air.european_aqi)}"></span>
        {t(aqiLevel(air.european_aqi) as never)}
        <span class="sub">EAQI {Math.round(air.european_aqi)}</span>
      </dd>
    </div>
  {/if}
  {#if pollen.length}
    <div class="wide">
      <dt><FlowerIcon size={16} /> {t('pollen')}</dt>
      <dd class="pollen">
        {#each pollen as p (p.kind)}<span>{t(`pollen_${p.kind}` as never)} <span class="sub">({t(p.level)})</span></span>{/each}
      </dd>
    </div>
  {/if}
</dl>

<style>
  dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; margin: 0; }
  .wide { grid-column: 1 / -1; }
  dt { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  dd { margin: 3px 0 0; font-size: 17px; font-weight: 500; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .sub { color: var(--muted); font-weight: 400; font-size: 15px; }
  .aq { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  .aqGood { background: #50f0e6; }
  .aqFair { background: #50ccaa; }
  .aqModerate { background: #f0e641; }
  .aqPoor { background: #ff5050; }
  .aqVeryPoor { background: #960032; }
  .aqExtreme { background: #7d2181; }
  .pollen { gap: 4px 14px; }
</style>
