<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { content } from '#lib/stores/content.svelte.ts';
	import { loadExpandedGroups, saveExpandedGroups } from '#lib/stores/storage.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import {
		filterTopics,
		filtersFromParams,
		filtersToParams,
		groupTopics,
		hasActiveFilters,
		sortTopics,
		uniqueAreas,
		uniqueCategories,
		uniqueTags,
		type TopicFilters
	} from '#lib/utils/filter.ts';
	import { countStatuses, dueTopics } from '#lib/utils/stats.ts';
	import { greeting } from '#lib/utils/greeting.ts';
	import { plural } from '#lib/utils/labels.ts';
	import { cloud } from '#lib/stores/cloud.svelte.ts';
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
	const dueCount = $derived(dueTopics(content.topics, progress.map, today).length);

	// In "area" mode each group also has category sub-sections, which collapse on their own.
	const sections = $derived(
		groups.map((g) => ({
			...g,
			subs:
				filters.group === 'area'
					? groupTopics(g.topics, progress.map, 'category', { category: categories })
					: []
		}))
	);
	const subKey = (groupKey: string, sub: string) => `${groupKey}/${sub}`;
	const allKeys = $derived(
		sections.flatMap((g) => [g.key, ...g.subs.map((s) => subKey(g.key, s.key))])
	);

	// Everything starts collapsed. `expanded` remembers what you opened (saved in
	// localStorage), so the layout survives opening a topic and coming back.
	// SvelteSet is a reactive Set: adding/removing keys re-renders whatever reads it.
	const expanded = new SvelteSet<string>(loadExpandedGroups());
	$effect(() => {
		// Spreading the set reads every key, so this effect re-runs on each change.
		saveExpandedGroups([...expanded]);
	});

	// While searching or filtering, groups open automatically so matches are visible.
	// Clicks during a search flip groups via this throwaway set instead.
	const filtering = $derived(hasActiveFilters(filters));
	const flipped = new SvelteSet<string>();
	$effect(() => {
		void page.url.search; // re-run whenever the filters (URL) change…
		untrack(() => flipped.clear()); // …and reset the flips without depending on `flipped`
	});

	function isOpen(key: string): boolean {
		return filtering ? !flipped.has(key) : expanded.has(key);
	}

	function toggle(key: string) {
		const set = filtering ? flipped : expanded;
		if (set.has(key)) set.delete(key);
		else set.add(key);
	}

	const allOpen = $derived(allKeys.length > 0 && allKeys.every(isOpen));

	function toggleAll() {
		if (filtering) {
			if (allOpen) for (const k of allKeys) flipped.add(k);
			else flipped.clear();
		} else if (allOpen) {
			for (const k of allKeys) expanded.delete(k);
		} else {
			for (const k of allKeys) expanded.add(k);
		}
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
				{#if cloud.firstName}
					<!-- Personal touch once we know the user's name. -->
					<p class="text-sm text-muted">
						{greeting()}, <span class="text-fg">{cloud.firstName}</span>.
					</p>
				{/if}
				<h1 class="font-sans text-xl font-semibold">Topics</h1>
				<p class="text-xs text-muted">
					{content.topics.length} topics ·
					<span class="text-ok">{totals.confident} confident</span> ·
					<span class="text-warn">{totals.learning} learning</span> ·
					{totals['not-started']} to start
				</p>
			</div>
			<a class="text-xs link" href={resolve('/dashboard')}>
				{dueCount ? `${plural(dueCount, 'topic')} due today →` : 'due for review →'}
			</a>
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
			{#if allKeys.length > 0}
				<button type="button" class="hover:text-fg" onclick={toggleAll}>
					{allOpen ? '▾ collapse all' : '▸ expand all'}
				</button>
			{/if}
		</div>

		{#if visible.length === 0}
			<StateMessage kind="empty" title="no topics match these filters" />
		{:else}
			<div class="space-y-3">
				{#each sections as group (group.key)}
					{@const counts = countStatuses(group.topics, progress.map)}
					{@const open = isOpen(group.key)}
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
								onclick={() => toggle(group.key)}
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
								{#each group.subs as sub (sub.key)}
									{@const key = subKey(group.key, sub.key)}
									{@const subOpen = isOpen(key)}
									{@const subDone = countStatuses(sub.topics, progress.map).confident}
									<h3>
										<button
											type="button"
											class="flex w-full items-center gap-2 border-b border-line py-2 pr-3 pl-6 text-left text-xs hover:bg-panel"
											aria-expanded={subOpen}
											onclick={() => toggle(key)}
										>
											<span
												class="text-muted transition-transform {subOpen ? 'rotate-90' : ''}"
												aria-hidden="true">▸</span
											>
											<span class="flex-1 font-semibold tracking-wide text-muted uppercase"
												>{sub.label}</span
											>
											<span class="text-muted tabular-nums">
												<span class="text-ok">{subDone}</span>/{sub.topics.length}
											</span>
										</button>
									</h3>
									{#if subOpen}
										<ul class="divide-y divide-line border-b border-line pl-3">
											{#each sub.topics as topic (topic.id)}
												<li>
													<TopicCard
														{topic}
														progress={progress.get(topic.id)}
														{today}
														{hiddenTags}
													/>
												</li>
											{/each}
										</ul>
									{/if}
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
