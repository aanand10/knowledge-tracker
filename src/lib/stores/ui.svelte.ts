/** Small shared UI state: which sign-in dialog (if any) is open. */
export type AuthDialogMode = 'welcome' | 'signin';

class UiStore {
	authDialog = $state<AuthDialogMode | null>(null);
	feedbackOpen = $state(false);

	openSignIn(mode: AuthDialogMode = 'signin') {
		this.authDialog = mode;
	}

	closeSignIn() {
		this.authDialog = null;
	}
}

export const ui = new UiStore();
