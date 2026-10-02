/**
 * The ONLY module that touches localStorage.
 *
 * localStorage can throw: in private mode, when the quota is full, when the
 * user blocked site data, or when it doesn't exist at all (SSR / tests).
 * Every access here is wrapped in try/catch so the rest of the app never
 * has to think about it.
 */
import type { ProgressMap } from '#lib/types/index.ts';
import { validateProgressMap } from '#lib/utils/validate.ts';

export const STORAGE_KEYS = {
	progress: 'knowledge-tracker:progress:v1',
	theme: 'knowledge-tracker:theme'
} as const;

function getStorage(): Storage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		return null; // some browsers throw just from reading `localStorage`
	}
}

export function readString(key: string): string | null {
	try {
		return getStorage()?.getItem(key) ?? null;
	} catch {
		return null;
	}
}

/** Returns false if the write failed (e.g. quota exceeded). */
export function writeString(key: string, value: string): boolean {
	try {
		const storage = getStorage();
		if (!storage) return false;
		storage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

export function removeKey(key: string): boolean {
	try {
		const storage = getStorage();
		if (!storage) return false;
		storage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}

export function readJSON(key: string): unknown {
	const raw = readString(key);
	if (raw === null) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null; // corrupt data: treat as missing
	}
}

export function writeJSON(key: string, value: unknown): boolean {
	try {
		return writeString(key, JSON.stringify(value));
	} catch {
		return false; // e.g. circular structures
	}
}

/** Load and validate saved progress. Corrupt entries are dropped. */
export function loadProgress(): ProgressMap {
	const data = readJSON(STORAGE_KEYS.progress);
	if (data === null) return {};
	return validateProgressMap(data).value;
}

export function saveProgress(progress: ProgressMap): boolean {
	return writeJSON(STORAGE_KEYS.progress, progress);
}

export function clearProgress(): boolean {
	return removeKey(STORAGE_KEYS.progress);
}
