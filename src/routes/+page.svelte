<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import { content } from '#lib/stores/content.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import {
		filterTopics,
		filtersFromParams,
		filtersToParams,
		groupTopics,
		sortTopics,
		uniqueAreas,
		uniqueCategories,
		uniqueTags,
		type TopicFilters
	} from '#lib/utils/filter.ts';
	import { countStatuses } from '#lib/utils/stats.ts';
	import { todayISO } from '#lib/utils/dates.ts';
	import { slugify } from '#lib/utils/slug.ts';
	import ContentGate from '#lib/components/ContentGate.svelte';
	import FilterBar from '#lib/components/FilterBar.svelte';
	import TopicCard from '#lib/components/TopicCard.svelte';
	import StateMessage from '#lib/components/StateMessage.svelte';

	// The URL is the single source of truth for filters, so they survive a refresh
	// and can be bookmarked. `page.url` is reactive, so this $derived re-runs on navigation.
	const filters = $derived(filtersFromParams(page.url.searchParams));

	const areas = $derived(uniqueAreas(content.topics));
	const categories = $derived(uniqueCategories(content.topics));
	const tags = $derived(uniqueTags(content.topics));
	// A tag every topic has (e.g. a shared "company" tag) adds nothing on each row, so hide it there.
	const hiddenTags = $derived(tags.filter((t) => content.topics.every((x) => x.tags.includes(t))));
	const visible = $derived(
		sortTopics(filterTopics(content.topics, progress.map, filters), progress.map, filters.sort)
	);
	const groups = $derived(
		groupTopics(visible, progress.map, filters.group, { category: categories, area: areas })
	);
	const totals = $derived(countStatuses(content.topics, progress.map));
	const today = todayISO();

	// SvelteSet is a reactive Set: adding/removing keys re-renders whatever reads it.
	const collapsed = new SvelteSet<string>();
	const allCollapsed = $derived(groups.length > 0 && groups.every((g) => collapsed.has(g.key)));

	function toggleGroup(key: string) {
		if (collapsed.has(key)) collapsed.delete(key);
		else collapsed.add(key);
	}

	function toggleAll() {
		if (allCollapsed) collapsed.clear();
		else for (const g of groups) collapsed.add(g.key);
	}

	function applyFilters(next: TopicFilters) {
		const query = filtersToParams(next).toString();
		// replace: don't create a history entry per keystroke.
		// reset: false keeps focus in the search box and the scroll position as is.
		goto(resolve(query ? `/?${query}` : '/'), { replace: true, reset: false });
	}
</script>

<svelte:head><title>Topics · Knowledge Tracker</title></svelte:head>

<ContentGate>
	<div class="space-y-5">
		<header class="flex flex-wrap items-end justify-between gap-2">
			<div>
				<h1 class="font-sans text-xl font-semibold">Topics</h1>
				<p class="text-xs text-muted">
					{content.topics.length} topics ·
					<span class="text-ok">{totals.confident} confident</span> ·
					<span class="text-warn">{totals.learning} learning</span> ·
					{totals['not-started']} to start
				</p>
			</div>
			<a class="text-xs link" href={resolve('/dashboard')}>due for review →</a>
		</header>

		<FilterBar
			{filters}
			topics={content.topics}
			progress={progress.map}
			{areas}
			{categories}
			{tags}
			onchange={applyFilters}
		/>

		<div class="flex items-center justify-between text-xs text-muted">
			<p aria-live="polite">
				showing <span class="text-fg">{visible.length}</span> of {content.topics.length}
			</p>
			{#if groups.length > 1}
				<button type="button" class="hover:text-fg" onclick={toggleAll}>
					{allCollapsed ? 'expand all' : 'collapse all'}
				</button>
			{/if}
		</div>

		{#if visible.length === 0}
			<StateMessage kind="empty" title="no topics match these filters" />
		{:else}
			<div class="space-y-3">
				{#each groups as group (group.key)}
					{@const counts = countStatuses(group.topics, progress.map)}
					{@const open = !collapsed.has(group.key)}
					{@const done = group.topics.length ? counts.confident / group.topics.length : 0}
					{@const going = group.topics.length ? counts.learning / group.topics.length : 0}
					<section class="box" aria-labelledby="grp-{slugify(group.key)}">
						<h2 id="grp-{slugify(group.key)}">
							<!-- A real <button> in the heading: keyboard and screen-reader friendly. -->
							<button
								type="button"
								class="flex w-full items-center gap-3 bg-panel px-3 py-2 text-left hover:bg-line/40 {open
									? 'border-b border-line'
									: ''}"
								aria-expanded={open}
								onclick={() => toggleGroup(group.key)}
							>
								<span
									class="text-muted transition-transform {open ? 'rotate-90' : ''}"
									aria-hidden="true">▸</span
								>
								<span class="min-w-0 flex-1 truncate text-sm font-semibold">{group.label}</span>
								<span class="hidden h-1.5 w-24 overflow-hidden bg-line sm:flex" aria-hidden="true">
									<span class="bg-ok" style:width="{done * 100}%"></span>
									<span class="bg-warn" style:width="{going * 100}%"></span>
								</span>
								<span class="text-xs text-muted tabular-nums">
									<span class="text-ok">{counts.confident}</span>/{group.topics.length}
								</span>
							</button>
						</h2>
						{#if open}
							{#if filters.group === 'area'}
								<!-- Inside an area, list each category as a small sub-heading. -->
								{#each groupTopics( group.topics, progress.map, 'category', { category: categories } ) as sub (sub.key)}
									<h3
										class="border-b border-line px-3 pt-2.5 pb-1 text-xs font-semibold tracking-wide text-muted uppercase"
									>
										{sub.label} <span class="font-normal">({sub.topics.length})</span>
									</h3>
									<ul class="divide-y divide-line border-b border-line last:border-b-0">
										{#each sub.topics as topic (topic.id)}
											<li>
												<TopicCard {topic} progress={progress.get(topic.id)} {today} {hiddenTags} />
											</li>
										{/each}
									</ul>
								{/each}
							{:else}
								<ul class="divide-y divide-line">
									{#each group.topics as topic (topic.id)}
										<li>
											<TopicCard
												{topic}
												progress={progress.get(topic.id)}
												{today}
												{hiddenTags}
												showCategory={filters.group !== 'category'}
											/>
										</li>
									{/each}
								</ul>
							{/if}
						{/if}
					</section>
				{/each}
			</div>
		{/if}
	</div>
</ContentGate>
