<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Topic, TopicProgress } from '#lib/types/index.ts';
	import { relativeDay } from '#lib/utils/dates.ts';
	import StatusBadge from './StatusBadge.svelte';
	import PriorityBadge from './PriorityBadge.svelte';

	interface Props {
		topic: Topic;
		progress: TopicProgress;
		today: string;
		/** Show the category name (useful when the list isn't grouped by category). */
		showCategory?: boolean;
	}

	let { topic, progress, today, showCategory = false }: Props = $props();

	const isDue = $derived(progress.nextReview !== null && progress.nextReview <= today);
</script>

<!-- The whole card is one link, so it is a single tab stop for keyboard users. -->
<a
	href={resolve('/topics/[id]', { id: topic.id })}
	class="block card transition-colors hover:border-indigo-300 dark:hover:border-indigo-700"
>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			{#if showCategory}
				<p class="text-xs text-slate-500 dark:text-slate-400">{topic.category}</p>
			{/if}
			<h3 class="font-semibold text-balance">{topic.title}</h3>
		</div>
		<StatusBadge status={progress.status} />
	</div>

	<div class="mt-2 flex flex-wrap items-center gap-1.5">
		<PriorityBadge priority={topic.priority} />
		{#each topic.tags as tag (tag)}
			<span
				class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
			>
				#{tag}
			</span>
		{/each}
	</div>

	<dl class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
		<div class="flex gap-1">
			<dt>Confidence</dt>
			<dd class="font-medium text-slate-800 dark:text-slate-200">{progress.confidence}/5</dd>
		</div>
		<div class="flex gap-1">
			<dt>Next review</dt>
			<dd
				class={isDue
					? 'font-semibold text-red-600 dark:text-red-400'
					: 'font-medium text-slate-800 dark:text-slate-200'}
			>
				{progress.nextReview ? relativeDay(progress.nextReview, today) : 'not scheduled'}
			</dd>
		</div>
	</dl>
</a>
