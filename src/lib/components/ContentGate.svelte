<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { content } from '#lib/stores/content.svelte.ts';
	import StateMessage from './StateMessage.svelte';

	/**
	 * Shows loading / error / empty states for the content, and only renders
	 * `children` once topics are available. Every page wraps itself in this.
	 */
	let { children }: { children: Snippet } = $props();
</script>

{#if content.status === 'idle' || content.status === 'loading'}
	<StateMessage kind="loading" title="Loading topics…" />
{:else if content.status === 'error'}
	<StateMessage kind="error" title="Couldn't load your topics">
		<p>{content.error}</p>
		<button type="button" class="mt-3 btn-primary" onclick={() => content.reload()}
			>Try again</button
		>
	</StateMessage>
{:else if content.topics.length === 0}
	<StateMessage kind="empty" title="No topics yet">
		<p>
			Add entries to <code>topics.json</code> in your content repo, then reload it from
			<a class="text-indigo-600 underline dark:text-indigo-400" href={resolve('/settings')}
				>Settings</a
			>.
		</p>
	</StateMessage>
{:else}
	{@render children()}
{/if}
