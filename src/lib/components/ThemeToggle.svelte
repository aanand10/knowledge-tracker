<script lang="ts">
	import { theme } from '#lib/stores/theme.svelte.ts';
</script>

<button
	type="button"
	class="text-xs text-muted hover:text-fg"
	onclick={() => theme.cycle()}
	aria-label="Theme: {theme.preference}. Click to change."
>
	theme:{theme.preference}
</button>
