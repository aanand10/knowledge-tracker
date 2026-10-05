<script lang="ts">
	import { page } from '$app/state';
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';

	const KINDS = [
		{ value: 'idea', label: 'idea' },
		{ value: 'bug', label: 'bug' },
		{ value: 'topic', label: 'suggest a topic' },
		{ value: 'content', label: 'note / content' },
		{ value: 'other', label: 'other' }
	] as const;

	let dialog = $state<HTMLDialogElement>();
	let kind = $state<string>('idea');
	let message = $state('');
	let topic = $state('');
	let name = $state('');
	let email = $state('');
	let sendStatus = $state<'idle' | 'sending' | 'sent' | 'error'>('idle');

	// Native <dialog> follows the shared UI state (focus trap + Esc for free).
	$effect(() => {
		if (!dialog) return;
		if (ui.feedbackOpen && !dialog.open) {
			// Apply a preset (e.g. "suggest a topic" with the search text), then profile prefill.
			if (ui.feedbackPreset) {
				kind = ui.feedbackPreset.kind;
				if (ui.feedbackPreset.topic) topic = ui.feedbackPreset.topic;
				ui.feedbackPreset = null;
			}
			name = cloud.user?.name ?? name;
			email = cloud.user?.email ?? email;
			dialog.showModal();
		}
		if (!ui.feedbackOpen && dialog.open) dialog.close();
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		sendStatus = 'sending';
		const body =
			kind === 'topic'
				? `Topic: ${topic.trim()}${message.trim() ? `\n\n${message.trim()}` : ''}`
				: message;
		const ok = await cloud.sendFeedback({
			kind,
			message: body,
			name,
			email,
			page: page.url.pathname
		});
		sendStatus = ok ? 'sent' : 'error';
		if (ok) {
			message = '';
			topic = '';
		}
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
			<h2 id="feedback-title" class="font-sans text-lg font-semibold">
				{kind === 'topic' ? 'Suggest a topic' : 'Send feedback'}
			</h2>
			<button type="button" class="text-muted hover:text-fg" aria-label="Close" onclick={close}
				>✕</button
			>
		</div>

		{#if sendStatus === 'sent'}
			<div class="space-y-3 text-sm" role="status">
				<p>
					{kind === 'topic'
						? 'Thanks! Topic suggestions get reviewed and the good ones are added with notes.'
						: 'Thanks, got it. Every message is read.'}
				</p>
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

				{#if kind === 'topic'}
					<div>
						<label for="feedback-topic" class="label">topic name</label>
						<input
							id="feedback-topic"
							class="input"
							required
							minlength="2"
							maxlength="120"
							placeholder="e.g. Web Components, React Server Actions"
							bind:value={topic}
						/>
					</div>
				{/if}
				<div>
					<label for="feedback-message" class="label">
						{kind === 'topic' ? 'what should it cover? (optional)' : 'message'}
					</label>
					<textarea
						id="feedback-message"
						class="input min-h-24 resize-y"
						required={kind !== 'topic'}
						minlength={kind === 'topic' ? 0 : 3}
						maxlength="1800"
						placeholder={kind === 'topic'
							? 'Questions you were asked, links, why it matters…'
							: 'What should be better, broken, or added?'}
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
					{sendStatus === 'sending'
						? 'sending…'
						: kind === 'topic'
							? 'suggest topic'
							: 'send feedback'}
				</button>
			</form>
		{/if}
	</div>
</dialog>
