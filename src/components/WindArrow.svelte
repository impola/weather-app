<script lang="ts">
  // An arrow pointing where the wind blows TO (the direction value says where it comes FROM).
  let { deg, size = 14 }: { deg: number; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style="transform: rotate({deg + 180}deg)">
  <path d="M8 1 L13 13 L8 10 L3 13 Z" fill="currentColor" />
</svg>

<style>
  svg { flex: none; display: inline-block; vertical-align: -2px; }
</style>
