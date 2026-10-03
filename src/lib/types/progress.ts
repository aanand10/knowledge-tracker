export const STATUSES = ['not-started', 'learning', 'confident'] as const;
export type Status = (typeof STATUSES)[number];

export const RATINGS = ['hard', 'ok', 'easy'] as const;
/** How a review went. Drives the spaced-repetition schedule. */
export type Rating = (typeof RATINGS)[number];

/** Your personal progress for one topic. Stored in localStorage. */
export interface TopicProgress {
	status: Status;
	/** 1 (no idea) … 5 (could teach it). */
	confidence: number;
	/** ISO date (YYYY-MM-DD) of the last review, or null if never reviewed. */
	lastReviewed: string | null;
	/** ISO date (YYYY-MM-DD) when the topic is next due, or null if never scheduled. */
	nextReview: string | null;
	reviewCount: number;
	/** Position in the interval sequence (see INTERVALS in utils/schedule.ts). -1 = never reviewed. */
	intervalStep: number;
	/** ISO dates of past reviews (most recent last, capped). Used for streaks and weekly stats. */
	history: string[];
	/** Short personal notes, separate from the Markdown note on GitHub. */
	quickNotes: string;
	/** ISO timestamp of the last change. Used to merge progress across devices. */
	updatedAt: string | null;
}

/** All progress, keyed by topic id. */
export type ProgressMap = Record<string, TopicProgress>;

export function defaultProgress(): TopicProgress {
	return {
		status: 'not-started',
		confidence: 1,
		lastReviewed: null,
		nextReview: null,
		reviewCount: 0,
		intervalStep: -1,
		history: [],
		quickNotes: '',
		updatedAt: null
	};
}
