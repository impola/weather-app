<script lang="ts">
  import type { Place } from '../lib/api';
  import { isSaved, settings, t, tabs } from '../lib/state.svelte';

  let { onshow }: { onshow: (p: Place) => void } = $props();

  let nav = $state<HTMLElement>();

  // keep the active tab in view (after a swipe it may be off to the side)
  $effect(() => {
    const id = settings.active?.id;
    if (!nav || !id) return;
    const el = nav.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
</script>

{#if tabs().length > 1}
  <nav class="tabs" aria-label={t('savedPlaces')} bind:this={nav}>
    {#each tabs() as tab (tab.place.id)}
      <button
        class="tab"
        data-id={tab.place.id}
        class:active={tab.place.id === settings.active?.id}
        aria-current={tab.place.id === settings.active?.id ? 'true' : undefined}
        onclick={() => onshow(tab.place)}>
        {#if tab.here}<span aria-hidden="true">📍</span><span class="visually-hidden">{t('myLocation')}:</span>
        {:else if isSaved(tab.place)}<span aria-hidden="true">★</span>{/if}
        {tab.place.name}
      </button>
    {/each}
  </nav>
{/if}

<style>
  .tabs {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 2px 0;
    /* fade at the edges so a cut-off tab looks intended */
    mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 24px), transparent 100%);
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 24px), transparent 100%);
    padding-inline: 8px 24px;
    margin-inline: -8px;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    flex: none;
    border: 1px solid var(--card-border);
    background: var(--card);
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
  }
  .tab:hover { background: var(--hover); }
  .tab.active { background: var(--fg); color: #1e3a8a; border-color: var(--fg); font-weight: 600; }
  :global(body.night) .tab.active { color: #0f172a; }
</style>
