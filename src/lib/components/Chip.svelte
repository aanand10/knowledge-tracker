<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		active: boolean;
		onclick: () => void;
		count?: number;
		/** Optional coloured dot before the label (a Tailwind bg-* class). */
		dot?: string;
		children: Snippet;
	}

	let { active, onclick, count, dot, children }: Props = $props();
</script>

<!-- aria-pressed tells screen readers this is a toggle that's on or off. -->
<button
	type="button"
	aria-pressed={active}
	{onclick}
	class="inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-1 text-xs whitespace-nowrap transition-colors {active
		? 'border-fg bg-fg text-bg'
		: 'border-line text-fg hover:border-muted hover:bg-panel'}"
>
	{#if dot}<span class="size-1.5 rounded-full {dot}" aria-hidden="true"></span>{/if}
	{@render children()}
	{#if count !== undefined}
		<span class="tabular-nums {active ? 'opacity-70' : 'text-muted'}">{count}</span>
	{/if}
</button>
