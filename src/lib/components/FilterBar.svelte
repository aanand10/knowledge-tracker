<script lang="ts">
	import { PRIORITIES, STATUSES, type ProgressMap, type Topic } from '#lib/types/index.ts';
	import {
		DEFAULT_FILTERS,
		GROUP_KEYS,
		SORT_KEYS,
		SORT_LABELS,
		countBy,
		hasActiveFilters,
		type TopicFilters
	} from '#lib/utils/filter.ts';
	import { progressFor } from '#lib/utils/progress.ts';
	import Chip from './Chip.svelte';

	interface Props {
		filters: TopicFilters;
		/** All topics (unfiltered), used for the counts on each chip. */
		topics: Topic[];
		progress: ProgressMap;
		categories: string[];
		tags: string[];
		/** Called with the full, updated filter object. The parent decides where to store it (the URL). */
		onchange: (filters: TopicFilters) => void;
	}

	let { filters, topics, progress, categories, tags, onchange }: Props = $props();

	function update(patch: Partial<TopicFilters>) {
		onchange({ ...filters, ...patch });
	}

	/** Clicking the active chip again turns it off (back to "all"). */
	function toggle<K extends 'category' | 'status' | 'priority' | 'notes'>(
		key: K,
		value: TopicFilters[K]
	) {
		update({ [key]: filters[key] === value ? '' : value } as Partial<TopicFilters>);
	}

	// Chip counts over ALL topics, so numbers don't jump around while you filter.
	const byPriority = $derived(countBy(topics, (t) => t.priority));
	const byStatus = $derived(countBy(topics, (t) => progressFor(progress, t.id).status));
	const byCategory = $derived(countBy(topics, (t) => t.category));
	const withNotes = $derived(topics.filter((t) => t.note !== null).length);

	// Debounce typing so we don't rewrite the URL on every keystroke.
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let searchInput = $state<HTMLInputElement>();
	let typed = $state<string | null>(null); // what's in the box before the debounce fires

	function onSearchInput(value: string) {
		typed = value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			typed = null;
			update({ q: value });
		}, 200);
	}

	function clearSearch() {
		clearTimeout(searchTimer);
		typed = null;
		update({ q: '' });
		searchInput?.focus();
	}

	// Press "/" anywhere (outside a text field) to jump to search, like GitHub.
	function onWindowKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
		if (event.key === '/' && !typing) {
			event.preventDefault();
			searchInput?.focus();
		} else if (event.key === 'Escape' && target === searchInput && (typed ?? filters.q)) {
			clearSearch();
		}
	}

	const active = $derived(hasActiveFilters(filters));
	const priorityDot = { high: 'bg-danger', medium: 'bg-link', low: 'bg-muted' } as const;
	const statusDot = { 'not-started': 'bg-muted', learning: 'bg-warn', confident: 'bg-ok' } as const;
</script>

<svelte:window onkeydown={onWindowKeydown} />

<search class="space-y-3" aria-label="Filter topics">
	<div class="relative">
		<svg
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="7" />
			<path d="m20 20-3.5-3.5" />
		</svg>
		<label for="topic-search" class="sr-only">Search topics</label>
		<input
			bind:this={searchInput}
			id="topic-search"
			type="search"
			class="input min-h-11 pr-10 pl-9 sm:text-sm"
			placeholder="Search title, category or #tag"
			autocomplete="off"
			value={typed ?? filters.q}
			oninput={(e) => onSearchInput(e.currentTarget.value)}
		/>
		{#if typed ?? filters.q}
			<button
				type="button"
				class="absolute top-1/2 right-2 -translate-y-1/2 px-1.5 text-muted hover:text-fg"
				aria-label="Clear search"
				onclick={clearSearch}>✕</button
			>
		{:else}
			<kbd
				class="absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-sm border border-line px-1.5 text-xs text-muted sm:block"
				aria-hidden="true">/</kbd
			>
		{/if}
	</div>

	<!-- Each row is a group of toggle chips. role="group" + aria-label names the group for screen readers. -->
	<div class="grid gap-2 text-xs sm:grid-cols-[5rem_1fr] sm:items-start">
		<span class="pt-1 text-muted" id="f-priority">priority</span>
		<div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="f-priority">
			{#each PRIORITIES as p (p)}
				<Chip
					active={filters.priority === p}
					onclick={() => toggle('priority', p)}
					count={byPriority.get(p) ?? 0}
					dot={priorityDot[p]}>{p}</Chip
				>
			{/each}
		</div>

		<span class="pt-1 text-muted" id="f-status">status</span>
		<div class="flex flex-wrap gap-1.5" role="group" aria-labelledby="f-status">
			{#each STATUSES as s (s)}
				<Chip
					active={filters.status === s}
					onclick={() => toggle('status', s)}
					count={byStatus.get(s) ?? 0}
					dot={statusDot[s]}>{s}</Chip
				>
			{/each}
			<span class="mx-1 w-px self-stretch bg-line" aria-hidden="true"></span>
			<Chip
				active={filters.notes === 'yes'}
				onclick={() => toggle('notes', 'yes')}
				count={withNotes}>has notes</Chip
			>
			<Chip
				active={filters.notes === 'no'}
				onclick={() => toggle('notes', 'no')}
				count={topics.length - withNotes}>no notes</Chip
			>
		</div>

		<span class="pt-1 text-muted" id="f-category">category</span>
		<!-- Scrolls sideways on phones instead of wrapping into a tall block. -->
		<div
			class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
			role="group"
			aria-labelledby="f-category"
		>
			{#each categories as c (c)}
				<Chip
					active={filters.category === c}
					onclick={() => toggle('category', c)}
					count={byCategory.get(c) ?? 0}>{c}</Chip
				>
			{/each}
		</div>
	</div>

	<div
		class="flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-line pt-3 text-xs [&_select]:w-auto"
	>
		<div>
			<label for="filter-group" class="label">group by</label>
			<select
				id="filter-group"
				class="input"
				value={filters.group}
				onchange={(e) => update({ group: e.currentTarget.value as TopicFilters['group'] })}
			>
				{#each GROUP_KEYS as key (key)}
					<option value={key}>{key}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="filter-sort" class="label">sort</label>
			<select
				id="filter-sort"
				class="input"
				value={filters.sort}
				onchange={(e) => update({ sort: e.currentTarget.value as TopicFilters['sort'] })}
			>
				{#each SORT_KEYS as key (key)}
					<option value={key}>{SORT_LABELS[key]}</option>
				{/each}
			</select>
		</div>
		<div>
			<label for="filter-tag" class="label">tag</label>
			<select
				id="filter-tag"
				class="input"
				value={filters.tag}
				onchange={(e) => update({ tag: e.currentTarget.value })}
			>
				<option value="">any</option>
				{#each tags as tag (tag)}
					<option value={tag}>#{tag}</option>
				{/each}
			</select>
		</div>
		{#if active}
			<button
				type="button"
				class="ml-auto btn"
				onclick={() => {
					clearTimeout(searchTimer);
					typed = null;
					onchange({ ...DEFAULT_FILTERS, sort: filters.sort, group: filters.group });
				}}
			>
				✕ clear filters
			</button>
		{/if}
	</div>
</search>
