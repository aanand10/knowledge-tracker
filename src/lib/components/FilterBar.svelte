<script lang="ts">
	import { PRIORITIES, STATUSES } from '#lib/types/index.ts';
	import {
		DEFAULT_FILTERS,
		SORT_KEYS,
		SORT_LABELS,
		hasActiveFilters,
		type TopicFilters
	} from '#lib/utils/filter.ts';

	interface Props {
		filters: TopicFilters;
		categories: string[];
		tags: string[];
		/** Called with the full, updated filter object. The parent decides where to store it (the URL). */
		onchange: (filters: TopicFilters) => void;
	}

	let { filters, categories, tags, onchange }: Props = $props();

	function update(patch: Partial<TopicFilters>) {
		onchange({ ...filters, ...patch });
	}

	// Debounce typing so we don't rewrite the URL on every keystroke.
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	function onSearchInput(value: string) {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => update({ q: value }), 250);
	}

	const active = $derived(hasActiveFilters(filters));
</script>

<search class="space-y-2" aria-label="Filter topics">
	<div>
		<label for="topic-search" class="label">search</label>
		<input
			id="topic-search"
			type="search"
			class="input"
			placeholder="filter by title or #tag"
			autocomplete="off"
			value={filters.q}
			oninput={(e) => onSearchInput(e.currentTarget.value)}
		/>
	</div>

	<div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
		<div>
			<label for="filter-category" class="label">category</label>
			<select
				id="filter-category"
				class="input"
				value={filters.category}
				onchange={(e) => update({ category: e.currentTarget.value })}
			>
				<option value="">all</option>
				{#each categories as category (category)}
					<option value={category}>{category}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="filter-status" class="label">status</label>
			<select
				id="filter-status"
				class="input"
				value={filters.status}
				onchange={(e) => update({ status: e.currentTarget.value as TopicFilters['status'] })}
			>
				<option value="">all</option>
				{#each STATUSES as status (status)}
					<option value={status}>{status}</option>
				{/each}
			</select>
		</div>

		<div>
			<label for="filter-priority" class="label">priority</label>
			<select
				id="filter-priority"
				class="input"
				value={filters.priority}
				onchange={(e) => update({ priority: e.currentTarget.value as TopicFilters['priority'] })}
			>
				<option value="">all</option>
				{#each PRIORITIES as priority (priority)}
					<option value={priority}>{priority}</option>
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
				<option value="">all</option>
				{#each tags as tag (tag)}
					<option value={tag}>#{tag}</option>
				{/each}
			</select>
		</div>

		<div class="col-span-2 sm:col-span-1">
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
	</div>

	{#if active}
		<button
			type="button"
			class="btn"
			onclick={() => {
				clearTimeout(searchTimer);
				onchange({ ...DEFAULT_FILTERS, sort: filters.sort });
			}}
		>
			clear filters
		</button>
	{/if}
</search>
