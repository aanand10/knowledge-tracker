/**
 * Optional login + cloud sync (Firebase Auth + Firestore).
 *
 * - Does nothing unless `firebaseConfig` in config.ts is filled in.
 * - The Firebase SDK is loaded with dynamic import(), so it never adds to the
 *   main bundle and logged-out users don't download it until they sign in
 *   (or have signed in before).
 * - Progress stays local-first: every change is saved to localStorage, then
 *   pushed to Firestore (debounced). Changes from other devices arrive live
 *   and are merged per topic (most recent `updatedAt` wins).
 * - Data lives in one document per user: users/{uid} = { progress, updatedAt }.
 */
import { browser } from '$app/env';
import { firebaseConfig, isFirebaseConfigured } from '#lib/config.ts';
import type { ProgressMap } from '#lib/types/index.ts';
import { mergeProgress, sameProgress } from '#lib/utils/merge.ts';
import { validateProgressMap } from '#lib/utils/validate.ts';
import { readString, writeString, removeKey } from './storage.ts';
import { progress } from './progress.svelte.ts';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'synced' | 'error';

export interface CloudUser {
	uid: string;
	name: string;
	email: string | null;
	photoURL: string | null;
}

/** Remembers that this browser signed in before, so we can restore the session on load. */
const SIGNED_IN_HINT = 'knowledge-tracker:signed-in';
const PUSH_DELAY_MS = 1500;

type Firebase = Awaited<ReturnType<typeof loadFirebase>>;

async function loadFirebase() {
	// Three modular imports, loaded in parallel and only when needed.
	const [app, auth, store] = await Promise.all([
		import('firebase/app'),
		import('firebase/auth'),
		import('firebase/firestore')
	]);
	const instance = app.getApps()[0] ?? app.initializeApp(firebaseConfig);
	return { auth, store, authInstance: auth.getAuth(instance), db: store.getFirestore(instance) };
}

class CloudStore {
	readonly enabled = isFirebaseConfigured();
	user = $state<CloudUser | null>(null);
	status = $state<SyncStatus>('off');
	error = $state<string | null>(null);
	/** True while the SDK loads / the session is being restored. */
	busy = $state(false);

	private fb: Promise<Firebase> | null = null;
	private listening = false;
	private stopSnapshot: (() => void) | null = null;
	private stopLocal: (() => void) | null = null;
	private pushTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		// Only restore a session on load if this browser signed in before:
		// first-time visitors never download Firebase.
		if (browser && this.enabled && readString(SIGNED_IN_HINT)) void this.init();
	}

	private firebase(): Promise<Firebase> {
		this.fb ??= loadFirebase();
		return this.fb;
	}

	private async init() {
		if (this.listening) return;
		this.listening = true;
		this.busy = true;
		try {
			const fb = await this.firebase();
			fb.auth.onAuthStateChanged(fb.authInstance, (u) => {
				this.busy = false;
				if (u) void this.start(fb, u);
				else this.stop();
			});
		} catch (e) {
			this.fail(e);
			this.busy = false;
		}
	}

	async signIn() {
		if (!this.enabled) return;
		this.error = null;
		this.busy = true;
		try {
			const fb = await this.firebase();
			await this.init();
			await fb.auth.signInWithPopup(fb.authInstance, new fb.auth.GoogleAuthProvider());
		} catch (e) {
			// Closing the popup isn't an error worth showing.
			if (!String(e).includes('popup-closed')) this.fail(e);
		} finally {
			this.busy = false;
		}
	}

	async signOut() {
		const fb = await this.firebase();
		await this.pushNow(fb); // don't lose a pending change
		await fb.auth.signOut(fb.authInstance);
		removeKey(SIGNED_IN_HINT);
	}

	private async start(
		fb: Firebase,
		u: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
	) {
		writeString(SIGNED_IN_HINT, '1');
		this.user = {
			uid: u.uid,
			name: u.displayName ?? u.email ?? 'you',
			email: u.email,
			photoURL: u.photoURL
		};
		this.status = 'syncing';
		const ref = fb.store.doc(fb.db, 'users', u.uid);

		// Live updates from other devices (and the first load of cloud data).
		this.stopSnapshot?.();
		this.stopSnapshot = fb.store.onSnapshot(
			ref,
			(snap) => {
				const remote = validateProgressMap(snap.data()?.progress ?? {}).value;
				const merged = mergeProgress(progress.map, remote);
				if (!sameProgress(merged, progress.map)) progress.replaceFromCloud(merged);
				// If this device had newer data than the cloud, push it up.
				if (!sameProgress(merged, remote)) this.schedulePush(fb);
				else this.status = 'synced';
			},
			(e) => this.fail(e)
		);

		// Local edits → debounced push.
		this.stopLocal?.();
		this.stopLocal = progress.onChange(() => this.schedulePush(fb));
	}

	private stop() {
		this.stopSnapshot?.();
		this.stopLocal?.();
		this.stopSnapshot = this.stopLocal = null;
		clearTimeout(this.pushTimer);
		this.user = null;
		this.status = 'off';
	}

	private schedulePush(fb: Firebase) {
		this.status = 'syncing';
		clearTimeout(this.pushTimer);
		// Debounce: typing quick notes becomes one write, not one per keystroke.
		this.pushTimer = setTimeout(() => void this.pushNow(fb), PUSH_DELAY_MS);
	}

	private async pushNow(fb: Firebase) {
		clearTimeout(this.pushTimer);
		if (!this.user) return;
		try {
			const data: ProgressMap = $state.snapshot(progress.map);
			await fb.store.setDoc(fb.store.doc(fb.db, 'users', this.user.uid), {
				progress: data,
				updatedAt: fb.store.serverTimestamp()
			});
			this.status = 'synced';
			this.error = null;
		} catch (e) {
			this.fail(e);
		}
	}

	private fail(e: unknown) {
		this.status = 'error';
		this.error = e instanceof Error ? e.message : String(e);
	}
}

export const cloud = new CloudStore();
