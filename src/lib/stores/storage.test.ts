import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultProgress } from '#lib/types/index.ts';
import {
	STORAGE_KEYS,
	clearProgress,
	loadExpandedGroups,
	loadProgress,
	saveExpandedGroups,
	readJSON,
	readString,
	saveProgress,
	writeJSON,
	writeString
} from './storage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('storage', () => {
	it('reads and writes strings and JSON', () => {
		expect(writeString('k', 'v')).toBe(true);
		expect(readString('k')).toBe('v');
		expect(writeJSON('j', { a: 1 })).toBe(true);
		expect(readJSON('j')).toEqual({ a: 1 });
	});

	it('returns null for missing keys and corrupt JSON', () => {
		expect(readString('missing')).toBeNull();
		localStorage.setItem('bad', '{not json');
		expect(readJSON('bad')).toBeNull();
	});

	it('survives getItem throwing', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('SecurityError');
		});
		expect(readString('k')).toBeNull();
		expect(loadProgress()).toEqual({});
	});

	it('reports failure when setItem throws (quota exceeded)', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('full', 'QuotaExceededError');
		});
		expect(writeString('k', 'v')).toBe(false);
		expect(saveProgress({})).toBe(false);
	});

	it('round-trips progress', () => {
		const progress = { a: { ...defaultProgress(), status: 'learning' as const, confidence: 4 } };
		expect(saveProgress(progress)).toBe(true);
		expect(loadProgress()).toEqual(progress);
	});

	it('repairs corrupt progress entries on load', () => {
		localStorage.setItem(
			STORAGE_KEYS.progress,
			JSON.stringify({ a: { status: 'weird', confidence: 3 }, b: 'nope' })
		);
		const progress = loadProgress();
		expect(Object.keys(progress)).toEqual(['a']);
		expect(progress.a).toMatchObject({ status: 'not-started', confidence: 3 });
	});

	it('clears progress', () => {
		saveProgress({ a: defaultProgress() });
		clearProgress();
		expect(loadProgress()).toEqual({});
	});
});

describe('expanded groups', () => {
	it('round-trips and ignores junk', () => {
		expect(loadExpandedGroups()).toEqual([]);
		saveExpandedGroups(['Frameworks', 'Frameworks/React']);
		expect(loadExpandedGroups()).toEqual(['Frameworks', 'Frameworks/React']);
		localStorage.setItem(STORAGE_KEYS.expanded, JSON.stringify(['ok', 3, null]));
		expect(loadExpandedGroups()).toEqual(['ok']);
	});
});
