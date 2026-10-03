<script lang="ts">
	import { onMount } from 'svelte';
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { content } from '#lib/stores/content.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { STORAGE_KEYS, readString, writeString } from '#lib/stores/storage.ts';
	import SignInForm from './SignInForm.svelte';

	let dialog = $state<HTMLDialogElement>();

	// Open/close the native <dialog> whenever the shared UI state changes.
	// showModal() gives us a focus trap, Esc-to-close and a backdrop for free.
	$effect(() => {
		if (!dialog) return;
		if (ui.authDialog && !dialog.open) dialog.showModal();
		if (!ui.authDialog && dialog.open) dialog.close();
	});

	// Signing in (e.g. via the link in another tab) closes the dialog.
	$effect(() => {
		if (cloud.user) ui.closeSignIn();
	});

	// First visit: welcome popup for brand-new visitors (no progress, never dismissed).
	onMount(() => {
		if (!cloud.enabled || readString(STORAGE_KEYS.welcomeDismissed)) return;
		const timer = setTimeout(() => {
			const isNew = Object.keys(progress.map).length === 0;
			if (isNew && !cloud.user && !cloud.busy && content.status === 'ready')
				ui.openSignIn('welcome');
		}, 1500);
		return () => clearTimeout(timer);
	});

	function dismiss() {
		if (ui.authDialog === 'welcome') writeString(STORAGE_KEYS.welcomeDismissed, '1');
		ui.closeSignIn();
	}
</script>

{#if cloud.enabled}
	<!-- onclose fires for Esc too, so state always matches what's on screen. -->
	<dialog
		bind:this={dialog}
		onclose={dismiss}
		aria-labelledby="auth-title"
		class="m-auto w-[min(26rem,calc(100vw-2rem))] border border-line bg-bg p-0 text-fg backdrop:bg-black/60"
	>
		<div class="space-y-4 p-5">
			<div class="flex items-start justify-between gap-3">
				<h2 id="auth-title" class="font-sans text-lg font-semibold">
					{ui.authDialog === 'welcome' ? 'Welcome to Knowledge Tracker' : 'Sign in'}
				</h2>
				<button type="button" class="text-muted hover:text-fg" aria-label="Close" onclick={dismiss}
					>✕</button
				>
			</div>

			{#if ui.authDialog === 'welcome'}
				<ul class="space-y-1 text-xs text-muted">
					<li>▸ Interview notes for every topic, in plain language</li>
					<li>▸ Spaced repetition tells you what to revise today</li>
					<li>▸ Sign in to save progress and sync it to your phone</li>
				</ul>
			{:else}
				<p class="text-xs text-muted">Save your progress and sync it across your devices.</p>
			{/if}

			<SignInForm />

			{#if ui.authDialog === 'welcome'}
				<button
					type="button"
					class="w-full text-center text-xs text-muted hover:text-fg"
					onclick={dismiss}
				>
					continue without signing in
				</button>
			{/if}
		</div>
	</dialog>
{/if}
