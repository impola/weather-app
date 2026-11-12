<script lang="ts">
  import { chartRange, type Forecast } from '../lib/api';
  import { fmtDayLong, fmtDayShort, fmtHour, fmtPct, fmtTime } from '../lib/i18n';
  import { convertTemp, fmtPrecip, fmtTemp, fmtWind } from '../lib/units';
  import { weatherInfo } from '../lib/weather';
  import { locale, settings, t } from '../lib/state.svelte';
  import WindArrow from './WindArrow.svelte';

  let { forecast, day, today }: { forecast: Forecast; day: number; today: number } = $props();

  const isToday = $derived(day <= today);
  /** "Idag", "Imorgon", weekday, counted from today */
  const dayName = (date: string) => fmtDayShort(settings.lang, date, forecast.daily.time.indexOf(date) - today);

  // geometry (px, in the SVG's own coordinates = CSS pixels)
  const H = 252;
  const PAD = 10;
  const ICON_Y = 16;
  const TEMP_TOP = 58;
  const TEMP_BOTTOM = 136;
  const BASE_Y = 200; // bottom of the precipitation bars
  const BAR_MAX = 46;
  const LABEL_Y = 218;
  const WIND_Y = 238;

  let width = $state(600);
  const W = $derived(Math.max(280, width));

  const h = $derived(forecast.hourly);
  const range = $derived(chartRange(forecast, day));
  const idxs = $derived(Array.from({ length: range[1] - range[0] }, (_, j) => range[0] + j));
  const n = $derived(idxs.length);
  const dx = $derived((W - 2 * PAD) / Math.max(1, n));
  /** label every k hours so labels are at least ~40 px apart */
  const k = $derived([1, 2, 3, 4, 6, 12].find((s) => s * dx >= 40) ?? 12);

  const u = $derived(settings.units);
  const temps = $derived(idxs.map((i) => convertTemp(h.temperature_2m[i], u.temp)));
  const lo = $derived(Math.min(...temps) - 1);
  const hi = $derived(Math.max(...temps) + 1);
  const precipScale = $derived(Math.max(2, ...idxs.map((i) => h.precipitation[i])));

  const x = (j: number) => PAD + (j + 0.5) * dx;
  const yT = (v: number) => TEMP_BOTTOM - ((v - lo) / (hi - lo || 1)) * (TEMP_BOTTOM - TEMP_TOP);

  const line = $derived(temps.map((v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${yT(v).toFixed(1)}`).join(''));
  const area = $derived(n ? `${line}L${x(n - 1).toFixed(1)},${BASE_Y}L${x(0).toFixed(1)},${BASE_Y}Z` : '');
  const midnights = $derived(idxs.map((i, j) => ({ i, j })).filter(({ i, j }) => j > 0 && h.time[i].endsWith('T00:00')));

  // the hour under the cursor / finger / keyboard
  let sel = $state(0);
  let dragging = false;
  $effect(() => {
    void range[0];
    void range[1];
    sel = 0;
  });
  const cur = $derived(Math.min(sel, Math.max(0, n - 1)));
  const ci = $derived(idxs[cur] ?? 0);
  const cw = $derived(weatherInfo(h.weather_code[ci], h.is_day[ci] === 1));

  function when(i: number): string {
    const date = h.time[i].slice(0, 10);
    const dayIndex = forecast.daily.time.indexOf(date);
    const time = fmtTime(settings.lang, h.time[i]);
    return dayIndex === today && isToday && i === idxs[0] ? `${t('now')} · ${time}` : `${dayName(date)} ${time}`;
  }

  const valueText = $derived(n ? t('chartValue', {
    time: when(ci),
    temp: fmtTemp(h.temperature_2m[ci], u.temp),
    desc: t(cw.key as never),
    precip: fmtPrecip(h.precipitation[ci], u.precip, locale()),
    pop: fmtPct(settings.lang, h.precipitation_probability[ci]),
    wind: fmtWind(h.wind_speed_10m[ci], u.wind, locale()),
  }) : '');

  function pointAt(e: PointerEvent) {
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const px = e.clientX - rect.left;
    sel = Math.max(0, Math.min(n - 1, Math.floor((px - PAD) / dx)));
  }

  function down(e: PointerEvent) {
    dragging = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointAt(e);
  }
  function move(e: PointerEvent) {
    if (dragging || e.pointerType === 'mouse') pointAt(e);
  }
  function up() {
    dragging = false;
  }

  function key(e: KeyboardEvent) {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, PageDown: 6, PageUp: -6 };
    if (e.key in steps) sel = Math.max(0, Math.min(n - 1, cur + steps[e.key]));
    else if (e.key === 'Home') sel = 0;
    else if (e.key === 'End') sel = n - 1;
    else return;
    e.preventDefault();
  }

  const tipLeft = $derived(Math.max(78, Math.min(W - 78, x(cur))));
</script>

<h2>{isToday ? t('next48') : t('hoursOf', { day: fmtDayLong(settings.lang, forecast.daily.time[day]) })}</h2>

<div class="wrap" bind:clientWidth={width}>
  <div class="tip" style="left:{tipLeft}px" aria-hidden="true">
    <div class="tip-time">{when(ci)}</div>
    <div class="tip-main"><span>{cw.icon}</span> <b>{fmtTemp(h.temperature_2m[ci], u.temp)}</b> <span class="tip-desc">{t(cw.key as never)}</span></div>
    <div class="tip-row">
      <span class="rain">💧 {fmtPrecip(h.precipitation[ci], u.precip, locale())} · {fmtPct(settings.lang, h.precipitation_probability[ci])}</span>
      <span><WindArrow deg={h.wind_direction_10m[ci]} size={12} /> {fmtWind(h.wind_speed_10m[ci], u.wind, locale())}</span>
    </div>
  </div>

  <svg
    width={W}
    height={H}
    viewBox="0 0 {W} {H}"
    role="slider"
    tabindex="0"
    aria-label={t('chartLabel')}
    aria-valuemin={0}
    aria-valuemax={Math.max(0, n - 1)}
    aria-valuenow={cur}
    aria-valuetext={valueText}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onkeydown={key}>
    <defs>
      <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fde047" stop-opacity="0.35" />
        <stop offset="1" stop-color="#fde047" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- day boundaries -->
    {#each midnights as m (m.i)}
      <line class="midnight" x1={x(m.j) - dx / 2} x2={x(m.j) - dx / 2} y1={ICON_Y + 14} y2={BASE_Y} />
      <text class="dayname" x={x(m.j) - dx / 2 + 4} y={ICON_Y + 26}>{dayName(h.time[m.i].slice(0, 10))}</text>
    {/each}

    <line class="base" x1={PAD} x2={W - PAD} y1={BASE_Y} y2={BASE_Y} />

    <!-- temperature -->
    <path d={area} fill="url(#tempFill)" />
    <path d={line} class="temp" />

    <!-- precipitation: bar height = amount, opacity = probability -->
    {#each idxs as i, j (i)}
      {#if h.precipitation[i] > 0}
        {@const bh = Math.max(2, (h.precipitation[i] / precipScale) * BAR_MAX)}
        <rect
          class="bar"
          x={x(j) - dx * 0.35}
          y={BASE_Y - bh}
          width={Math.max(1.5, dx * 0.7)}
          height={bh}
          rx="1.5"
          opacity={0.35 + 0.65 * ((h.precipitation_probability[i] ?? 50) / 100)} />
      {/if}
    {/each}
    <!-- columns every k hours: icon, temperature, hour, wind -->
    {#each idxs as i, j (i)}
      {#if j % k === 0}
        <text class="icon" x={x(j)} y={ICON_Y}>{weatherInfo(h.weather_code[i], h.is_day[i] === 1).icon}</text>
        <text class="tlabel" x={x(j)} y={yT(temps[j]) - 8}>{fmtTemp(h.temperature_2m[i], u.temp)}</text>
        <text class="hour" x={x(j)} y={LABEL_Y}>{j === 0 && isToday ? t('now') : fmtHour(settings.lang, h.time[i])}</text>
        <g transform="translate({x(j) - 6},{WIND_Y - 10}) rotate({h.wind_direction_10m[i] + 180} 6 6)">
          <path class="wind" d="M6 0 L10.5 11 L6 8.2 L1.5 11 Z" />
        </g>
      {/if}
    {/each}

    <!-- cursor -->
    {#if n}
      <line class="cursor" x1={x(cur)} x2={x(cur)} y1={ICON_Y + 10} y2={BASE_Y} />
      <circle class="dot" cx={x(cur)} cy={yT(temps[cur])} r="5" />
    {/if}
  </svg>
</div>

<style>
  .wrap { position: relative; padding-top: 70px; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
  svg { display: block; overflow: visible; cursor: crosshair; touch-action: pan-y; }
  svg:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 8px; }

  .tip {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    min-width: 150px;
    padding: 6px 10px;
    border-radius: 12px;
    background: var(--popup);
    border: 1px solid var(--card-border);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
    font-size: 13px;
    white-space: nowrap;
    pointer-events: none;
  }
  .tip-time { color: var(--muted); font-size: 12px; }
  .tip-main b { font-size: 17px; }
  .tip-desc { color: var(--muted); }
  .tip-row { display: flex; gap: 10px; justify-content: space-between; }
  .rain { color: var(--rain); }

  .temp { fill: none; stroke: #fde047; stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
  .bar { fill: var(--rain); }
  .base { stroke: var(--card-border); }
  .midnight { stroke: var(--faint); stroke-dasharray: 3 4; }
  .dayname { fill: var(--muted); font-size: 11px; }
  .icon { font-size: 17px; text-anchor: middle; dominant-baseline: middle; }
  .tlabel { fill: var(--fg); font-size: 12px; font-weight: 600; text-anchor: middle; }
  .hour { fill: var(--muted); font-size: 11px; text-anchor: middle; }
  .wind { fill: var(--muted); }
  .cursor { stroke: var(--fg); stroke-width: 1; opacity: 0.7; }
  .dot { fill: #fde047; stroke: var(--bg-bottom); stroke-width: 2; }
</style>
