/** Small shared UI state: which sign-in dialog (if any) is open. */
export type AuthDialogMode = 'welcome' | 'signin';

class UiStore {
	authDialog = $state<AuthDialogMode | null>(null);
	feedbackOpen = $state(false);
	/** Preset for the feedback dialog, e.g. { kind: 'topic', topic: 'Web Components' }. */
	feedbackPreset = $state<{ kind: string; topic?: string } | null>(null);

	openFeedback(kind = 'idea', topic = '') {
		this.feedbackPreset = { kind, topic };
		this.feedbackOpen = true;
	}

	openSignIn(mode: AuthDialogMode = 'signin') {
		this.authDialog = mode;
	}

	closeSignIn() {
		this.authDialog = null;
	}
}

export const ui = new UiStore();
