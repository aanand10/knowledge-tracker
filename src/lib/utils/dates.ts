/**
 * Date helpers that work with plain "YYYY-MM-DD" strings in the user's LOCAL
 * timezone. Using date-only strings avoids "due tomorrow at 1am UTC" bugs.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date as YYYY-MM-DD in local time. */
export function toISODate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function todayISO(): string {
	return toISODate(new Date());
}

/** Parse YYYY-MM-DD as a local date (midnight). */
export function parseISODate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

export function isISODate(value: unknown): value is string {
	if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
	return toISODate(parseISODate(value)) === value; // rejects 2024-02-31
}

export function addDays(iso: string, days: number): string {
	const date = parseISODate(iso);
	date.setDate(date.getDate() + days);
	return toISODate(date);
}

/** Whole days from `a` to `b` (positive if b is later). */
export function daysBetween(a: string, b: string): number {
	const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
	return Math.round(ms / 86_400_000); // round handles DST shifts
}

/** Human-friendly relative label, e.g. "today", "in 3 days", "2 days ago". */
export function relativeDay(iso: string, today: string): string {
	const diff = daysBetween(today, iso);
	if (diff === 0) return 'today';
	if (diff === 1) return 'tomorrow';
	if (diff === -1) return 'yesterday';
	return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}
