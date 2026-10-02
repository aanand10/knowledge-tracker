import {
	PRIORITIES,
	STATUSES,
	type Priority,
	type ProgressMap,
	type Status,
	type Topic
} from '#lib/types/index.ts';
import { progressFor } from './progress';

export const SORT_KEYS = ['priority', 'next-review', 'confidence', 'title'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
	priority: 'priority',
	'next-review': 'next review',
	confidence: 'confidence (low first)',
	title: 'title'
};

export interface TopicFilters {
	/** Free-text search across title and tags. */
	q: string;
	category: string;
	status: Status | '';
	priority: Priority | '';
	tag: string;
	sort: SortKey;
}

export const DEFAULT_FILTERS: TopicFilters = {
	q: '',
	category: '',
	status: '',
	priority: '',
	tag: '',
	sort: 'priority'
};

/** Read filters from URL search params, ignoring unknown values. */
export function filtersFromParams(params: Pick<URLSearchParams, 'get'>): TopicFilters {
	const status = params.get('status') ?? '';
	const priority = params.get('priority') ?? '';
	const sort = params.get('sort') ?? '';
	return {
		q: params.get('q') ?? '',
		category: params.get('category') ?? '',
		status: STATUSES.includes(status as Status) ? (status as Status) : '',
		priority: PRIORITIES.includes(priority as Priority) ? (priority as Priority) : '',
		tag: params.get('tag') ?? '',
		sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_FILTERS.sort
	};
}

/** Write filters to URL search params, leaving out defaults to keep URLs short. */
export function filtersToParams(filters: TopicFilters): URLSearchParams {
	const params = new URLSearchParams();
	for (const key of Object.keys(DEFAULT_FILTERS) as (keyof TopicFilters)[]) {
		const value = filters[key].trim();
		if (value && value !== DEFAULT_FILTERS[key]) params.set(key, value);
	}
	return params;
}

export function hasActiveFilters(filters: TopicFilters): boolean {
	return Boolean(
		filters.q.trim() || filters.category || filters.status || filters.priority || filters.tag
	);
}

export function filterTopics(
	topics: Topic[],
	progress: ProgressMap,
	filters: TopicFilters
): Topic[] {
	const query = filters.q.trim().toLowerCase();
	return topics.filter((topic) => {
		if (filters.category && topic.category !== filters.category) return false;
		if (filters.priority && topic.priority !== filters.priority) return false;
		if (filters.tag && !topic.tags.includes(filters.tag)) return false;
		if (filters.status && progressFor(progress, topic.id).status !== filters.status) return false;
		if (query) {
			const haystack = [topic.title, ...topic.tags].join(' ').toLowerCase();
			if (!haystack.includes(query)) return false;
		}
		return true;
	});
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

/** Returns a NEW sorted array (doesn't mutate). Ties are broken by title. */
export function sortTopics(topics: Topic[], progress: ProgressMap, sort: SortKey): Topic[] {
	const byTitle = (a: Topic, b: Topic) => a.title.localeCompare(b.title);
	const compare: Record<SortKey, (a: Topic, b: Topic) => number> = {
		priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
		confidence: (a, b) =>
			progressFor(progress, a.id).confidence - progressFor(progress, b.id).confidence,
		// Earliest due first; never-scheduled topics go last.
		'next-review': (a, b) => {
			const da = progressFor(progress, a.id).nextReview;
			const db = progressFor(progress, b.id).nextReview;
			if (da === db) return 0;
			if (da === null) return 1;
			if (db === null) return -1;
			return da < db ? -1 : 1; // ISO dates sort correctly as strings
		},
		title: () => 0
	};
	return [...topics].sort((a, b) => compare[sort](a, b) || byTitle(a, b));
}

export interface CategoryGroup {
	category: string;
	topics: Topic[];
}

/** Group topics by category, keeping categories in first-seen order. */
export function groupByCategory(topics: Topic[]): CategoryGroup[] {
	const groups = new Map<string, Topic[]>();
	for (const topic of topics) {
		const list = groups.get(topic.category);
		if (list) list.push(topic);
		else groups.set(topic.category, [topic]);
	}
	return [...groups].map(([category, topics]) => ({ category, topics }));
}

/** Sorted unique values, used to build the filter dropdowns. */
export function uniqueCategories(topics: Topic[]): string[] {
	return [...new Set(topics.map((t) => t.category))];
}

export function uniqueTags(topics: Topic[]): string[] {
	return [...new Set(topics.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b));
}
