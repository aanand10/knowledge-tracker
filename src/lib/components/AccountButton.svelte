<script lang="ts">
	import { resolve } from '$app/paths';
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { streakInfo } from '#lib/utils/stats.ts';
	import { todayISO } from '#lib/utils/dates.ts';

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

	// The day streak lives on the avatar to save header space.
	const streak = $derived(streakInfo(progress.map, todayISO()));
	const streakText = $derived(
		streak.streak === 0
			? 'no streak yet'
			: `${streak.streak}-day streak${streak.doneToday ? ', reviewed today' : ', review today to keep it'}`
	);
	const FLAME =
		'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z';

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
				class="relative grid size-7 place-items-center rounded-full bg-panel text-[11px] font-semibold text-fg ring-2 {streak.doneToday
					? 'ring-warn'
					: 'ring-line hover:ring-muted'}"
				onclick={() => (open = !open)}
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label="Account: {cloud.user.name}, {streakText}, {status[cloud.status].text}"
				title="{streakText} · {status[cloud.status].text}"
			>
				{initials}
				<!-- Sync status dot (top right). -->
				<span
					class="absolute -top-0.5 -right-0.5 size-2 rounded-full ring-2 ring-bg {status[
						cloud.status
					].dot} {cloud.status === 'syncing' ? 'animate-pulse' : ''}"
					aria-hidden="true"
				></span>
				<!-- Streak pill hanging off the bottom of the avatar. -->
				{#if streak.streak > 0}
					<span
						class="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-px rounded-full bg-bg px-1 text-[9px] leading-3 tabular-nums ring-1 {streak.doneToday
							? 'text-warn ring-warn'
							: 'text-muted ring-line'}"
						aria-hidden="true"
					>
						<svg class="size-2.5" viewBox="0 0 24 24" fill="currentColor"><path d={FLAME} /></svg
						>{streak.streak}
					</span>
				{/if}
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
					<p
						class="flex items-center gap-2 px-2 py-1.5 {streak.doneToday
							? 'text-warn'
							: 'text-muted'}"
					>
						<svg class="size-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
							><path d={FLAME} /></svg
						>
						{streakText}
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
					<button
						type="button"
						role="menuitem"
						class="block w-full px-2 py-1.5 text-left hover:bg-panel"
						onclick={() => {
							close();
							ui.openFeedback();
						}}>send feedback</button
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
