/** "Anand Suryawanshi" → "Anand". Returns '' for empty input. */
export function firstName(name: string): string {
	const first = name.trim().split(/\s+/)[0] ?? '';
	return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
}

/**
 * The name to personalise the UI with, or '' when we only have an email-based
 * default (e.g. "anandsuryawanshi66" from anandsuryawanshi66@gmail.com).
 */
export function personalName(
	name: string | null | undefined,
	email: string | null | undefined
): string {
	const clean = (name ?? '').trim();
	if (!clean) return '';
	const emailLocal = (email ?? '').split('@')[0]?.toLowerCase();
	if (emailLocal && clean.toLowerCase() === emailLocal) return '';
	return firstName(clean);
}

/** Time-of-day greeting in the user's local time. */
export function greeting(date = new Date()): string {
	const h = date.getHours();
	if (h < 5) return 'Up late';
	if (h < 12) return 'Good morning';
	if (h < 17) return 'Good afternoon';
	return 'Good evening';
}
