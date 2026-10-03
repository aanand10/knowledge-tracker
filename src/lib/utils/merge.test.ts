import { describe, expect, it } from 'vitest';
import { defaultProgress, type TopicProgress } from '#lib/types/index.ts';
import { mergeProgress, sameProgress } from './merge';

const at = (iso: string | null, confidence = 1): TopicProgress => ({
	...defaultProgress(),
	confidence,
	updatedAt: iso
});

describe('mergeProgress', () => {
	it('keeps the most recently updated entry per topic', () => {
		const local = { a: at('2026-10-03T10:00:00Z', 2), b: at('2026-10-03T12:00:00Z', 5) };
		const remote = { a: at('2026-10-03T11:00:00Z', 4), b: at('2026-10-03T09:00:00Z', 1) };
		const merged = mergeProgress(local, remote);
		expect(merged.a?.confidence).toBe(4);
		expect(merged.b?.confidence).toBe(5);
	});

	it('keeps topics that exist on only one side', () => {
		const merged = mergeProgress({ a: at(null) }, { b: at('2026-10-03T09:00:00Z') });
		expect(Object.keys(merged).sort()).toEqual(['a', 'b']);
	});

	it('prefers a timestamped entry over one without', () => {
		expect(
			mergeProgress({ a: at(null, 1) }, { a: at('2026-01-01T00:00:00Z', 3) }).a?.confidence
		).toBe(3);
		expect(
			mergeProgress({ a: at('2026-01-01T00:00:00Z', 3) }, { a: at(null, 1) }).a?.confidence
		).toBe(3);
	});

	it('does not mutate inputs', () => {
		const local = { a: at('2026-10-03T10:00:00Z') };
		const copy = structuredClone(local);
		mergeProgress(local, { a: at('2026-10-04T10:00:00Z', 5) });
		expect(local).toEqual(copy);
	});
});

describe('sameProgress', () => {
	it('compares maps structurally', () => {
		expect(sameProgress({ a: at(null) }, { a: at(null) })).toBe(true);
		expect(sameProgress({ a: at(null) }, { a: at(null, 2) })).toBe(false);
		expect(sameProgress({ a: at(null) }, {})).toBe(false);
	});
});
