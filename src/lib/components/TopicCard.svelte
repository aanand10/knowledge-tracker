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
	}

	let { topic, progress, today }: Props = $props();

	const isDue = $derived(progress.nextReview !== null && progress.nextReview <= today);
</script>

<!-- One list row. The whole row is a single link, so it's one tab stop. -->
<a href={resolve('/topics/[id]', { id: topic.id })} class="block px-3 py-2 hover:bg-panel">
	<div class="flex items-baseline justify-between gap-3">
		<span class="font-sans text-sm font-medium text-link">{topic.title}</span>
		<StatusBadge status={progress.status} />
	</div>
	<div class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
		<PriorityBadge priority={topic.priority} />
		<span>conf {progress.confidence}/5</span>
		<span class={isDue ? 'text-danger' : ''}>
			next: {progress.nextReview ? relativeDay(progress.nextReview, today) : '-'}
		</span>
		{#if topic.tags.length}
			<span>{topic.tags.map((t) => `#${t}`).join(' ')}</span>
		{/if}
	</div>
</a>
