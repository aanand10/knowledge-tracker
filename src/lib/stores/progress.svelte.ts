/**
 * Shared progress state, built with Svelte 5 runes.
 *
 * Why a `.svelte.ts` file? Runes ($state, $derived, …) only work inside
 * .svelte files and .svelte.ts/.svelte.js modules. Putting state in a class
 * here lets every component import the SAME reactive object, a modern
 * replacement for Svelte 4's writable() stores.
 */
import { browser } from '$app/env';
import type { ProgressMap, Rating, TopicProgress } from '#lib/types/index.ts';
import { scheduleReview } from '#lib/utils/schedule.ts';
import { progressFor } from '#lib/utils/progress.ts';
import { validateProgressMap } from '#lib/utils/validate.ts';
import { todayISO } from '#lib/utils/dates.ts';
import { STORAGE_KEYS, clearProgress, loadProgress, saveProgress } from './storage';

export interface ImportResult {
	ok: boolean;
	imported: number;
	warnings: string[];
}

class ProgressStore {
	// `$state` on a class field makes it reactive. Reading `this.map` inside a
	// component, $derived or $effect subscribes to it automatically.
	map = $state<ProgressMap>(browser ? loadProgress() : {});

	/** True if the last save to localStorage failed (e.g. storage full or blocked). */
	saveFailed = $state(false);

	constructor() {
		if (browser) {
			// Keep multiple open tabs in sync: the `storage` event fires in OTHER tabs.
			window.addEventListener('storage', (event) => {
				if (event.key === STORAGE_KEYS.progress) this.map = loadProgress();
			});
		}
	}

	/** Progress for one topic (a default object if it has never been touched). */
	get(id: string): TopicProgress {
		return progressFor(this.map, id);
	}

	update(id: string, patch: Partial<TopicProgress>) {
		// Assigning a new object (instead of mutating) keeps the data easy to reason
		// about. `$state` would also track deep mutations, but a single
		// assignment is simpler to follow.
		this.map = { ...this.map, [id]: { ...this.get(id), ...patch } };
		this.persist();
	}

	review(id: string, rating: Rating, today = todayISO()) {
		this.map = { ...this.map, [id]: scheduleReview(this.get(id), rating, today) };
		this.persist();
	}

	/** JSON string of all progress, wrapped with metadata for future-proofing. */
	exportJSON(): string {
		// $state.snapshot gives a plain (non-proxied) copy of reactive state.
		const progress = $state.snapshot(this.map);
		return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), progress }, null, 2);
	}

	/**
	 * Merge progress from an exported file. Topics in the file overwrite local
	 * progress for the same id; other local progress is kept.
	 */
	importJSON(text: string): ImportResult {
		let data: unknown;
		try {
			data = JSON.parse(text);
		} catch {
			return { ok: false, imported: 0, warnings: ['That file is not valid JSON.'] };
		}
		const { value, warnings } = validateProgressMap(data);
		const imported = Object.keys(value).length;
		if (imported === 0) {
			return { ok: false, imported, warnings: warnings.length ? warnings : ['No progress found.'] };
		}
		this.map = { ...this.map, ...value };
		this.persist();
		return { ok: true, imported, warnings };
	}

	reset() {
		this.map = {};
		this.saveFailed = !clearProgress() && browser;
	}

	private persist() {
		// We save explicitly after each change instead of using $effect: an $effect
		// at module level would need $effect.root and is harder to follow.
		this.saveFailed = !saveProgress(this.map);
	}
}

export const progress = new ProgressStore();
