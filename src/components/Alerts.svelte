<script lang="ts">
  import AlertIcon from '@lucide/svelte/icons/alert-triangle';
  import InfoIcon from '@lucide/svelte/icons/info';
  import type { Warning } from '../lib/warnings';
  import { fmtStamp } from '../lib/i18n';
  import { settings, t } from '../lib/state.svelte';

  let { warnings }: { warnings: Warning[] } = $props();

  /** "Area · from Thu 14:00 until Fri 23:00" */
  function meta(w: Warning): string {
    const when = [
      w.start && t('warnFrom', { time: fmtStamp(settings.lang, w.start) }),
      w.end && t('warnUntil', { time: fmtStamp(settings.lang, w.end) }),
    ].filter(Boolean).join(' ');
    return [w.area, when].filter(Boolean).join(' · ');
  }
</script>

{#each warnings as w (w.id)}
  <details class="alert {w.level.toLowerCase()}">
    <summary>
      {#if w.level === 'MESSAGE'}<InfoIcon size={20} />{:else}<AlertIcon size={20} />{/if}
      <span class="what">
        <b>{t(`warnLevel_${w.level}` as never)}: {w.title}</b>
        <small>{meta(w)}</small>
      </span>
    </summary>
    <div class="body">
      {#each w.details as d (d.title)}
        <h3>{d.title}</h3>
        {#each d.text.split('\n').filter(Boolean) as para, k (k)}<p>{para}</p>{/each}
      {/each}
      <p class="source">{t('warnSource')} · <a href="https://www.smhi.se/vader/varningar-och-meddelanden/varningar" target="_blank" rel="noopener">smhi.se</a></p>
    </div>
  </details>
{/each}

<style>
  .alert {
    border-radius: 16px;
    border: 1px solid var(--card-border);
    background: var(--card);
    overflow: hidden;
  }
  summary {
    list-style: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;
  }
  summary::-webkit-details-marker { display: none; }
  .what { display: grid; min-width: 0; }
  .what small { color: var(--muted); font-size: 13px; }
  .yellow { border-left: 6px solid #facc15; }
  .yellow :global(svg) { color: #facc15; }
  .orange { border-left: 6px solid #fb923c; background: rgba(251, 146, 60, 0.16); }
  .orange :global(svg) { color: #fb923c; }
  .red { border-left: 6px solid #ef4444; background: rgba(239, 68, 68, 0.2); }
  .red :global(svg) { color: #f87171; }
  .message :global(svg) { color: var(--muted); }
  .message b { font-weight: 500; }
  summary :global(svg) { flex: none; }
  .body { padding: 0 16px 14px 44px; font-size: 14px; line-height: 1.5; }
  h3 { margin: 10px 0 2px; font-size: 13px; color: var(--muted); font-weight: 600; }
  p { margin: 0 0 6px; }
  .source { margin-top: 10px; color: var(--muted); font-size: 13px; }
</style>
