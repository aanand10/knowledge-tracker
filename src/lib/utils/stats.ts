import {
	STATUSES,
	type ProgressMap,
	type Status,
	type Topic,
	type TopicProgress
} from '#lib/types/index.ts';
import { addDays, daysBetween } from './dates';
import { progressFor } from './progress';

export type StatusCounts = Record<Status, number>;

export function countStatuses(topics: Topic[], progress: ProgressMap): StatusCounts {
	const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as StatusCounts;
	for (const topic of topics) counts[progressFor(progress, topic.id).status]++;
	return counts;
}

export interface DueTopic {
	topic: Topic;
	progress: TopicProgress;
	/** 0 = due today, > 0 = overdue by that many days. */
	daysOverdue: number;
}

/** Topics whose nextReview is today or earlier, most overdue first. */
export function dueTopics(topics: Topic[], progress: ProgressMap, today: string): DueTopic[] {
	const due: DueTopic[] = [];
	for (const topic of topics) {
		const p = progressFor(progress, topic.id);
		if (p.nextReview && p.nextReview <= today) {
			due.push({ topic, progress: p, daysOverdue: daysBetween(p.nextReview, today) });
		}
	}
	return due.sort(
		(a, b) => b.daysOverdue - a.daysOverdue || a.topic.title.localeCompare(b.topic.title)
	);
}

/** Total number of reviews in the last 7 days (today included). */
export function reviewsThisWeek(progress: ProgressMap, today: string): number {
	const weekStart = addDays(today, -6);
	let count = 0;
	for (const p of Object.values(progress)) {
		count += p.history.filter((d) => d >= weekStart && d <= today).length;
	}
	return count;
}

/**
 * Consecutive days with at least one review, ending today.
 * If nothing was reviewed today yet, the streak still counts up to yesterday
 * (you haven't broken it until the day is over).
 */
export function reviewStreak(progress: ProgressMap, today: string): number {
	const days = new Set(Object.values(progress).flatMap((p) => p.history));
	let cursor = days.has(today) ? today : addDays(today, -1);
	let streak = 0;
	while (days.has(cursor)) {
		streak++;
		cursor = addDays(cursor, -1);
	}
	return streak;
}
