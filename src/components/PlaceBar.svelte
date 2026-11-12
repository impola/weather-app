<script lang="ts">
  import SearchIcon from '@lucide/svelte/icons/search';
  import StarIcon from '@lucide/svelte/icons/star';
  import LocateIcon from '@lucide/svelte/icons/locate-fixed';
  import { preferCountry, searchPlaces, type Place } from '../lib/api';
  import { addRecent, isSaved, settings, t, toggleSaved } from '../lib/state.svelte';

  let { onshow, onlocate }: { onshow: (p: Place) => void; onlocate: () => void } = $props();

  let query = $state('');
  let results = $state<Place[] | null>(null);
  let open = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let input: HTMLInputElement;
  let list = $state<HTMLUListElement>();
  /** recently picked places (not saved ones), shown when the field is empty */
  const recent = $derived(settings.recent.filter((r) => !isSaved(r)).slice(0, 5));

  async function search(q: string) {
    controller?.abort();
    if (q.trim().length < 2) {
      results = null;
      return;
    }
    controller = new AbortController();
    try {
      // places in the user's own country first ("Malmö" before "Malmo, Nebraska")
      const home = settings.here?.cc ?? settings.places.find((x) => x.cc)?.cc ?? (settings.lang === 'sv' ? 'SE' : undefined);
      results = preferCountry(await searchPlaces(q, settings.lang, controller.signal), home);
      open = true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.warn(err);
    }
  }

  function onInput() {
    clearTimeout(timer);
    if (!query.trim()) results = null;
    timer = setTimeout(() => search(query), 250);
  }

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    clearTimeout(timer);
    await search(query);
    if (results?.length) pick(results[0]);
  }

  function pick(p: Place) {
    if (!isSaved(p)) addRecent(p);
    onshow(p);
    query = '';
    results = null;
    open = false;
    input.blur();
  }

  function focusItem(delta: number) {
    const items = [...(list?.querySelectorAll<HTMLElement>('.pick') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = i < 0 ? (delta > 0 ? 0 : items.length - 1) : i + delta;
    if (next < 0) input.focus();
    else items[Math.min(next, items.length - 1)]?.focus();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(-1); }
    else if (e.key === 'Escape') { open = false; input.focus(); }
  }

  function onFocusOut(e: FocusEvent) {
    const form = e.currentTarget as HTMLElement;
    if (!form.contains(e.relatedTarget as Node)) open = false;
  }
</script>

<div class="bar">
  <div class="row">
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions (arrow keys move between the results) -->
    <form class="search" role="search" onsubmit={onSubmit} onkeydown={onKey} onfocusout={onFocusOut}>
      <span class="glass" aria-hidden="true"><SearchIcon size={17} /></span>
      <input
        bind:this={input}
        bind:value={query}
        oninput={onInput}
        onfocus={() => (open = true)}
        type="search"
        placeholder={t('search')}
        aria-label={t('searchLabel')}
        autocomplete="off"
        enterkeyhint="search"
      />
      {#if open && (results || (!query.trim() && recent.length))}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions (keeps focus in the field while a result is pressed: Safari does not focus buttons) -->
        <ul class="results" bind:this={list} onpointerdown={(e) => e.preventDefault()}>
          {#if !results}<li class="label">{t('recentSearches')}</li>{/if}
          {#each results ?? recent as r (r.id)}
            <li>
              <button type="button" class="pick" onclick={() => pick(r)}>
                <span class="name">{r.name}</span>
                {#if r.detail}<small>{r.detail}</small>{/if}
              </button>
              <button
                type="button"
                class="star"
                class:on={isSaved(r)}
                aria-pressed={isSaved(r)}
                aria-label={isSaved(r) ? t('unsave') : t('save')}
                title={isSaved(r) ? t('unsave') : t('save')}
                onclick={() => toggleSaved(r)}><StarIcon size={20} fill={isSaved(r) ? 'currentColor' : 'none'} /></button>
            </li>
          {:else}
            <li class="none">{t('noMatches')}</li>
          {/each}
        </ul>
      {/if}
    </form>
    <button class="icon-btn" aria-label={t('useLocation')} title={t('useLocation')} onclick={onlocate}><LocateIcon size={20} /></button>
  </div>

</div>

<style>
  .bar { flex: 1; min-width: 0; }
  .row { display: flex; gap: 8px; }

  .search { position: relative; flex: 1; min-width: 0; }
  .glass { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; display: grid; }
  input {
    width: 100%;
    height: 44px;
    border: 0;
    border-radius: 12px;
    padding: 0 14px 0 38px;
    font: inherit;
    color: var(--fg);
    background: var(--input);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }
  input::placeholder { color: var(--muted); }
  input:focus-visible { outline: 2px solid var(--accent); outline-offset: 0; }

  .results {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 6px);
    margin: 0;
    padding: 6px;
    list-style: none;
    background: var(--popup);
    border: 1px solid var(--card-border);
    border-radius: 14px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    max-height: 60vh;
    overflow: auto;
    z-index: 10;
  }
  .results li { display: flex; align-items: stretch; border-radius: 10px; }
  .results li:hover { background: var(--hover); }
  .pick {
    flex: 1;
    min-width: 0;
    text-align: left;
    border: 0;
    background: none;
    padding: 10px 12px;
    cursor: pointer;
    border-radius: 10px;
  }
  .pick small { display: block; color: var(--muted); }
  .star {
    border: 0;
    background: none;
    width: 44px;
    font-size: 20px;
    cursor: pointer;
    color: var(--muted);
    border-radius: 10px;
  }
  .star.on { color: var(--accent); }
  .star:hover { background: var(--hover); }
  .none { padding: 10px 12px; color: var(--muted); }
  .label { padding: 6px 12px 2px; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .results li.label:hover { background: none; }

</style>
