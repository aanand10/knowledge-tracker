<script lang="ts">
	import { cloud } from '#lib/stores/cloud.svelte.ts';

	let open = $state(false);
	let email = $state('');

	const statusText = { off: '', syncing: 'syncing…', synced: 'synced', error: 'sync error' };

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (email.trim()) await cloud.sendMagicLink(email);
	}
</script>

<!-- Renders nothing until Supabase is configured in src/lib/config.ts. -->
{#if cloud.enabled}
	<div class="relative text-xs">
		{#if cloud.user}
			<span
				class="mr-2 hidden sm:inline {cloud.status === 'error' ? 'text-danger' : 'text-muted'}"
				title={cloud.error ?? ''}
				aria-live="polite">{statusText[cloud.status]}</span
			>
			<button
				type="button"
				class="grid size-6 place-items-center rounded-full bg-panel text-fg ring-1 ring-line hover:ring-muted"
				onclick={() => (open = !open)}
				aria-expanded={open}
				aria-label="Account: {cloud.user.email}"
			>
				{(cloud.user.email ?? '?').charAt(0).toUpperCase()}
			</button>
		{:else}
			<button
				type="button"
				class="text-link hover:underline disabled:opacity-50"
				disabled={cloud.busy}
				onclick={() => (open = !open)}
				aria-expanded={open}>{cloud.busy ? '…' : 'sign in'}</button
			>
		{/if}

		{#if open}
			<div
				class="absolute top-8 right-0 z-50 w-64 space-y-2 border border-line bg-bg p-3 shadow-lg"
			>
				{#if cloud.user}
					<p class="break-all text-muted">{cloud.user.email}</p>
					<p class={cloud.status === 'error' ? 'text-danger' : 'text-muted'}>
						{cloud.status === 'error'
							? `error: ${cloud.error}`
							: `progress ${statusText[cloud.status]}`}
					</p>
					<button
						type="button"
						class="btn w-full"
						onclick={() => {
							open = false;
							cloud.signOut();
						}}>sign out</button
					>
				{:else if cloud.linkSentTo}
					<p>Check <span class="text-fg">{cloud.linkSentTo}</span> for a sign-in link.</p>
					<p class="text-muted">Open it on any device to sign in there.</p>
					<button type="button" class="link" onclick={() => (cloud.linkSentTo = null)}
						>use another email</button
					>
				{:else}
					<form onsubmit={submit} class="space-y-2">
						<label for="signin-email" class="label">sign in to sync across devices</label>
						<input
							id="signin-email"
							type="email"
							required
							autocomplete="email"
							class="input"
							placeholder="you@example.com"
							bind:value={email}
						/>
						<button type="submit" class="btn-primary w-full" disabled={cloud.busy}>
							{cloud.busy ? 'sending…' : 'email me a link'}
						</button>
						{#if cloud.error}<p class="text-danger">{cloud.error}</p>{/if}
					</form>
				{/if}
			</div>
		{/if}
	</div>
{/if}
