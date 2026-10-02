<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { content } from '#lib/stores/content.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import {
		filterTopics,
		filtersFromParams,
		filtersToParams,
		groupByCategory,
		sortTopics,
		uniqueCategories,
		uniqueTags,
		type TopicFilters
	} from '#lib/utils/filter.ts';
	import { todayISO } from '#lib/utils/dates.ts';
	import { plural } from '#lib/utils/labels.ts';
	import { slugify } from '#lib/utils/slug.ts';
	import ContentGate from '#lib/components/ContentGate.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import TopicCard from '#lib/components/TopicCard.svelte';
	import StateMessage from '#lib/components/StateMessage.svelte';

	// The URL is the single source of truth for filters, so they survive a refresh
	// and can be bookmarked. `page.url` is reactive, so this $derived re-runs on navigation.
	const filters = $derived(filtersFromParams(page.url.searchParams));

	const categories = $derived(uniqueCategories(content.topics));
	const tags = $derived(uniqueTags(content.topics));
	const visible = $derived(
		sortTopics(filterTopics(content.topics, progress.map, filters), progress.map, filters.sort)
	);
	const groups = $derived(groupByCategory(visible));
	const today = todayISO();

	function applyFilters(next: TopicFilters) {
		const query = filtersToParams(next).toString();
		// replace: don't create a history entry per keystroke.
		// reset: false keeps focus in the search box and the scroll position as is.
		goto(resolve(query ? `/topics?${query}` : '/topics'), { replace: true, reset: false });
	}
</script>

<svelte:head><title>Topics · Knowledge Tracker</title></svelte:head>

<h1 class="sr-only">Topics</h1>

<ContentGate>
	<div class="space-y-4">
		<FilterBar {filters} {categories} {tags} onchange={applyFilters} />

		<p class="text-xs text-muted" aria-live="polite">
			{visible.length}/{plural(content.topics.length, 'topic')}
		</p>

		{#if visible.length === 0}
			<StateMessage kind="empty" title="no topics match these filters" />
		{:else}
			{#each groups as group (group.category)}
				<section aria-labelledby="cat-{slugify(group.category)}" class="box">
					<h2 id="cat-{slugify(group.category)}" class="box-head">
						{group.category} <span>({group.topics.length})</span>
					</h2>
					<ul class="divide-y divide-line">
						{#each group.topics as topic (topic.id)}
							<li>
								<TopicCard {topic} progress={progress.get(topic.id)} {today} />
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		{/if}
	</div>
</ContentGate>
