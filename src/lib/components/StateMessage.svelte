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
	class="box px-3 py-4 text-xs {kind === 'error' ? 'border-danger' : ''}"
	role={kind === 'error' ? 'alert' : 'status'}
>
	<p class={kind === 'error' ? 'text-danger' : 'text-muted'}>
		{kind === 'error' ? 'error: ' : ''}{title}
	</p>
	{#if children}
		<div class="mt-2 text-muted">{@render children()}</div>
	{/if}
</div>
