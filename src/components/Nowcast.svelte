<script lang="ts">
  import UmbrellaIcon from '@lucide/svelte/icons/umbrella';
  import type { Nowcast } from '../lib/summary';
  import { fmtTime } from '../lib/i18n';
  import { fmtPrecip } from '../lib/units';
  import { locale, settings, t } from '../lib/state.svelte';

  let { nc }: { nc: Nowcast } = $props();

  const max = $derived(Math.max(0.5, ...nc.steps.map((s) => s.mm)));
  const text = $derived(t(nc.key, { kind: t(`kind_${nc.kind}` as never), min: nc.minutes }));
</script>

<div class="nowcast">
  <p class="head"><UmbrellaIcon size={18} /> <b>{text}</b></p>
  <div class="bars" role="img" aria-label={t('ncChart')}>
    {#each nc.steps as s, i (s.time)}
      <div class="col" title="{fmtTime(settings.lang, s.time)}: {fmtPrecip(s.mm * 4, settings.units.precip, locale())}/h">
        <div class="bar" style="height:{Math.max(s.mm > 0 ? 6 : 2, (s.mm / max) * 100)}%" class:dry={s.mm < 0.1}></div>
        <span class="lbl">{i % 2 === 0 ? (i === 0 ? t('now') : fmtTime(settings.lang, s.time)) : ''}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .head { margin: 0 0 10px; display: flex; align-items: center; gap: 8px; font-size: 16px; }
  .head :global(svg) { color: var(--rain); flex: none; }
  .bars { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; height: 64px; }
  .col { display: grid; grid-template-rows: 1fr auto; align-items: end; min-width: 0; }
  .bar { background: var(--rain); border-radius: 4px 4px 1px 1px; min-height: 2px; }
  .bar.dry { background: var(--faint); opacity: 0.6; }
  .lbl { font-size: 12px; color: var(--muted); margin-top: 4px; white-space: nowrap; height: 1.2em; }
</style>
