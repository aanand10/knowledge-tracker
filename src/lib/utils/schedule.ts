import type { Rating, TopicProgress } from '#lib/types/index.ts';
import { addDays } from './dates';

/** Review intervals in days. Each "OK" moves one step along this list. */
export const INTERVALS = [1, 3, 7, 14, 30] as const;

/** How many review dates we keep per topic (enough for streaks and weekly stats). */
export const HISTORY_LIMIT = 60;

/**
 * Pick the next position in INTERVALS.
 * - hard: back to the start (review tomorrow)
 * - ok:   one step forward
 * - easy: two steps forward (skips one interval)
 * The step is clamped to the last interval, so mastered topics repeat every 30 days.
 */
export function nextIntervalStep(currentStep: number, rating: Rating): number {
	const last = INTERVALS.length - 1;
	const current = Math.max(-1, Math.min(currentStep, last));
	switch (rating) {
		case 'hard':
			return 0;
		case 'ok':
			return Math.min(current + 1, last);
		case 'easy':
			return Math.min(current + 2, last);
	}
}

/** Days until the next review for a given rating (handy for button labels). */
export function intervalFor(currentStep: number, rating: Rating): number {
	return INTERVALS[nextIntervalStep(currentStep, rating)] ?? 1;
}

/**
 * Pure function: given the current progress, a rating and today's date,
 * return the NEW progress. It never mutates its input, which makes it easy to test.
 */
export function scheduleReview(
	progress: TopicProgress,
	rating: Rating,
	today: string
): TopicProgress {
	const intervalStep = nextIntervalStep(progress.intervalStep, rating);
	const days = INTERVALS[intervalStep] ?? 1;
	return {
		...progress,
		// Reviewing something means you've at least started learning it.
		status: progress.status === 'not-started' ? 'learning' : progress.status,
		intervalStep,
		lastReviewed: today,
		nextReview: addDays(today, days),
		reviewCount: progress.reviewCount + 1,
		history: [...progress.history, today].slice(-HISTORY_LIMIT)
	};
}
