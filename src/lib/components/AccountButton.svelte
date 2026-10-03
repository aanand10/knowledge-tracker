<script lang="ts">
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';

	let open = $state(false);
	let editingName = $state(false);
	let nameDraft = $state('');

	const statusText = { off: '', syncing: 'syncing…', synced: 'synced', error: 'sync error' };
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
				aria-label="Account: {cloud.user.name}"
			>
				{cloud.user.name.charAt(0).toUpperCase()}
			</button>
		{:else}
			<button
				type="button"
				class="text-link hover:underline disabled:opacity-50"
				disabled={cloud.busy}
				onclick={() => ui.openSignIn('signin')}>{cloud.busy ? '…' : 'sign in'}</button
			>
		{/if}

		{#if open && cloud.user}
			<div
				class="absolute top-8 right-0 z-50 w-64 space-y-2 border border-line bg-bg p-3 shadow-lg"
			>
				{#if cloud.user}
					{#if editingName}
						<form
							class="flex gap-1.5"
							onsubmit={async (e) => {
								e.preventDefault();
								await cloud.updateName(nameDraft);
								editingName = false;
							}}
						>
							<label for="display-name" class="sr-only">Your name</label>
							<input id="display-name" class="input" maxlength="60" bind:value={nameDraft} />
							<button type="submit" class="btn">save</button>
						</form>
					{:else}
						<p class="flex items-baseline justify-between gap-2">
							<span class="font-semibold text-fg">{cloud.user.name}</span>
							<button
								type="button"
								class="link"
								onclick={() => {
									nameDraft = cloud.user?.name ?? '';
									editingName = true;
								}}>edit</button
							>
						</p>
					{/if}
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
				{/if}
			</div>
		{/if}
	</div>
{/if}
