<script lang="ts">
  import type { Forecast } from '../lib/api';
  import { fmtDayShort } from '../lib/i18n';
  import { fmtTemp } from '../lib/units';
  import { weatherInfo } from '../lib/weather';
  import { settings, t } from '../lib/state.svelte';

  let { forecast, day = $bindable(0) }: { forecast: Forecast; day: number } = $props();

  const d = $derived(forecast.daily);
  const u = $derived(settings.units);
  const weekMin = $derived(Math.min(...d.temperature_2m_min));
  const weekMax = $derived(Math.max(...d.temperature_2m_max));
  const span = $derived(weekMax - weekMin || 1);

  function onKey(e: KeyboardEvent) {
    const n = d.time.length;
    let next = day;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(n - 1, day + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(0, day - 1);
    else return;
    e.preventDefault();
    day = next;
    (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button')[next]?.focus();
  }
</script>

<h2>{t('forecast7')}</h2>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<ul class="days" onkeydown={onKey}>
  {#each d.time as date, i (date)}
    {@const w = weatherInfo(d.weather_code[i])}
    {@const lo = d.temperature_2m_min[i]}
    {@const hi = d.temperature_2m_max[i]}
    {@const pop = d.precipitation_probability_max[i] ?? 0}
    <li>
      <button
        class:selected={i === day}
        aria-pressed={i === day}
        aria-label={t('dayButton', { day: fmtDayShort(settings.lang, date, i), desc: t(w.key as never), low: fmtTemp(lo, u.temp), high: fmtTemp(hi, u.temp) })}
        onclick={() => (day = i)}>
        <span class="name">{fmtDayShort(settings.lang, date, i)}</span>
        <span class="icon" title={t(w.key as never)}>{w.icon}</span>
        <span class="pop">{pop >= 20 ? `${pop}%` : ''}</span>
        <span class="lo">{fmtTemp(lo, u.temp)}</span>
        <span class="bar" aria-hidden="true">
          <span style="left:{((lo - weekMin) / span) * 100}%; width:{Math.max(4, ((hi - lo) / span) * 100)}%"></span>
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
    grid-template-columns: 4.8em 2em 2.8em 2.6em 1fr 2.6em;
    align-items: center;
    gap: 6px;
    border: 0;
    background: none;
    padding: 10px 8px;
    margin: 2px 0;
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
  }
  button:hover { background: var(--hover); }
  button.selected { background: rgba(255, 255, 255, 0.22); }
  .name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .icon { font-size: 21px; text-align: center; }
  .pop { font-size: 12px; color: var(--rain); }
  .lo { color: var(--muted); text-align: right; }
  .hi { text-align: right; }
  .bar { position: relative; height: 6px; border-radius: 3px; background: rgba(0, 0, 0, 0.18); }
  .bar span {
    position: absolute;
    top: 0;
    bottom: 0;
    border-radius: 3px;
    background: linear-gradient(90deg, #7dd3fc, #fde047, #fb923c);
  }
</style>
