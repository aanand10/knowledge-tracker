<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Topic, TopicProgress } from '#lib/types/index.ts';
	import { relativeDay } from '#lib/utils/dates.ts';
	import StatusBadge from './StatusBadge.svelte';
	import PriorityBadge from './PriorityBadge.svelte';
	import TopicTitle from './TopicTitle.svelte';

	interface Props {
		topic: Topic;
		progress: TopicProgress;
		today: string;
		/** Show the category (when the list isn't grouped by category). */
		showCategory?: boolean;
		/** Tags not worth repeating on every row (e.g. one shared by all topics). */
		hiddenTags?: string[];
	}

	let { topic, progress, today, showCategory = false, hiddenTags = [] }: Props = $props();

	const started = $derived(progress.status !== 'not-started' || progress.reviewCount > 0);
	const isDue = $derived(progress.nextReview !== null && progress.nextReview <= today);
	const tags = $derived(topic.tags.filter((t) => !hiddenTags.includes(t)));
	const hasNote = $derived(topic.note !== null);

	// A coloured left edge makes priority scannable at a glance.
	const edge = {
		high: 'border-l-danger',
		medium: 'border-l-link/60',
		low: 'border-l-line'
	} as const;
</script>

<!-- One list row. The whole row is a single link, so it's one tab stop. -->
<a
	href={resolve('/topics/[id]', { id: topic.id })}
	class="flex items-start gap-3 border-l-2 py-2.5 pr-3 pl-3 hover:bg-panel {edge[topic.priority]}"
>
	<div class="min-w-0 flex-1">
		<p class="font-sans text-sm font-medium {hasNote ? 'text-link' : 'text-muted'}">
			<TopicTitle title={topic.title} />
		</p>
		<p class="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted">
			<PriorityBadge priority={topic.priority} />
			{#if showCategory}<span>{topic.category}</span>{/if}
			{#if started}
				<span>conf {progress.confidence}/5</span>
			{/if}
			{#if progress.nextReview}
				<span class={isDue ? 'text-danger' : ''}
					>next {relativeDay(progress.nextReview, today)}</span
				>
			{/if}
			{#if !hasNote}<span class="italic">no note yet</span>{/if}
			{#each tags as tag (tag)}<span>#{tag}</span>{/each}
		</p>
	</div>
	<StatusBadge status={progress.status} />
</a>
