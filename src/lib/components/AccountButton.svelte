<script lang="ts">
	import { cloud } from '#lib/stores/cloud.svelte.ts';

	const statusText = {
		off: '',
		idle: '',
		syncing: 'syncing…',
		synced: 'synced',
		error: 'sync error'
	};
</script>

<!-- Renders nothing until Firebase is configured in src/lib/config.ts. -->
{#if cloud.enabled}
	{#if cloud.user}
		<div class="flex items-center gap-2 text-xs">
			<span
				class="hidden sm:inline {cloud.status === 'error' ? 'text-danger' : 'text-muted'}"
				title={cloud.error ?? ''}
				aria-live="polite">{statusText[cloud.status]}</span
			>
			<button
				type="button"
				class="text-muted hover:text-fg"
				onclick={() => cloud.signOut()}
				title="Signed in as {cloud.user.email ?? cloud.user.name}. Click to sign out."
				aria-label="Sign out ({cloud.user.name})"
			>
				{#if cloud.user.photoURL}
					<img
						src={cloud.user.photoURL}
						alt=""
						class="size-6 rounded-full"
						referrerpolicy="no-referrer"
					/>
				{:else}
					<span class="grid size-6 place-items-center rounded-full bg-panel text-fg"
						>{cloud.user.name.charAt(0).toUpperCase()}</span
					>
				{/if}
			</button>
		</div>
	{:else}
		<button
			type="button"
			class="text-xs text-link hover:underline disabled:opacity-50"
			disabled={cloud.busy}
			onclick={() => cloud.signIn()}
		>
			{cloud.busy ? '…' : 'sign in'}
		</button>
	{/if}
{/if}
