<script lang="ts">
	import { theme } from '#lib/stores/theme.svelte.ts';

	const icons = { system: '◐', light: '☀', dark: '☾' } as const;
</script>

<button
	type="button"
	class="text-xs text-muted hover:text-fg"
	onclick={() => theme.cycle()}
	aria-label="Theme: {theme.preference}. Click to change."
>
	<span class="text-sm sm:hidden" aria-hidden="true">{icons[theme.preference]}</span>
	<span class="hidden sm:inline">theme:{theme.preference}</span>
</button>
