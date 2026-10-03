/**
 * Loads topics.json and Markdown notes, from GitHub or the bundled sample content.
 *
 * Like progress.svelte.ts, this is a class with `$state` fields. Components
 * read `content.topics`, `content.status`, etc., and re-render when they change.
 */
import { asset } from '$app/paths';
import { githubContentBaseUrl } from '#lib/config.ts';
import type { Topic } from '#lib/types/index.ts';
import { validateTopics } from '#lib/utils/validate.ts';

export type ContentSource = 'github' | 'sample';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Folder that holds the bundled sample content, with the GitHub Pages base path applied. */
function sampleBaseUrl(): string {
	// `asset()` adds the base path (e.g. "/knowledge-tracker") to a file in /static.
	return new URL(asset('sample-content/topics.json'), location.href).href.replace(
		/topics\.json$/,
		''
	);
}

/** Give up on a request after this long, so a stalled connection falls back instead of hanging. */
const REQUEST_TIMEOUT_MS = 8000;

async function fetchText(url: string, signal: AbortSignal): Promise<string> {
	// AbortSignal.any: abort if EITHER the caller cancels OR the timeout fires.
	const combined = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
	try {
		// GitHub's raw CDN caches files for 5 minutes. A `v` param that changes every
		// minute skips that cache, so a push shows up within about a minute.
		const fresh = new URL(url);
		fresh.searchParams.set('v', String(Math.floor(Date.now() / 60_000)));
		const response = await fetch(fresh, { signal: combined, cache: 'no-cache' });
		if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
		return await response.text();
	} catch (error) {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			throw new Error(`request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`, { cause: error });
		}
		throw error;
	}
}

export function isAbort(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError';
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

class ContentStore {
	topics = $state<Topic[]>([]);
	status = $state<LoadStatus>('idle');
	error = $state<string | null>(null);
	/** Validation problems in topics.json and fallback notices. */
	warnings = $state<string[]>([]);
	source = $state<ContentSource | null>(null);
	/** Base URL notes are resolved against (ends with "/"). */
	baseUrl = $state<string | null>(null);

	// `$derived` on a class field: a lookup table that rebuilds only when `topics` changes.
	byId = $derived(new Map(this.topics.map((t) => [t.id, t])));

	// Plain (non-reactive) fields: nothing in the UI needs to re-render when these change.
	private controller: AbortController | null = null;
	private noteCache = new Map<string, string>();

	/** Load topics. Calling it again cancels any request still in flight. */
	async load({ force = false } = {}) {
		if (!force && (this.status === 'loading' || this.status === 'ready')) return;

		this.controller?.abort();
		const controller = new AbortController();
		this.controller = controller;
		const { signal } = controller;

		this.status = 'loading';
		this.error = null;
		this.noteCache.clear();

		const notices: string[] = [];
		const github = githubContentBaseUrl();
		const attempts: { source: ContentSource; base: string }[] = [];
		if (github) attempts.push({ source: 'github', base: github });
		attempts.push({ source: 'sample', base: sampleBaseUrl() });

		for (const attempt of attempts) {
			try {
				const text = await fetchText(`${attempt.base}topics.json`, signal);
				let data: unknown;
				try {
					data = JSON.parse(text);
				} catch {
					throw new Error('topics.json is not valid JSON');
				}
				const { value, warnings } = validateTopics(data);
				if (signal.aborted) return;
				this.topics = value;
				this.warnings = [...notices, ...warnings];
				this.source = attempt.source;
				this.baseUrl = attempt.base;
				this.status = 'ready';
				return;
			} catch (error) {
				if (isAbort(error) || signal.aborted) return; // a newer load() took over
				notices.push(
					attempt.source === 'github'
						? `Couldn't load content from GitHub (${message(error)}). Showing sample content instead.`
						: `Couldn't load sample content (${message(error)}).`
				);
			}
		}

		this.topics = [];
		this.warnings = [];
		this.status = 'error';
		this.error = notices.join(' ');
	}

	reload() {
		return this.load({ force: true });
	}

	/** Fetch a topic's Markdown note. Cached per session; pass a signal to cancel. */
	async loadNote(topic: Topic, signal: AbortSignal): Promise<string | null> {
		if (!topic.note || !this.baseUrl) return null;
		const url = new URL(topic.note, this.baseUrl).href;
		const cached = this.noteCache.get(url);
		if (cached !== undefined) return cached;
		const text = await fetchText(url, signal);
		this.noteCache.set(url, text);
		return text;
	}

	/** Absolute URL of a topic's note (used to resolve relative links/images inside it). */
	noteUrl(topic: Topic): string | null {
		return topic.note && this.baseUrl ? new URL(topic.note, this.baseUrl).href : null;
	}
}

export const content = new ContentStore();
