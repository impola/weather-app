<script lang="ts">
  import type { Place } from '../lib/api';
  import type { Lang } from '../lib/i18n';
  import type { PrecipUnit, TempUnit, WindUnit } from '../lib/units';
  import { movePlace, settings, t, toggleSaved } from '../lib/state.svelte';

  let { open = $bindable(false), onshow }: { open: boolean; onshow: (p: Place) => void } = $props();

  let dialog: HTMLDialogElement;

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  const langs: [Lang, string][] = [['sv', 'Svenska'], ['en', 'English']];
  const temps: [TempUnit, string][] = [['c', '°C'], ['f', '°F']];
  const winds: [WindUnit, string][] = [['ms', 'm/s'], ['kmh', 'km/h'], ['mph', 'mph']];
  const precips: [PrecipUnit, string][] = [['mm', 'mm'], ['in', 'in']];
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} onclick={(e) => e.target === dialog && dialog.close()}>
  <div class="inner">
    <header>
      <h2>{t('settings')}</h2>
      <button class="icon-btn" aria-label={t('close')} onclick={() => dialog.close()}>✕</button>
    </header>

    <fieldset>
      <legend>{t('language')}</legend>
      <div class="seg">
        {#each langs as [v, label] (v)}
          <label><input type="radio" name="lang" value={v} bind:group={settings.lang} /><span>{label}</span></label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>{t('temperature')}</legend>
      <div class="seg">
        {#each temps as [v, label] (v)}
          <label><input type="radio" name="temp" value={v} bind:group={settings.units.temp} /><span>{label}</span></label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>{t('wind')}</legend>
      <div class="seg">
        {#each winds as [v, label] (v)}
          <label><input type="radio" name="wind" value={v} bind:group={settings.units.wind} /><span>{label}</span></label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>{t('precipitation')}</legend>
      <div class="seg">
        {#each precips as [v, label] (v)}
          <label><input type="radio" name="precip" value={v} bind:group={settings.units.precip} /><span>{label}</span></label>
        {/each}
      </div>
    </fieldset>

    <section>
      <h3>{t('savedPlaces')}</h3>
      {#if settings.places.length}
        <ul class="places">
          {#each settings.places as p, i (p.id)}
            <li>
              <button class="name" onclick={() => { onshow(p); dialog.close(); }}>
                {p.name}{#if p.detail}<small>{p.detail}</small>{/if}
              </button>
              <button class="mini" aria-label="{t('moveUp')}: {p.name}" title={t('moveUp')} disabled={i === 0} onclick={() => movePlace(p.id, -1)}>↑</button>
              <button class="mini" aria-label="{t('moveDown')}: {p.name}" title={t('moveDown')} disabled={i === settings.places.length - 1} onclick={() => movePlace(p.id, 1)}>↓</button>
              <button class="mini del" aria-label="{t('remove')}: {p.name}" title={t('remove')} onclick={() => toggleSaved(p)}>✕</button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="hint">{t('noSavedPlaces')}</p>
      {/if}
    </section>
  </div>
</dialog>

<style>
  dialog {
    width: min(440px, calc(100vw - 32px));
    max-height: calc(100dvh - 48px);
    padding: 0;
    border: 1px solid var(--card-border);
    border-radius: 20px;
    background: var(--popup);
    color: var(--fg);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  dialog::backdrop { background: rgba(2, 6, 23, 0.55); backdrop-filter: blur(3px); }
  .inner { padding: 16px 18px 20px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h2 { margin: 0; font-size: 20px; }
  h3 { margin: 18px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }

  fieldset { border: 0; padding: 0; margin: 16px 0 0; }
  legend { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 6px; padding: 0; }
  .seg { display: flex; background: var(--input); border-radius: 12px; padding: 3px; gap: 3px; }
  .seg label { flex: 1; position: relative; }
  .seg input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
  .seg span { display: block; text-align: center; padding: 8px 6px; border-radius: 9px; }
  .seg input:checked + span { background: var(--fg); color: #1e3a8a; font-weight: 600; }
  .seg input:focus-visible + span { outline: 2px solid var(--accent); }

  .places { list-style: none; margin: 0; padding: 0; }
  .places li { display: flex; align-items: center; gap: 4px; padding: 2px 0; }
  .places li + li { border-top: 1px solid var(--card-border); }
  .name { flex: 1; min-width: 0; text-align: left; border: 0; background: none; padding: 8px 6px; border-radius: 8px; cursor: pointer; }
  .name:hover { background: var(--hover); }
  .name small { display: block; color: var(--muted); }
  .mini { flex: none; width: 36px; height: 36px; border: 0; border-radius: 9px; background: var(--input); cursor: pointer; }
  .mini:disabled { opacity: 0.3; cursor: default; }
  .mini:not(:disabled):hover { background: rgba(255, 255, 255, 0.28); }
  .del:hover { background: rgba(248, 113, 113, 0.5) !important; }
  .hint { color: var(--muted); margin: 0; font-size: 14px; }
</style>
