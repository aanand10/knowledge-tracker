/**
 * Optional login + cloud sync with Supabase (Postgres + Auth + Realtime).
 *
 * - Does nothing unless `supabaseConfig` in config.ts is filled in.
 * - The Supabase SDK is loaded with dynamic import(), so logged-out visitors
 *   never download it (it loads when you sign in, or if you signed in before).
 * - Login is an email magic link: no passwords, no OAuth secrets to manage.
 * - Local-first: every change is saved to localStorage, then the changed
 *   topics are upserted (debounced). Other devices get changes via Realtime.
 *   Conflicts merge per topic: the newest `updatedAt` wins.
 * - Tables (see supabase/schema.sql): user_progress, notes, reviews, profiles.
 */
import { browser } from '$app/env';
import { resolve } from '$app/paths';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isCloudConfigured, supabaseConfig } from '#lib/config.ts';
import { defaultProgress, type ProgressMap, type TopicProgress } from '#lib/types/index.ts';
import { mergeProgress, sameProgress } from '#lib/utils/merge.ts';
import { personalName } from '#lib/utils/greeting.ts';
import { sanitizeProgress } from '#lib/utils/validate.ts';
import { STORAGE_KEYS, readString, removeKey, writeString } from './storage.ts';
import { progress, type ProgressChange } from './progress.svelte.ts';

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error';

/** Remembers that this browser signed in before, so the session is restored on load. */
const SIGNED_IN_HINT = 'knowledge-tracker:signed-in';
const PUSH_DELAY_MS = 1500;

interface ProgressRow {
	topic_id: string;
	status: string;
	confidence: number;
	last_reviewed: string | null;
	next_review: string | null;
	review_count: number;
	interval_step: number;
	history: string[];
	updated_at: string;
}
interface NoteRow {
	topic_id: string;
	body: string;
	updated_at: string;
}

const toRow = (id: string, p: TopicProgress): ProgressRow => ({
	topic_id: id,
	status: p.status,
	confidence: p.confidence,
	last_reviewed: p.lastReviewed,
	next_review: p.nextReview,
	review_count: p.reviewCount,
	interval_step: p.intervalStep,
	history: p.history,
	updated_at: p.updatedAt ?? new Date().toISOString()
});

/** Rows from both tables → one progress map (validated like any other input). */
function fromRows(rows: ProgressRow[], notes: NoteRow[]): ProgressMap {
	const map: ProgressMap = {};
	for (const r of rows) {
		const p = sanitizeProgress({
			status: r.status,
			confidence: r.confidence,
			lastReviewed: r.last_reviewed,
			nextReview: r.next_review,
			reviewCount: r.review_count,
			intervalStep: r.interval_step,
			history: r.history,
			updatedAt: r.updated_at
		});
		if (p) map[r.topic_id] = p;
	}
	for (const n of notes) {
		const entry = map[n.topic_id] ?? { ...defaultProgress(), updatedAt: n.updated_at };
		entry.quickNotes = n.body;
		if (!entry.updatedAt || n.updated_at > entry.updatedAt) entry.updatedAt = n.updated_at;
		map[n.topic_id] = entry;
	}
	return map;
}

class CloudStore {
	readonly enabled = isCloudConfigured();
	user = $state<{ id: string; email: string | null; name: string } | null>(null);
	status = $state<SyncStatus>('off');
	error = $state<string | null>(null);
	busy = $state(false);
	/** First name to personalise the UI with ('' if we only know the email). */
	firstName = $derived(personalName(this.user?.name, this.user?.email));
	/** Set after a magic link was sent, to show "check your email". */
	linkSentTo = $state<string | null>(null);

	private client: Promise<SupabaseClient> | null = null;
	private listening = false;
	private dirty = new Set<string>();
	private pushTimer: ReturnType<typeof setTimeout> | undefined;
	private stopLocal: (() => void) | null = null;
	private channel: { unsubscribe: () => unknown } | null = null;

	constructor() {
		if (!browser || !this.enabled) return;
		// Load the SDK on start only if this browser signed in before, or we're
		// coming back from a magic link (tokens in the URL).
		const fromLink = /access_token|error_description/.test(location.hash);
		if (readString(SIGNED_IN_HINT) || fromLink) void this.init();
	}

	private sdk(): Promise<SupabaseClient> {
		this.client ??= import('@supabase/supabase-js').then(({ createClient }) =>
			createClient(supabaseConfig.url, supabaseConfig.anonKey, {
				// implicit flow: the magic link also works if opened in another browser
				auth: { flowType: 'implicit', persistSession: true, detectSessionInUrl: true }
			})
		);
		return this.client;
	}

	private async init() {
		if (this.listening) return;
		this.listening = true;
		this.busy = true;
		try {
			const sb = await this.sdk();
			sb.auth.onAuthStateChange((_event, session) => {
				this.busy = false;
				const u = session?.user ?? null;
				if (u && u.id !== this.user?.id) void this.start(sb, u);
				if (!u && this.user) this.stop();
			});
			const { data } = await sb.auth.getSession();
			if (!data.session) this.busy = false;
		} catch (e) {
			this.fail(e);
			this.busy = false;
		}
	}

	/** Email a magic sign-in link. */
	/**
	 * Email a magic sign-in link. The name is stored on a new account (auth metadata
	 * → profiles.display_name) and also kept locally, so an existing account gets it
	 * after the link is opened in this browser.
	 */
	async sendMagicLink(email: string, name: string) {
		writeString(STORAGE_KEYS.pendingName, name.trim().slice(0, 60));
		this.error = null;
		this.busy = true;
		try {
			const sb = await this.sdk();
			await this.init();
			const redirectTo = new URL(resolve('/'), location.href).href;
			const { error } = await sb.auth.signInWithOtp({
				email: email.trim(),
				options: {
					emailRedirectTo: redirectTo,
					// Only applied when the account is created (first sign-in).
					data: name.trim() ? { full_name: name.trim().slice(0, 60) } : undefined
				}
			});
			if (error) throw error;
			this.linkSentTo = email.trim();
		} catch (e) {
			this.fail(e);
		} finally {
			this.busy = false;
		}
	}

	/** Change the display name (shown in the menu and, later, on the leaderboard). */
	async updateName(name: string) {
		const clean = name.trim().slice(0, 60);
		if (!clean || !this.user) return;
		const sb = await this.sdk();
		const { error } = await sb
			.from('profiles')
			.update({ display_name: clean })
			.eq('id', this.user.id);
		if (error) this.fail(error);
		else this.user.name = clean;
	}

	async signOut() {
		const sb = await this.sdk();
		await this.pushNow(sb);
		await sb.auth.signOut();
		removeKey(SIGNED_IN_HINT);
		this.stop();
	}

	private async start(sb: SupabaseClient, u: User) {
		writeString(SIGNED_IN_HINT, '1');
		const fallback =
			(u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'you';
		this.user = { id: u.id, email: u.email ?? null, name: fallback };
		this.linkSentTo = null;
		// The profile row (created by a DB trigger) holds the editable display name.
		void sb
			.from('profiles')
			.select('display_name')
			.eq('id', u.id)
			.maybeSingle()
			.then(({ data }) => {
				if (data?.display_name && this.user) this.user.name = data.display_name;
				// A name typed at sign-in wins over the email-based default.
				const pending = readString(STORAGE_KEYS.pendingName);
				if (pending) {
					removeKey(STORAGE_KEYS.pendingName);
					if (pending !== data?.display_name) void this.updateName(pending);
				}
			});
		this.status = 'syncing';
		// Clean the magic-link tokens out of the address bar.
		if (location.hash.includes('access_token'))
			history.replaceState(history.state, '', location.pathname + location.search);

		try {
			const [p, n] = await Promise.all([
				sb.from('user_progress').select('*'),
				sb.from('notes').select('topic_id, body, updated_at')
			]);
			if (p.error) throw p.error;
			if (n.error) throw n.error;
			const remote = fromRows(p.data as ProgressRow[], n.data as NoteRow[]);
			const merged = mergeProgress(progress.map, remote);
			if (!sameProgress(merged, progress.map)) progress.replaceFromCloud(merged);
			// Upload anything this device had that's newer than (or missing in) the cloud.
			for (const [id, entry] of Object.entries(merged)) {
				if (JSON.stringify(remote[id]) !== JSON.stringify(entry)) this.dirty.add(id);
			}
			if (this.dirty.size) this.schedulePush(sb);
			else this.status = 'synced';
		} catch (e) {
			this.fail(e);
		}

		// Local edits → debounced upload of just the changed topics.
		this.stopLocal?.();
		this.stopLocal = progress.onChange((change) => void this.onLocalChange(sb, change));

		// Live updates from the user's other devices.
		this.channel?.unsubscribe();
		this.channel = sb
			.channel(`user-${u.id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'user_progress', filter: `user_id=eq.${u.id}` },
				(payload) =>
					this.applyRemote(
						fromRows(
							[payload.new as ProgressRow].filter((r) => r?.topic_id),
							[]
						)
					)
			)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${u.id}` },
				(payload) =>
					this.applyRemote(
						fromRows(
							[],
							[payload.new as NoteRow].filter((r) => r?.topic_id)
						)
					)
			)
			.subscribe();
	}

	private applyRemote(remote: ProgressMap) {
		const merged = mergeProgress(progress.map, remote);
		if (!sameProgress(merged, progress.map)) progress.replaceFromCloud(merged);
	}

	private async onLocalChange(sb: SupabaseClient, change: ProgressChange) {
		if (change.kind === 'topics') {
			for (const id of change.ids) this.dirty.add(id);
			this.schedulePush(sb);
		} else if (change.kind === 'review') {
			const { error } = await sb
				.from('reviews')
				.insert({ topic_id: change.id, rating: change.rating });
			if (error) this.fail(error);
		} else if (change.kind === 'reset' && this.user) {
			this.dirty.clear();
			const [a, b] = await Promise.all([
				sb.from('user_progress').delete().eq('user_id', this.user.id),
				sb.from('notes').delete().eq('user_id', this.user.id)
			]);
			if (a.error || b.error) this.fail(a.error ?? b.error);
		}
	}

	private stop() {
		this.stopLocal?.();
		this.channel?.unsubscribe();
		this.stopLocal = this.channel = null;
		clearTimeout(this.pushTimer);
		this.dirty.clear();
		this.user = null;
		this.status = 'off';
	}

	private schedulePush(sb: SupabaseClient) {
		this.status = 'syncing';
		clearTimeout(this.pushTimer);
		// Debounce: typing a quick note becomes one request, not one per keystroke.
		this.pushTimer = setTimeout(() => void this.pushNow(sb), PUSH_DELAY_MS);
	}

	private async pushNow(sb: SupabaseClient) {
		clearTimeout(this.pushTimer);
		if (!this.user || this.dirty.size === 0) return;
		const ids = [...this.dirty];
		this.dirty.clear();
		const rows: ProgressRow[] = [];
		const notes: NoteRow[] = [];
		for (const id of ids) {
			const p = progress.map[id];
			if (!p) continue;
			const row = toRow(id, p);
			rows.push(row);
			notes.push({ topic_id: id, body: p.quickNotes, updated_at: row.updated_at });
		}
		try {
			const [a, b] = await Promise.all([
				sb.from('user_progress').upsert(rows),
				sb.from('notes').upsert(notes)
			]);
			if (a.error || b.error) throw a.error ?? b.error;
			this.status = 'synced';
			this.error = null;
		} catch (e) {
			for (const id of ids) this.dirty.add(id); // retry with the next change
			this.fail(e);
		}
	}

	private fail(e: unknown) {
		this.status = 'error';
		this.error =
			e instanceof Error
				? e.message
				: typeof e === 'object' && e && 'message' in e
					? String(e.message)
					: String(e);
	}
}

export const cloud = new CloudStore();
