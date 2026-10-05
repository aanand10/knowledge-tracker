<script lang="ts">
	import { page } from '$app/state';
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';

	const KINDS = [
		{ value: 'idea', label: 'idea' },
		{ value: 'bug', label: 'bug' },
		{ value: 'content', label: 'note / content' },
		{ value: 'other', label: 'other' }
	] as const;

	let dialog = $state<HTMLDialogElement>();
	let kind = $state<string>('idea');
	let message = $state('');
	let name = $state('');
	let email = $state('');
	let sendStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');

	// Native <dialog> follows the shared UI state (focus trap + Esc for free).
	$effect(() => {
		if (!dialog) return;
		if (ui.feedbackOpen && !dialog.open) {
			// Prefill from the signed-in profile each time it opens.
			name = cloud.user?.name ?? name;
			email = cloud.user?.email ?? email;
			dialog.showModal();
		}
		if (!ui.feedbackOpen && dialog.open) dialog.close();
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		sendStatus = 'sending';
		const ok = await cloud.sendFeedback({ kind, message, name, email, page: page.url.pathname });
		sendStatus = ok ? 'sent' : 'error';
		if (ok) message = '';
	}

	function close() {
		ui.feedbackOpen = false;
		if (sendStatus !== 'sending') sendStatus = 'idle';
	}
</script>

<dialog
	bind:this={dialog}
	onclose={close}
	aria-labelledby="feedback-title"
	class="m-auto w-[min(28rem,calc(100vw-2rem))] border border-line bg-bg p-0 text-fg backdrop:bg-black/60"
>
	<div class="space-y-4 p-5">
		<div class="flex items-start justify-between gap-3">
			<h2 id="feedback-title" class="font-sans text-lg font-semibold">Send feedback</h2>
			<button type="button" class="text-muted hover:text-fg" aria-label="Close" onclick={close}
				>✕</button
			>
		</div>

		{#if sendStatus === 'sent'}
			<div class="space-y-3 text-sm" role="status">
				<p>Thanks, got it. Every message is read.</p>
				<div class="flex gap-2">
					<button type="button" class="btn" onclick={() => (sendStatus = 'idle')}
						>send another</button
					>
					<button type="button" class="btn-primary" onclick={close}>close</button>
				</div>
			</div>
		{:else}
			<form onsubmit={submit} class="space-y-3">
				<fieldset>
					<legend class="label">what's it about?</legend>
					<div class="flex flex-wrap gap-1.5 text-xs">
						{#each KINDS as k (k.value)}
							<label
								class="cursor-pointer rounded-sm border px-2 py-1 has-checked:border-fg has-checked:bg-fg has-checked:text-bg {kind ===
								k.value
									? ''
									: 'border-line hover:border-muted'}"
							>
								<input
									type="radio"
									name="feedback-kind"
									value={k.value}
									bind:group={kind}
									class="sr-only"
								/>
								{k.label}
							</label>
						{/each}
					</div>
				</fieldset>

				<div>
					<label for="feedback-message" class="label">message</label>
					<!-- svelte-ignore a11y_autofocus -->
					<textarea
						id="feedback-message"
						class="input min-h-28 resize-y"
						required
						minlength="3"
						maxlength="2000"
						autofocus
						placeholder="What should be better, broken, or added?"
						bind:value={message}></textarea>
				</div>

				<div class="grid gap-2 sm:grid-cols-2">
					<div>
						<label for="feedback-name" class="label">name (optional)</label>
						<input
							id="feedback-name"
							class="input"
							maxlength="80"
							autocomplete="name"
							bind:value={name}
						/>
					</div>
					<div>
						<label for="feedback-email" class="label">email for a reply (optional)</label>
						<input
							id="feedback-email"
							type="email"
							class="input"
							maxlength="200"
							autocomplete="email"
							bind:value={email}
						/>
					</div>
				</div>

				{#if sendStatus === 'error'}
					<p class="text-xs text-danger" role="alert">
						Couldn't send right now. Please try again in a moment.
					</p>
				{/if}

				<button type="submit" class="btn-primary w-full" disabled={sendStatus === 'sending'}>
					{sendStatus === 'sending' ? 'sending…' : 'send feedback'}
				</button>
			</form>
		{/if}
	</div>
</dialog>
