<script lang="ts">
  import { chartRange, nowValues, type Forecast } from '../lib/api';
  import { fmtDayLong, fmtDayShort, fmtHour, fmtPct, fmtTime } from '../lib/i18n';
  import { convertPrecip, convertTemp, fmtPrecip, fmtTemp, fmtWind, PRECIP_LABEL } from '../lib/units';
  import { tempColor, weatherInfo } from '../lib/weather';
  import { locale, settings, t } from '../lib/state.svelte';
  import DropletIcon from '@lucide/svelte/icons/droplet';
  import WindArrow from './WindArrow.svelte';
  import WxIcon, { wxUrl } from './WxIcon.svelte';

  let { forecast, day, today, compact = false }: { forecast: Forecast; day: number; today: number; compact?: boolean } = $props();
  const uid = $props.id();

  // geometry (px, in the SVG's own coordinates = CSS pixels)
  const PAD = 12;
  const ICON = 26;
  const TEMP_TOP = 52;
  const TEMP_BOTTOM = 118;
  const P_TOP = 136; // precipitation zone
  const BASE_Y = 174;
  const LABEL_Y = 192;
  const WIND_Y = 202;
  const H = 216;

  let width = $state(600);
  const W = $derived(Math.max(260, width));

  const h = $derived(forecast.hourly);
  const isToday = $derived(day <= today);
  /** narrow screens show 24 hours from now, wide ones 48 */
  const span = $derived(isToday && W < 560 ? 24 : 48);
  const range = $derived.by(() => {
    const [s, e] = chartRange(forecast, day);
    return [s, isToday ? Math.min(e, s + span) : e] as [number, number];
  });
  const idxs = $derived(Array.from({ length: range[1] - range[0] }, (_, j) => range[0] + j));
  const n = $derived(idxs.length);
  const dx = $derived((W - 2 * PAD) / Math.max(1, n));
  /** a column every k hours (on round clock hours), at least ~42 px apart */
  const k = $derived([1, 2, 3, 4, 6, 12].find((s) => s * dx >= 42) ?? 12);
  const hourOf = (i: number) => Number(h.time[i].slice(11, 13));
  const ticks = $derived(idxs.map((i, j) => ({ i, j })).filter(({ i, j }) => j === 0 || (hourOf(i) % k === 0 && j >= k * 0.6)));

  const u = $derived(settings.units);
  const nowTemp = $derived(nowValues(forecast).temperature_2m);
  /** °C per column; "now" uses the current conditions, like the top of the app */
  const tC = $derived(idxs.map((i, j) => (j === 0 && isToday ? nowTemp : h.temperature_2m[i])));
  const temps = $derived(tC.map((c) => convertTemp(c, u.temp)));
  const lo = $derived(Math.min(...temps) - 0.8);
  const hi = $derived(Math.max(...temps) + 0.8);
  const precipScale = $derived(Math.max(2, ...idxs.map((i) => h.precipitation[i])));

  const x = (j: number) => PAD + (j + 0.5) * dx;
  const yT = (v: number) => TEMP_BOTTOM - ((v - lo) / (hi - lo || 1)) * (TEMP_BOTTOM - TEMP_TOP);

  const line = $derived(temps.map((v, j) => `${j ? 'L' : 'M'}${x(j).toFixed(1)},${yT(v).toFixed(1)}`).join(''));
  const area = $derived(n ? `${line}L${x(n - 1).toFixed(1)},${TEMP_BOTTOM + 8}L${x(0).toFixed(1)},${TEMP_BOTTOM + 8}Z` : '');
  const midnights = $derived(idxs.map((i, j) => ({ i, j })).filter(({ i, j }) => j > 0 && h.time[i].endsWith('T00:00')));

  /** temperatures to label: the start, and local highs and lows, not closer than ~36 px */
  const tempLabels = $derived.by(() => {
    const r = Math.max(2, Math.round(36 / dx));
    const out: { j: number; up: boolean }[] = [{ j: 0, up: true }];
    for (let j = 1; j < n; j++) {
      const win = temps.slice(Math.max(0, j - r), Math.min(n, j + r + 1));
      const isMax = temps[j] === Math.max(...win) && temps[j] !== temps[j - 1];
      const isMin = temps[j] === Math.min(...win) && temps[j] !== temps[j - 1];
      if (!isMax && !isMin) continue;
      if (out.some((o) => Math.abs(x(o.j) - x(j)) < 36)) continue;
      out.push({ j, up: isMax });
    }
    return out;
  });

  // colour of the line by temperature: a vertical gradient over the chart's range
  const gradStops = $derived.by(() => {
    const loC = Math.min(...tC);
    const hiC = Math.max(...tC);
    const stops = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ f, c: tempColor(hiC - f * (hiC - loC)) }));
    return { y1: yT(Math.max(...temps)), y2: yT(Math.min(...temps)), stops };
  });

  // the hour shown in the info row: "now" until the user picks another
  let sel = $state(0);
  let dragging = false;
  $effect(() => {
    void range[0];
    void range[1];
    sel = 0;
  });
  const cur = $derived(Math.min(sel, Math.max(0, n - 1)));
  const ci = $derived(idxs[cur] ?? 0);
  const atNow = $derived(isToday && cur === 0);
  const nv = $derived(nowValues(forecast));
  /** values for the info row (the current conditions for "now") */
  const info = $derived(atNow
    ? { temp: nv.temperature_2m, code: nv.weather_code, isDay: nv.is_day === 1, wind: nv.wind_speed_10m, dir: nv.wind_direction_10m }
    : { temp: h.temperature_2m[ci], code: h.weather_code[ci], isDay: h.is_day[ci] === 1, wind: h.wind_speed_10m[ci], dir: h.wind_direction_10m[ci] });
  const cw = $derived(weatherInfo(info.code, info.isDay));

  const dayName = (date: string) => fmtDayShort(settings.lang, date, forecast.daily.time.indexOf(date) - today);
  function when(i: number): string {
    const time = fmtTime(settings.lang, h.time[i]);
    return atNow && i === idxs[0] ? `${t('now')} · ${time}` : `${dayName(h.time[i].slice(0, 10))} ${time}`;
  }

  const valueText = $derived(n ? t('chartValue', {
    time: when(ci),
    temp: fmtTemp(info.temp, u.temp),
    desc: t(cw.key as never),
    precip: fmtPrecip(h.precipitation[ci], u.precip, locale()),
    pop: fmtPct(settings.lang, h.precipitation_probability[ci]),
    wind: fmtWind(info.wind, u.wind, locale()),
  }) : '');

  function pointAt(e: PointerEvent) {
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    sel = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - rect.left - PAD) / dx)));
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

  const precipLabel = $derived(`${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(convertPrecip(precipScale, u.precip))} ${PRECIP_LABEL[u.precip]}`);
</script>

{#if !compact}<h2>{isToday ? t(span === 24 ? 'next24' : 'next48') : t('hoursOf', { day: fmtDayLong(settings.lang, forecast.daily.time[day]) })}</h2>{/if}

<!-- the chosen hour (fixed height, so nothing jumps) -->
<div class="info" aria-hidden="true">
  <WxIcon name={cw.icon} size={40} />
  <div class="info-main">
    <div class="info-time">{when(ci)}</div>
    <div><b>{fmtTemp(info.temp, u.temp)}</b> <span class="muted">{t(cw.key as never)}</span></div>
  </div>
  <div class="info-side">
    <span class="rain"><DropletIcon size={14} /> {fmtPrecip(h.precipitation[ci], u.precip, locale())} · {fmtPct(settings.lang, h.precipitation_probability[ci])}</span>
    <span><WindArrow deg={info.dir} size={13} /> {fmtWind(info.wind, u.wind, locale())}</span>
  </div>
</div>

<div class="wrap" bind:clientWidth={width}>
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
      <linearGradient id="fill-{uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.18" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="line-{uid}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={gradStops.y1} y2={gradStops.y2}>
        {#each gradStops.stops as s (s.f)}<stop offset={s.f} stop-color={s.c} />{/each}
      </linearGradient>
    </defs>

    <!-- day boundaries -->
    {#each midnights as m (m.i)}
      <line class="midnight" x1={x(m.j) - dx / 2} x2={x(m.j) - dx / 2} y1={ICON + 8} y2={BASE_Y} />
      <text class="dayname" x={x(m.j) - dx / 2 + 5} y={ICON + 20}>{dayName(h.time[m.i].slice(0, 10))}</text>
    {/each}

    <!-- temperature -->
    <path d={area} fill="url(#fill-{uid})" />
    <path d={line} class="temp" stroke="url(#line-{uid})" />
    {#each tempLabels as l (l.j)}
      <text class="tlabel" x={x(l.j)} y={l.up ? yT(temps[l.j]) - 9 : yT(temps[l.j]) + 18}>{fmtTemp(tC[l.j], u.temp)}</text>
    {/each}

    <!-- precipitation: its own zone; bar height = amount, opacity = probability -->
    <line class="grid-line" x1={PAD} x2={W - PAD} y1={P_TOP} y2={P_TOP} />
    <text class="scale" x={W - PAD} y={P_TOP - 4}>{precipLabel}</text>
    {#each idxs as i, j (i)}
      {#if h.precipitation[i] > 0}
        {@const bh = Math.max(2, (h.precipitation[i] / precipScale) * (BASE_Y - P_TOP))}
        <rect
          class="bar"
          x={x(j) - dx * 0.36}
          y={BASE_Y - bh}
          width={Math.max(1.5, dx * 0.72)}
          height={bh}
          rx="1.5"
          opacity={0.4 + 0.6 * ((h.precipitation_probability[i] ?? 50) / 100)} />
      {/if}
    {/each}
    <line class="base" x1={PAD} x2={W - PAD} y1={BASE_Y} y2={BASE_Y} />

    <!-- columns on round hours: icon, hour, wind -->
    {#each ticks as { i, j } (i)}
      <image href={wxUrl(weatherInfo(h.weather_code[i], h.is_day[i] === 1).icon)} x={x(j) - ICON / 2} y="0" width={ICON} height={ICON} />
      <text class="hour" x={x(j)} y={LABEL_Y}>{j === 0 && isToday ? t('now') : fmtHour(settings.lang, h.time[i])}</text>
      <g transform="translate({x(j) - 6},{WIND_Y}) rotate({h.wind_direction_10m[i] + 180} 6 6)">
        <path class="wind" d="M6 0 L10.5 11 L6 8.2 L1.5 11 Z" />
      </g>
    {/each}

    <!-- cursor -->
    {#if n}
      <line class="cursor" x1={x(cur)} x2={x(cur)} y1={ICON + 6} y2={BASE_Y} />
      <circle class="dot" cx={x(cur)} cy={yT(temps[cur])} r="5" fill={tempColor(tC[cur])} />
    {/if}
  </svg>
</div>

<style>
  .info {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 4px 2px 10px;
  }
  .info-main { flex: 1; min-width: 0; line-height: 1.25; }
  .info-main b { font-size: 20px; font-weight: 600; }
  .info-time { font-size: 13px; color: var(--muted); }
  .info-side { display: grid; justify-items: end; gap: 2px; font-size: 14px; white-space: nowrap; }
  .info-side span { display: flex; align-items: center; gap: 4px; }
  .muted { color: var(--muted); }
  .rain { color: var(--rain); }

  .wrap { position: relative; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
  svg { display: block; overflow: visible; cursor: crosshair; touch-action: pan-y; }
  svg:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 8px; }

  .temp { fill: none; stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
  .tlabel { fill: var(--fg); font-size: 13px; font-weight: 600; text-anchor: middle; paint-order: stroke; stroke: rgba(2, 6, 23, 0.35); stroke-width: 3px; }
  .bar { fill: var(--rain); }
  .base { stroke: var(--faint); }
  .grid-line { stroke: var(--card-border); stroke-dasharray: 2 4; }
  .scale { fill: var(--muted); font-size: 12px; text-anchor: end; }
  .midnight { stroke: var(--faint); stroke-dasharray: 3 4; }
  .dayname { fill: var(--muted); font-size: 12px; }
  .hour { fill: var(--muted); font-size: 12px; text-anchor: middle; }
  .wind { fill: var(--muted); }
  .cursor { stroke: var(--fg); stroke-width: 1; opacity: 0.6; }
  .dot { stroke: #fff; stroke-width: 2; }
</style>
