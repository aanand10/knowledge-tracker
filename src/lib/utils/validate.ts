import {
	PRIORITIES,
	STATUSES,
	defaultProgress,
	type Priority,
	type ProgressMap,
	type Resource,
	type Status,
	type Topic,
	type TopicProgress
} from '#lib/types/index.ts';
import { isISODate } from './dates';

export interface ValidationResult<T> {
	value: T;
	/** Human-readable problems. Invalid entries are skipped, not fatal. */
	warnings: string[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/** Note paths must be relative .md files inside the content repo, e.g. "notes/js/closures.md". */
function isSafeNotePath(path: string): boolean {
	return (
		path.endsWith('.md') &&
		!path.startsWith('/') &&
		!path.includes('..') &&
		!path.includes('\\') &&
		!/^[a-z][a-z0-9+.-]*:/i.test(path) // no "https:", "javascript:" etc.
	);
}

function isHttpUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

/**
 * Validate the parsed contents of topics.json.
 * Invalid entries are skipped with a warning; the app never crashes on bad data.
 */
export function validateTopics(data: unknown): ValidationResult<Topic[]> {
	const warnings: string[] = [];
	if (!Array.isArray(data)) {
		return { value: [], warnings: ['topics.json must contain a JSON array of topics.'] };
	}

	const topics: Topic[] = [];
	const seen = new Set<string>();
	const skip = (message: string) => {
		warnings.push(message);
	};

	data.forEach((raw, index) => {
		const where = `Topic #${index + 1}`;
		if (!isRecord(raw)) {
			warnings.push(`${where}: not an object, skipped.`);
			return;
		}
		const label = nonEmptyString(raw.id) ? `${where} ("${raw.id}")` : where;

		if (!nonEmptyString(raw.id)) return skip(`${where}: missing "id", skipped.`);
		if (!/^[a-z0-9][a-z0-9-_]*$/i.test(raw.id)) {
			return skip(`${label}: "id" may only contain letters, digits, - and _, skipped.`);
		}
		if (seen.has(raw.id)) return skip(`${label}: duplicate id, skipped.`);
		if (!nonEmptyString(raw.title)) return skip(`${label}: missing "title", skipped.`);
		if (!nonEmptyString(raw.category)) {
			return skip(`${label}: missing "category", skipped.`);
		}

		// priority is optional (defaults to medium) but must be valid when present.
		let priority: Priority = 'medium';
		if (raw.priority !== undefined) {
			if (!PRIORITIES.includes(raw.priority as Priority)) {
				return skip(`${label}: "priority" must be one of ${PRIORITIES.join(', ')}, skipped.`);
			}
			priority = raw.priority as Priority;
		}

		let tags: string[] = [];
		if (raw.tags !== undefined) {
			if (!Array.isArray(raw.tags)) {
				warnings.push(`${label}: "tags" should be an array, ignored.`);
			} else {
				tags = raw.tags.filter(nonEmptyString).map((t) => t.trim());
				if (tags.length !== raw.tags.length) warnings.push(`${label}: some tags were invalid.`);
			}
		}

		let note: string | null = null;
		if (raw.note !== undefined && raw.note !== null && raw.note !== '') {
			if (typeof raw.note === 'string' && isSafeNotePath(raw.note.trim())) {
				note = raw.note.trim();
			} else {
				warnings.push(`${label}: "note" must be a relative path to a .md file, ignored.`);
			}
		}

		const resources: Resource[] = [];
		if (Array.isArray(raw.resources)) {
			for (const r of raw.resources) {
				if (isRecord(r) && nonEmptyString(r.label) && nonEmptyString(r.url) && isHttpUrl(r.url)) {
					resources.push({ label: r.label.trim(), url: r.url.trim() });
				} else {
					warnings.push(`${label}: a resource is missing a label or a valid http(s) URL.`);
				}
			}
		} else if (raw.resources !== undefined) {
			warnings.push(`${label}: "resources" should be an array, ignored.`);
		}

		seen.add(raw.id);
		topics.push({
			id: raw.id,
			title: raw.title.trim(),
			category: raw.category.trim(),
			priority,
			tags,
			note,
			resources
		});
	});

	return { value: topics, warnings };
}

/** Validate one progress entry, filling defaults for anything missing or broken. */
export function sanitizeProgress(raw: unknown): TopicProgress | null {
	if (!isRecord(raw)) return null;
	const base = defaultProgress();
	const confidence = Number(raw.confidence);
	const reviewCount = Number(raw.reviewCount);
	const intervalStep = Number(raw.intervalStep);
	return {
		status: STATUSES.includes(raw.status as Status) ? (raw.status as Status) : base.status,
		confidence:
			Number.isInteger(confidence) && confidence >= 1 && confidence <= 5
				? confidence
				: base.confidence,
		lastReviewed: isISODate(raw.lastReviewed) ? raw.lastReviewed : null,
		nextReview: isISODate(raw.nextReview) ? raw.nextReview : null,
		reviewCount: Number.isInteger(reviewCount) && reviewCount >= 0 ? reviewCount : 0,
		intervalStep: Number.isInteger(intervalStep) && intervalStep >= -1 ? intervalStep : -1,
		history: Array.isArray(raw.history) ? raw.history.filter(isISODate) : [],
		quickNotes: typeof raw.quickNotes === 'string' ? raw.quickNotes : ''
	};
}

/**
 * Validate a whole progress map (from localStorage or an imported file).
 * Accepts either the bare map or the export envelope `{ version, progress }`.
 */
export function validateProgressMap(data: unknown): ValidationResult<ProgressMap> {
	const warnings: string[] = [];
	const source = isRecord(data) && isRecord(data.progress) ? data.progress : data;
	if (!isRecord(source)) {
		return { value: {}, warnings: ['Progress data must be a JSON object keyed by topic id.'] };
	}
	const value: ProgressMap = {};
	for (const [id, raw] of Object.entries(source)) {
		const progress = sanitizeProgress(raw);
		if (progress) value[id] = progress;
		else warnings.push(`Progress for "${id}" is not an object, skipped.`);
	}
	return { value, warnings };
}
