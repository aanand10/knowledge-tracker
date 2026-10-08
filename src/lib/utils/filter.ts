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

export const GROUP_KEYS = ['area', 'category', 'priority', 'status', 'round', 'none'] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const NOTE_FILTERS = ['', 'yes', 'no'] as const;
export type NoteFilter = (typeof NOTE_FILTERS)[number];

export interface TopicFilters {
	/** Free-text search across title, category and tags ("#tag" works too). */
	q: string;
	area: string;
	category: string;
	status: Status | '';
	priority: Priority | '';
	tag: string;
	/** '' = all, 'yes' = only topics with a written note, 'no' = only topics without one. */
	notes: NoteFilter;
	sort: SortKey;
	group: GroupKey;
}

export const DEFAULT_FILTERS: TopicFilters = {
	q: '',
	area: '',
	category: '',
	status: '',
	priority: '',
	tag: '',
	notes: '',
	sort: 'priority',
	group: 'area'
};

/** Read filters from URL search params, ignoring unknown values. */
export function filtersFromParams(params: Pick<URLSearchParams, 'get'>): TopicFilters {
	const status = params.get('status') ?? '';
	const priority = params.get('priority') ?? '';
	const sort = params.get('sort') ?? '';
	const notes = params.get('notes') ?? '';
	const group = params.get('group') ?? '';
	return {
		q: params.get('q') ?? '',
		area: params.get('area') ?? '',
		category: params.get('category') ?? '',
		status: STATUSES.includes(status as Status) ? (status as Status) : '',
		priority: PRIORITIES.includes(priority as Priority) ? (priority as Priority) : '',
		tag: params.get('tag') ?? '',
		notes: NOTE_FILTERS.includes(notes as NoteFilter) ? (notes as NoteFilter) : '',
		sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_FILTERS.sort,
		group: GROUP_KEYS.includes(group as GroupKey) ? (group as GroupKey) : DEFAULT_FILTERS.group
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
		filters.q.trim() ||
		filters.category ||
		filters.status ||
		filters.priority ||
		filters.tag ||
		filters.notes
	);
}

export function filterTopics(
	topics: Topic[],
	progress: ProgressMap,
	filters: TopicFilters
): Topic[] {
	// Every word must match somewhere, in any order: "loop event" finds "Event loop".
	const words = filters.q
		.toLowerCase()
		.split(/\s+/)
		.map((word) => word.replace(/^#/, ''))
		.filter(Boolean);
	return topics.filter((topic) => {
		if (filters.area && topic.area !== filters.area) return false;
		if (filters.category && topic.category !== filters.category) return false;
		if (filters.priority && topic.priority !== filters.priority) return false;
		if (filters.tag && !topic.tags.includes(filters.tag)) return false;
		if (filters.notes === 'yes' && topic.note === null) return false;
		if (filters.notes === 'no' && topic.note !== null) return false;
		if (filters.status && progressFor(progress, topic.id).status !== filters.status) return false;
		if (words.length) {
			const haystack = [topic.title, topic.category, topic.area, ...topic.tags]
				.join(' ')
				.toLowerCase();
			if (!words.every((word) => haystack.includes(word))) return false;
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

export function uniqueAreas(topics: Topic[]): string[] {
	return [...new Set(topics.map((t) => t.area))];
}

export function uniqueTags(topics: Topic[]): string[] {
	return [...new Set(topics.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b));
}

export interface TopicGroup {
	key: string;
	label: string;
	topics: Topic[];
}

const ROUND_LABELS: Record<string, string> = {
	'round-1': 'Round 1 · JavaScript + Web',
	'round-2': 'Round 2 · UI tech + machine coding',
	'round-3': 'Round 3 · Hiring manager',
	jd: 'From the JD'
};

/**
 * Group already-filtered, already-sorted topics. Order inside each group is kept.
 * In "round" mode a topic tagged for two rounds appears in both groups.
 */
export function groupTopics(
	topics: Topic[],
	progress: ProgressMap,
	group: GroupKey,
	/** Group order for categories/areas (e.g. topics.json order); defaults to first-seen order. */
	orders: { category?: string[]; area?: string[] } = {}
): TopicGroup[] {
	const groups = new Map<string, TopicGroup>();
	const add = (key: string, label: string, topic: Topic) => {
		const existing = groups.get(key);
		if (existing) existing.topics.push(topic);
		else groups.set(key, { key, label, topics: [topic] });
	};
	const order: Record<GroupKey, string[]> = {
		area: orders.area ?? [],
		category: orders.category ?? [],
		priority: [...PRIORITIES],
		status: ['learning', 'not-started', 'confident'],
		round: [...Object.keys(ROUND_LABELS), 'other'],
		none: ['all']
	};

	for (const topic of topics) {
		switch (group) {
			case 'area':
				add(topic.area, topic.area, topic);
				break;
			case 'category':
				add(topic.category, topic.category, topic);
				break;
			case 'priority':
				add(topic.priority, `${topic.priority} priority`, topic);
				break;
			case 'status': {
				const status = progressFor(progress, topic.id).status;
				add(status, status, topic);
				break;
			}
			case 'round': {
				const rounds = topic.tags.filter((t) => t in ROUND_LABELS);
				if (rounds.length === 0) add('other', 'Other', topic);
				for (const r of rounds) add(r, ROUND_LABELS[r] ?? r, topic);
				break;
			}
			case 'none':
				add('all', 'All topics', topic);
		}
	}
	const rank = (key: string) => {
		const i = order[group].indexOf(key);
		return i === -1 ? Number.MAX_SAFE_INTEGER : i;
	};
	// Area/category keep first-seen order (stable sort with equal ranks); the rest use `order`.
	return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key));
}

/** How many topics have each value of `key`, for the counts shown on filter chips. */
export function countBy<T extends string>(
	items: Topic[],
	key: (t: Topic) => T | T[]
): Map<T, number> {
	const counts = new Map<T, number>();
	for (const item of items) {
		const value = key(item);
		for (const v of Array.isArray(value) ? value : [value]) counts.set(v, (counts.get(v) ?? 0) + 1);
	}
	return counts;
}
