import { describe, expect, it } from 'vitest';
import { defaultProgress, type ProgressMap, type Topic } from '#lib/types/index.ts';
import {
	DEFAULT_FILTERS,
	filterTopics,
	filtersFromParams,
	filtersToParams,
	groupByCategory,
	groupTopics,
	countBy,
	sortTopics,
	uniqueTags
} from './filter';

function topic(partial: Partial<Topic> & { id: string }): Topic {
	return {
		title: partial.id,
		category: 'JavaScript',
		priority: 'medium',
		tags: [],
		note: null,
		resources: [],
		...partial
	};
}

const topics: Topic[] = [
	topic({ id: 'closures', title: 'Closures', priority: 'high', tags: ['fundamentals'] }),
	topic({ id: 'event-loop', title: 'Event Loop', priority: 'high', tags: ['async'] }),
	topic({ id: 'keys', title: 'Keys', category: 'React', priority: 'low', tags: ['rendering'] }),
	topic({ id: 'hooks', title: 'Hooks', category: 'React', tags: ['fundamentals'] })
];

const progress: ProgressMap = {
	closures: { ...defaultProgress(), status: 'confident', confidence: 5, nextReview: '2026-03-20' },
	'event-loop': {
		...defaultProgress(),
		status: 'learning',
		confidence: 2,
		nextReview: '2026-03-01'
	},
	keys: { ...defaultProgress(), status: 'learning', confidence: 3 }
	// hooks: untouched → default progress
};

const ids = (list: Topic[]) => list.map((t) => t.id);

describe('filterTopics', () => {
	it('returns everything with default filters', () => {
		expect(filterTopics(topics, progress, DEFAULT_FILTERS)).toHaveLength(4);
	});

	it('searches title and tags, case-insensitively', () => {
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, q: 'LOOP' }))).toEqual([
			'event-loop'
		]);
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, q: 'fundament' }))).toEqual([
			'closures',
			'hooks'
		]);
	});

	it('filters by category, priority and tag', () => {
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, category: 'React' }))).toEqual([
			'keys',
			'hooks'
		]);
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, priority: 'low' }))).toEqual([
			'keys'
		]);
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, tag: 'async' }))).toEqual([
			'event-loop'
		]);
	});

	it('filters by status, treating untouched topics as not-started', () => {
		expect(
			ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, status: 'not-started' }))
		).toEqual(['hooks']);
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, status: 'learning' }))).toEqual(
			['event-loop', 'keys']
		);
	});

	it('combines filters with AND', () => {
		const result = filterTopics(topics, progress, {
			...DEFAULT_FILTERS,
			category: 'React',
			tag: 'fundamentals'
		});
		expect(ids(result)).toEqual(['hooks']);
	});
});

describe('sortTopics', () => {
	it('sorts by priority, then title', () => {
		expect(ids(sortTopics(topics, progress, 'priority'))).toEqual([
			'closures',
			'event-loop',
			'hooks',
			'keys'
		]);
	});

	it('sorts by next review with unscheduled topics last', () => {
		expect(ids(sortTopics(topics, progress, 'next-review'))).toEqual([
			'event-loop',
			'closures',
			'hooks',
			'keys'
		]);
	});

	it('sorts by confidence, lowest first', () => {
		expect(ids(sortTopics(topics, progress, 'confidence'))).toEqual([
			'hooks',
			'event-loop',
			'keys',
			'closures'
		]);
	});

	it('does not mutate the input', () => {
		const copy = [...topics];
		sortTopics(topics, progress, 'title');
		expect(topics).toEqual(copy);
	});
});

describe('URL params', () => {
	it('round-trips filters', () => {
		const filters = {
			...DEFAULT_FILTERS,
			q: 'loop',
			status: 'learning' as const,
			sort: 'title' as const
		};
		expect(filtersFromParams(filtersToParams(filters))).toEqual(filters);
	});

	it('omits defaults from the URL', () => {
		expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('');
	});

	it('ignores unknown values', () => {
		const f = filtersFromParams(new URLSearchParams('status=done&priority=urgent&sort=random'));
		expect(f).toEqual(DEFAULT_FILTERS);
	});
});

describe('grouping helpers', () => {
	it('groups by category in first-seen order', () => {
		const groups = groupByCategory(topics);
		expect(groups.map((g) => [g.category, g.topics.length])).toEqual([
			['JavaScript', 2],
			['React', 2]
		]);
	});

	it('lists unique sorted tags', () => {
		expect(uniqueTags(topics)).toEqual(['async', 'fundamentals', 'rendering']);
	});
});

describe('notes filter and search extras', () => {
	const withNotes = topics.map((t, i) => ({ ...t, note: i % 2 ? null : `notes/${t.id}.md` }));

	it('filters by whether a note exists', () => {
		expect(ids(filterTopics(withNotes, progress, { ...DEFAULT_FILTERS, notes: 'yes' }))).toEqual([
			'closures',
			'keys'
		]);
		expect(ids(filterTopics(withNotes, progress, { ...DEFAULT_FILTERS, notes: 'no' }))).toEqual([
			'event-loop',
			'hooks'
		]);
	});

	it('matches "#tag" queries and category names', () => {
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, q: '#async' }))).toEqual([
			'event-loop'
		]);
		expect(ids(filterTopics(topics, progress, { ...DEFAULT_FILTERS, q: 'react' }))).toEqual([
			'keys',
			'hooks'
		]);
	});

	it('round-trips group and notes through the URL', () => {
		const f = { ...DEFAULT_FILTERS, notes: 'yes' as const, group: 'round' as const };
		expect(filtersFromParams(filtersToParams(f))).toEqual(f);
		expect(filtersFromParams(new URLSearchParams('group=nope&notes=maybe'))).toEqual(
			DEFAULT_FILTERS
		);
	});
});

describe('groupTopics', () => {
	const labels = (g: { key: string; topics: Topic[] }[]) => g.map((x) => [x.key, ids(x.topics)]);

	it('groups by priority in high, medium, low order', () => {
		expect(labels(groupTopics(topics, progress, 'priority'))).toEqual([
			['high', ['closures', 'event-loop']],
			['medium', ['hooks']],
			['low', ['keys']]
		]);
	});

	it('groups by status with learning first', () => {
		expect(labels(groupTopics(topics, progress, 'status'))).toEqual([
			['learning', ['event-loop', 'keys']],
			['not-started', ['hooks']],
			['confident', ['closures']]
		]);
	});

	it('puts a topic in every round it is tagged for', () => {
		const tagged = [
			topic({ id: 'a', tags: ['round-1', 'round-2'] }),
			topic({ id: 'b', tags: ['round-2'] }),
			topic({ id: 'c', tags: [] })
		];
		expect(labels(groupTopics(tagged, {}, 'round'))).toEqual([
			['round-1', ['a']],
			['round-2', ['a', 'b']],
			['other', ['c']]
		]);
	});

	it('keeps first-seen order for categories and has a single group for none', () => {
		expect(groupTopics(topics, progress, 'category').map((g) => g.key)).toEqual([
			'JavaScript',
			'React'
		]);
		expect(groupTopics(topics, progress, 'none')).toHaveLength(1);
	});
});

describe('countBy', () => {
	it('counts single and multi-valued keys', () => {
		expect(countBy(topics, (t) => t.priority).get('high')).toBe(2);
		expect(countBy(topics, (t) => t.tags).get('fundamentals')).toBe(2);
	});
});

describe('groupTopics category order', () => {
	it('follows the given category order, not the sorted order', () => {
		const sorted = sortTopics(topics, progress, 'confidence'); // hooks (React) comes first
		expect(groupTopics(sorted, progress, 'category').map((g) => g.key)).toEqual([
			'React',
			'JavaScript'
		]);
		expect(
			groupTopics(sorted, progress, 'category', ['JavaScript', 'React']).map((g) => g.key)
		).toEqual(['JavaScript', 'React']);
	});
});
