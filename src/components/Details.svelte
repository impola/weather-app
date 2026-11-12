<script lang="ts">
  import { nowValues, type Forecast } from '../lib/api';
  import { compassLabel, fmtPct } from '../lib/i18n';
  import { fmtPrecip, fmtWind, convertWind, WIND_LABEL } from '../lib/units';
  import { compassIndex } from '../lib/weather';
  import { locale, settings, t } from '../lib/state.svelte';
  import WindIcon from '@lucide/svelte/icons/wind';
  import DropletsIcon from '@lucide/svelte/icons/droplets';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import UmbrellaIcon from '@lucide/svelte/icons/umbrella';
  import WindArrow from './WindArrow.svelte';

  let { forecast }: { forecast: Forecast } = $props();

  const c = $derived(nowValues(forecast));
  const u = $derived(settings.units);
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
    <dd>{Math.round(c.pressure_msl)} hPa</dd>
  </div>
  <div class="wide">
    <dt><UmbrellaIcon size={16} /> {t('precipLastHour')}</dt>
    <dd>{fmtPrecip(c.precipitation, u.precip, locale())}</dd>
  </div>
</dl>

<style>
  dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; margin: 0; }
  .wide { grid-column: 1 / -1; }
  dt { font-size: 13px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  dd { margin: 3px 0 0; font-size: 17px; font-weight: 500; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .sub { color: var(--muted); font-weight: 400; font-size: 15px; }
</style>
