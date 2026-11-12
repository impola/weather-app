<script lang="ts">
  import { slide } from 'svelte/transition';
  import WxIcon from './WxIcon.svelte';
  import HourChart from './HourChart.svelte';
  import DayDetail from './DayDetail.svelte';
  import ChevronIcon from '@lucide/svelte/icons/chevron-down';
  import { nowValues, type Forecast } from '../lib/api';
  import { fmtDayShort, fmtPct } from '../lib/i18n';
  import { fmtTemp } from '../lib/units';
  import { tempGradient, weatherInfo } from '../lib/weather';
  import { restOfToday } from '../lib/summary';
  import { settings, t } from '../lib/state.svelte';

  let {
    forecast,
    day,
    today,
    onselect,
    inline = false,
  }: {
    forecast: Forecast;
    day: number;
    today: number;
    onselect: (d: number) => void;
    /** phones: a tapped day opens right here (its hours and details) instead of in other cards */
    inline?: boolean;
  } = $props();

  const d = $derived(forecast.daily);
  const u = $derived(settings.units);
  /** day indexes from today on (an old offline copy can include past days) */
  const days = $derived(d.time.map((_, i) => i).filter((i) => i >= today));
  const weekMin = $derived(Math.min(...days.map((i) => d.temperature_2m_min[i])));
  const weekMax = $derived(Math.max(...days.map((i) => d.temperature_2m_max[i])));
  const span = $derived(weekMax - weekMin || 1);
  const nowTemp = $derived(nowValues(forecast).temperature_2m);
  const rest = $derived(restOfToday(forecast));
  const pos = (v: number) => ((v - weekMin) / span) * 100;

  /** the day opened inline (phones) */
  let open = $state<number | null>(null);
  let list = $state<HTMLUListElement>();

  function choose(i: number) {
    if (!inline) return onselect(i);
    open = open === i ? null : i;
    if (open != null) {
      // bring the opened day into view once it has unfolded
      setTimeout(() => list?.querySelectorAll('li')[days.indexOf(i)]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 260);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (inline) return; // in a list of expanding rows, Tab / Enter is the usual way
    const j = days.indexOf(day);
    let next = j;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(days.length - 1, j + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(0, j - 1);
    else return;
    e.preventDefault();
    onselect(days[next]);
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button.row')[next]?.focus();
  }
</script>

<h2>{t('forecastN', { n: days.length })}</h2>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions (arrow keys move between the days) -->
<ul class="days" onkeydown={onKey} bind:this={list}>
  {#each days as i (d.time[i])}
    {@const isToday = i === today}
    {@const w = isToday ? weatherInfo(rest.code, true) : weatherInfo(d.weather_code[i])}
    {@const lo = d.temperature_2m_min[i]}
    {@const hi = d.temperature_2m_max[i]}
    {@const pop = isToday ? rest.pop : d.precipitation_probability_max[i]}
    {@const name = fmtDayShort(settings.lang, d.time[i], i - today)}
    {@const label = t('dayButton', { day: name, desc: t(w.key as never), low: fmtTemp(lo, u.temp), high: fmtTemp(hi, u.temp) }) + (pop != null && pop >= 20 ? `, ${t('precipChance').toLowerCase()} ${fmtPct(settings.lang, pop)}` : '')}
    <li>
      <button
        class="row"
        class:selected={inline ? open === i : i === day}
        aria-pressed={inline ? undefined : i === day}
        aria-expanded={inline ? open === i : undefined}
        aria-label={label}
        onclick={() => choose(i)}>
        <span class="name">{name}</span>
        <span class="wx">
          <span class="icon" title={t(w.key as never)}><WxIcon name={w.icon} size={34} /></span>
          {#if pop != null && pop >= 20}<span class="pop">{fmtPct(settings.lang, pop)}</span>{/if}
        </span>
        <span class="lo">{fmtTemp(lo, u.temp)}</span>
        <span class="bar" aria-hidden="true">
          <span class="range" style="left:{pos(lo)}%; width:{Math.max(3, pos(hi) - pos(lo))}%; background:{tempGradient(lo, hi)}"></span>
          {#if isToday}<span class="now" style="left:{Math.min(100, Math.max(0, pos(nowTemp)))}%"></span>{/if}
        </span>
        <span class="hi">{fmtTemp(hi, u.temp)}</span>
        {#if inline}<span class="chev" class:open={open === i} aria-hidden="true"><ChevronIcon size={16} /></span>{/if}
      </button>
      {#if inline && open === i}
        <div class="inline" transition:slide={{ duration: 220 }}>
          <!-- today's hours are already in the chart above -->
          {#if i !== today}<HourChart {forecast} day={i} {today} compact />{/if}
          <div class="inline-detail"><DayDetail {forecast} day={i} {today} compact /></div>
        </div>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .days { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--card-border); }
  .row {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(3.4em, auto) 2.6em minmax(2.3em, auto) minmax(40px, 1fr) minmax(2.3em, auto);
    align-items: center;
    gap: 8px;
    border: 0;
    background: none;
    padding: 8px 8px;
    margin: 2px 0;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
  }
  .row:has(.chev) { grid-template-columns: minmax(3.4em, auto) 2.6em minmax(2.3em, auto) minmax(32px, 1fr) minmax(2.3em, auto) 16px; }
  .row:hover { background: var(--hover); }
  .row.selected { background: var(--selected); }
  .name { font-weight: 500; white-space: nowrap; }
  .wx { display: grid; justify-items: center; line-height: 1.1; }
  .icon { display: grid; margin: -4px 0 -2px; }
  .pop { font-size: 12px; font-weight: 600; color: var(--rain); }
  .lo { color: var(--muted); text-align: right; }
  .hi { text-align: right; }
  .bar { position: relative; height: 6px; border-radius: 3px; background: rgba(0, 0, 0, 0.2); }
  .range { position: absolute; top: 0; bottom: 0; border-radius: 3px; }
  .now {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.35);
    transform: translate(-50%, -50%);
  }
  .chev { display: grid; color: var(--muted); transition: transform 0.2s; }
  .chev.open { transform: rotate(180deg); }
  .inline { padding: 6px 4px 14px; }
  .inline-detail { margin-top: 12px; }
</style>
