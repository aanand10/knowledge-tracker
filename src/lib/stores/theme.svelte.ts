import { browser } from '$app/env';
import { STORAGE_KEYS, readString, writeString } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

function readPreference(): ThemePreference {
	const saved = readString(STORAGE_KEYS.theme);
	return PREFERENCES.includes(saved as ThemePreference) ? (saved as ThemePreference) : 'system';
}

class ThemeStore {
	preference = $state<ThemePreference>(browser ? readPreference() : 'system');
	private systemDark = $state(false);

	// `$derived` recomputes automatically when `preference` or `systemDark` change.
	isDark = $derived(
		this.preference === 'dark' || (this.preference === 'system' && this.systemDark)
	);

	constructor() {
		if (!browser) return;
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		this.systemDark = media.matches;
		media.addEventListener('change', (e) => (this.systemDark = e.matches));
	}

	/** Cycle system → light → dark → system. */
	cycle() {
		const next = PREFERENCES[(PREFERENCES.indexOf(this.preference) + 1) % PREFERENCES.length];
		this.set(next ?? 'system');
	}

	set(preference: ThemePreference) {
		this.preference = preference;
		writeString(STORAGE_KEYS.theme, preference);
	}
}

export const theme = new ThemeStore();
