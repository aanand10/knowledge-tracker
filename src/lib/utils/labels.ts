import type { Priority, Rating, Status } from '#lib/types/index.ts';

export const STATUS_LABELS: Record<Status, string> = {
	'not-started': 'Not started',
	learning: 'Learning',
	confident: 'Confident'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
	high: 'High',
	medium: 'Medium',
	low: 'Low'
};

export const RATING_LABELS: Record<Rating, string> = {
	hard: 'Hard',
	ok: 'OK',
	easy: 'Easy'
};

export const CONFIDENCE_LABELS = [
	'',
	'No idea',
	'Shaky',
	'Getting there',
	'Solid',
	'Could teach it'
];

export function plural(count: number, word: string): string {
	return `${count} ${word}${count === 1 ? '' : 's'}`;
}
