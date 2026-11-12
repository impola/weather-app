<script lang="ts">
  import { nowValues, type Forecast } from '../lib/api';
  import { fmtDayShort, fmtPct } from '../lib/i18n';
  import { fmtTemp } from '../lib/units';
  import { tempGradient, weatherInfo } from '../lib/weather';
  import { settings, t } from '../lib/state.svelte';

  let { forecast, day, today, onselect }: { forecast: Forecast; day: number; today: number; onselect: (d: number) => void } = $props();

  const d = $derived(forecast.daily);
  const u = $derived(settings.units);
  /** day indexes from today on (an old offline copy can include past days) */
  const days = $derived(d.time.map((_, i) => i).filter((i) => i >= today));
  const weekMin = $derived(Math.min(...days.map((i) => d.temperature_2m_min[i])));
  const weekMax = $derived(Math.max(...days.map((i) => d.temperature_2m_max[i])));
  const span = $derived(weekMax - weekMin || 1);
  const nowTemp = $derived(nowValues(forecast).temperature_2m);
  const pos = (v: number) => ((v - weekMin) / span) * 100;

  function onKey(e: KeyboardEvent) {
    const j = days.indexOf(day);
    let next = j;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(days.length - 1, j + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(0, j - 1);
    else return;
    e.preventDefault();
    onselect(days[next]);
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button')[next]?.focus();
  }
</script>

<h2>{t('forecast7')}</h2>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions (arrow keys move between the days) -->
<ul class="days" onkeydown={onKey}>
  {#each days as i (d.time[i])}
    {@const w = weatherInfo(d.weather_code[i])}
    {@const lo = d.temperature_2m_min[i]}
    {@const hi = d.temperature_2m_max[i]}
    {@const pop = d.precipitation_probability_max[i]}
    {@const name = fmtDayShort(settings.lang, d.time[i], i - today)}
    <li>
      <button
        class:selected={i === day}
        aria-pressed={i === day}
        aria-label={t('dayButton', { day: name, desc: t(w.key as never), low: fmtTemp(lo, u.temp), high: fmtTemp(hi, u.temp) }) + (pop != null && pop >= 20 ? `, ${t('precipChance').toLowerCase()} ${fmtPct(settings.lang, pop)}` : '')}
        onclick={() => onselect(i)}>
        <span class="name">{name}</span>
        <span class="wx">
          <span class="icon" title={t(w.key as never)}>{w.icon}</span>
          {#if pop != null && pop >= 20}<span class="pop">{fmtPct(settings.lang, pop)}</span>{/if}
        </span>
        <span class="lo">{fmtTemp(lo, u.temp)}</span>
        <span class="bar" aria-hidden="true">
          <span class="range" style="left:{pos(lo)}%; width:{Math.max(3, pos(hi) - pos(lo))}%; background:{tempGradient(lo, hi)}"></span>
          {#if i === today}<span class="now" style="left:{Math.min(100, Math.max(0, pos(nowTemp)))}%"></span>{/if}
        </span>
        <span class="hi">{fmtTemp(hi, u.temp)}</span>
      </button>
    </li>
  {/each}
</ul>

<style>
  .days { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--card-border); }
  button {
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
  button:hover { background: var(--hover); }
  button.selected { background: rgba(255, 255, 255, 0.2); }
  .name { font-weight: 500; white-space: nowrap; }
  .wx { display: grid; justify-items: center; line-height: 1.1; }
  .icon { font-size: 21px; }
  .pop { font-size: 11px; font-weight: 600; color: var(--rain); }
  .lo { color: var(--muted); text-align: right; font-variant-numeric: tabular-nums; }
  .hi { text-align: right; font-variant-numeric: tabular-nums; }
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
</style>
