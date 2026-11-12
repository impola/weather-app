<script lang="ts" module>
  // Meteocons (MIT, Bas Milius), static fill variants: src/assets/wx/*.svg
  const files = import.meta.glob('../assets/wx/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
  const urls: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) urls[path.slice(path.lastIndexOf('/') + 1, -4)] = url;

  export function wxUrl(name: string): string {
    return urls[name] ?? urls['not-available'];
  }
</script>

<script lang="ts">
  let { name, size = 32, alt = '' }: { name: string; size?: number; alt?: string } = $props();
</script>

<img src={wxUrl(name)} width={size} height={size} {alt} aria-hidden={alt ? undefined : 'true'} draggable="false" />

<style>
  img { display: block; flex: none; }
</style>
