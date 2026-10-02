import { describe, expect, it } from 'vitest';
import { defaultProgress, type TopicProgress } from '#lib/types/index.ts';
import { INTERVALS, intervalFor, nextIntervalStep, scheduleReview } from './schedule';

const TODAY = '2026-03-10';

function withStep(intervalStep: number): TopicProgress {
	return { ...defaultProgress(), intervalStep, reviewCount: intervalStep + 1 };
}

describe('nextIntervalStep', () => {
	it('hard always resets to the first step', () => {
		expect(nextIntervalStep(-1, 'hard')).toBe(0);
		expect(nextIntervalStep(3, 'hard')).toBe(0);
	});

	it('ok moves one step forward', () => {
		expect(nextIntervalStep(-1, 'ok')).toBe(0);
		expect(nextIntervalStep(0, 'ok')).toBe(1);
		expect(nextIntervalStep(2, 'ok')).toBe(3);
	});

	it('easy skips one step', () => {
		expect(nextIntervalStep(-1, 'easy')).toBe(1);
		expect(nextIntervalStep(1, 'easy')).toBe(3);
	});

	it('clamps at the last interval', () => {
		const last = INTERVALS.length - 1;
		expect(nextIntervalStep(last, 'ok')).toBe(last);
		expect(nextIntervalStep(last - 1, 'easy')).toBe(last);
		expect(nextIntervalStep(99, 'ok')).toBe(last);
	});

	it('treats corrupt negative steps as "never reviewed"', () => {
		expect(nextIntervalStep(-50, 'ok')).toBe(0);
	});
});

describe('intervalFor', () => {
	it('walks the 1, 3, 7, 14, 30 sequence on OK', () => {
		const days: number[] = [];
		let step = -1;
		for (let i = 0; i < 6; i++) {
			days.push(intervalFor(step, 'ok'));
			step = nextIntervalStep(step, 'ok');
		}
		expect(days).toEqual([1, 3, 7, 14, 30, 30]);
	});
});

describe('scheduleReview', () => {
	it('schedules hard for tomorrow', () => {
		const next = scheduleReview(withStep(3), 'hard', TODAY);
		expect(next.nextReview).toBe('2026-03-11');
		expect(next.intervalStep).toBe(0);
	});

	it('schedules the first OK review for tomorrow, the second in 3 days', () => {
		const first = scheduleReview(defaultProgress(), 'ok', TODAY);
		expect(first.nextReview).toBe('2026-03-11');
		const second = scheduleReview(first, 'ok', '2026-03-11');
		expect(second.nextReview).toBe('2026-03-14');
	});

	it('schedules easy one interval ahead', () => {
		expect(scheduleReview(defaultProgress(), 'easy', TODAY).nextReview).toBe('2026-03-13'); // 3 days
		expect(scheduleReview(withStep(1), 'easy', TODAY).nextReview).toBe('2026-03-24'); // 14 days
	});

	it('crosses month and year boundaries', () => {
		expect(scheduleReview(withStep(3), 'ok', '2026-12-20').nextReview).toBe('2027-01-19');
	});

	it('updates bookkeeping fields', () => {
		const next = scheduleReview(defaultProgress(), 'ok', TODAY);
		expect(next.lastReviewed).toBe(TODAY);
		expect(next.reviewCount).toBe(1);
		expect(next.history).toEqual([TODAY]);
		expect(next.status).toBe('learning');
	});

	it('keeps a confident status', () => {
		const p = { ...defaultProgress(), status: 'confident' as const };
		expect(scheduleReview(p, 'hard', TODAY).status).toBe('confident');
	});

	it('does not mutate its input', () => {
		const p = defaultProgress();
		const copy = structuredClone(p);
		scheduleReview(p, 'easy', TODAY);
		expect(p).toEqual(copy);
	});

	it('caps the history length', () => {
		const p = { ...defaultProgress(), history: Array.from({ length: 60 }, () => '2026-01-01') };
		const next = scheduleReview(p, 'ok', TODAY);
		expect(next.history).toHaveLength(60);
		expect(next.history.at(-1)).toBe(TODAY);
	});
});
