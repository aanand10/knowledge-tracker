<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		kind: 'loading' | 'error' | 'empty';
		title: string;
		/** Optional extra content. Snippets replace Svelte 4 slots. */
		children?: Snippet;
	}

	let { kind, title, children }: Props = $props();
</script>

<!-- role="alert" interrupts screen readers (errors); role="status" is polite. -->
<div
	class="flex flex-col items-center gap-2 card py-10 text-center"
	role={kind === 'error' ? 'alert' : 'status'}
>
	{#if kind === 'loading'}
		<span
			class="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 motion-reduce:animate-none"
			aria-hidden="true"
		></span>
	{/if}
	<p class="font-medium {kind === 'error' ? 'text-red-700 dark:text-red-400' : ''}">{title}</p>
	{#if children}
		<div class="text-sm text-slate-600 dark:text-slate-400">{@render children()}</div>
	{/if}
</div>
