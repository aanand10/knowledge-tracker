import { describe, expect, it } from 'vitest';
import { defaultProgress, type ProgressMap, type Topic } from '#lib/types/index.ts';
import { countStatuses, dueTopics, reviewStreak, reviewsThisWeek, streakInfo } from './stats';

const TODAY = '2026-03-10';
const t = (id: string): Topic => ({
	id,
	title: id,
	category: 'C',
	area: 'C',
	priority: 'medium',
	tags: [],
	note: null,
	resources: []
});

describe('dueTopics', () => {
	it('returns due and overdue topics, most overdue first', () => {
		const progress: ProgressMap = {
			a: { ...defaultProgress(), nextReview: TODAY },
			b: { ...defaultProgress(), nextReview: '2026-03-07' },
			c: { ...defaultProgress(), nextReview: '2026-03-11' }
		};
		const due = dueTopics([t('a'), t('b'), t('c'), t('d')], progress, TODAY);
		expect(due.map((d) => [d.topic.id, d.daysOverdue])).toEqual([
			['b', 3],
			['a', 0]
		]);
	});
});

describe('countStatuses', () => {
	it('counts untouched topics as not-started', () => {
		const progress: ProgressMap = { a: { ...defaultProgress(), status: 'confident' } };
		expect(countStatuses([t('a'), t('b')], progress)).toEqual({
			'not-started': 1,
			learning: 0,
			confident: 1
		});
	});
});

describe('reviewsThisWeek', () => {
	it('counts reviews in the last 7 days including today', () => {
		const progress: ProgressMap = {
			a: { ...defaultProgress(), history: ['2026-03-03', '2026-03-04', TODAY] },
			b: { ...defaultProgress(), history: ['2026-03-09'] }
		};
		expect(reviewsThisWeek(progress, TODAY)).toBe(3);
	});
});

describe('reviewStreak', () => {
	const withHistory = (history: string[]): ProgressMap => ({
		a: { ...defaultProgress(), history }
	});

	it('is 0 with no reviews', () => {
		expect(reviewStreak({}, TODAY)).toBe(0);
	});

	it('counts consecutive days ending today', () => {
		expect(reviewStreak(withHistory(['2026-03-08', '2026-03-09', TODAY]), TODAY)).toBe(3);
	});

	it('keeps the streak alive if today has no review yet', () => {
		expect(reviewStreak(withHistory(['2026-03-08', '2026-03-09']), TODAY)).toBe(2);
	});

	it('breaks on a gap', () => {
		expect(reviewStreak(withHistory(['2026-03-07', TODAY]), TODAY)).toBe(1);
	});

	it('merges days across topics', () => {
		const progress: ProgressMap = {
			a: { ...defaultProgress(), history: [TODAY] },
			b: { ...defaultProgress(), history: ['2026-03-09'] }
		};
		expect(reviewStreak(progress, TODAY)).toBe(2);
	});
});

describe('streakInfo', () => {
	it('reports the streak and whether today is done', () => {
		const p = (history: string[]): ProgressMap => ({ a: { ...defaultProgress(), history } });
		expect(streakInfo(p(['2026-03-09', TODAY]), TODAY)).toEqual({ streak: 2, doneToday: true });
		expect(streakInfo(p(['2026-03-09']), TODAY)).toEqual({ streak: 1, doneToday: false });
		expect(streakInfo({}, TODAY)).toEqual({ streak: 0, doneToday: false });
	});
});
