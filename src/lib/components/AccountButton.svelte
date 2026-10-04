<script lang="ts">
	import { resolve } from '$app/paths';
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';

	let open = $state(false);
	let editingName = $state(false);
	let nameDraft = $state('');
	let root = $state<HTMLDivElement>();

	const status = {
		off: { text: 'not syncing', dot: 'bg-muted' },
		syncing: { text: 'syncing…', dot: 'bg-warn' },
		synced: { text: 'all progress synced', dot: 'bg-ok' },
		error: { text: 'sync error', dot: 'bg-danger' }
	} as const;

	/** "Anand Suryawanshi" → "AS", "anand" → "A". */
	const initials = $derived(
		(cloud.user?.name ?? '?')
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w.charAt(0).toUpperCase())
			.join('')
	);

	function close() {
		open = false;
		editingName = false;
	}

	// Close when clicking anywhere outside the menu.
	function onWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) close();
	}
</script>

<svelte:window
	onclick={onWindowClick}
	onkeydown={(e) => {
		if (open && e.key === 'Escape') close();
	}}
/>

<!-- Renders nothing until Supabase is configured in src/lib/config.ts. -->
{#if cloud.enabled}
	<div class="relative flex items-center text-xs" bind:this={root}>
		{#if cloud.user}
			<button
				type="button"
				class="relative grid size-7 place-items-center rounded-full bg-panel text-[11px] font-semibold text-fg ring-1 ring-line hover:ring-muted"
				onclick={() => (open = !open)}
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label="Account: {cloud.user.name}, {status[cloud.status].text}"
				title={status[cloud.status].text}
			>
				{initials}
				<!-- Sync status dot on the avatar. -->
				<span
					class="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-bg {status[
						cloud.status
					].dot} {cloud.status === 'syncing' ? 'animate-pulse' : ''}"
					aria-hidden="true"
				></span>
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
				class="absolute top-9 right-0 z-50 w-72 border border-line bg-bg shadow-xl"
				role="menu"
				aria-label="Account"
			>
				<!-- Profile header -->
				<div class="flex items-center gap-3 border-b border-line p-3">
					<span
						class="grid size-10 shrink-0 place-items-center rounded-full bg-panel text-sm font-semibold ring-1 ring-line"
						aria-hidden="true">{initials}</span
					>
					<div class="min-w-0 flex-1">
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
								<!-- svelte-ignore a11y_autofocus -->
								<input
									id="display-name"
									class="input min-h-7 py-0.5"
									maxlength="60"
									minlength="2"
									required
									autofocus
									bind:value={nameDraft}
								/>
								<button type="submit" class="btn min-h-7">save</button>
							</form>
						{:else}
							<p class="truncate font-sans text-sm font-semibold text-fg">{cloud.user.name}</p>
							<p class="truncate text-muted">{cloud.user.email}</p>
						{/if}
					</div>
				</div>

				<!-- Status + actions -->
				<div class="space-y-1 p-1.5">
					<p class="flex items-center gap-2 px-2 py-1.5 text-muted" aria-live="polite">
						<span class="size-2 rounded-full {status[cloud.status].dot}" aria-hidden="true"></span>
						{cloud.status === 'error' && cloud.error ? cloud.error : status[cloud.status].text}
					</p>
					{#if !editingName}
						<button
							type="button"
							role="menuitem"
							class="block w-full px-2 py-1.5 text-left hover:bg-panel"
							onclick={() => {
								nameDraft = cloud.user?.name ?? '';
								editingName = true;
							}}>edit name</button
						>
					{/if}
					<a
						role="menuitem"
						class="block px-2 py-1.5 hover:bg-panel"
						href={resolve('/settings')}
						onclick={close}>settings &amp; backup</a
					>
				</div>
				<div class="border-t border-line p-1.5">
					<button
						type="button"
						role="menuitem"
						class="block w-full px-2 py-1.5 text-left text-danger hover:bg-panel"
						onclick={() => {
							close();
							cloud.signOut();
						}}>sign out</button
					>
				</div>
			</div>
		{/if}
	</div>
{/if}
