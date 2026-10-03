import type { ProgressMap, TopicProgress } from '#lib/types/index.ts';

function stamp(p: TopicProgress | undefined): number {
	return p?.updatedAt ? Date.parse(p.updatedAt) : 0;
}

/**
 * Merge two progress maps (e.g. this device + the cloud). For each topic the
 * most recently updated entry wins; entries only one side has are kept.
 * Pure: returns a new map and never mutates its inputs.
 */
export function mergeProgress(a: ProgressMap, b: ProgressMap): ProgressMap {
	const merged: ProgressMap = { ...a };
	for (const [id, remote] of Object.entries(b)) {
		const local = merged[id];
		if (!local || stamp(remote) > stamp(local)) merged[id] = remote;
	}
	return merged;
}

/** True if two maps hold the same data (cheap structural check via JSON). */
export function sameProgress(a: ProgressMap, b: ProgressMap): boolean {
	const keys = Object.keys(a);
	if (keys.length !== Object.keys(b).length) return false;
	return keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}
