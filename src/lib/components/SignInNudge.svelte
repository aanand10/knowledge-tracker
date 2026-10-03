<script lang="ts">
	import { cloud } from '#lib/stores/cloud.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { ui } from '#lib/stores/ui.svelte.ts';
	import { STORAGE_KEYS, readString, writeString } from '#lib/stores/storage.ts';
	import { plural } from '#lib/utils/labels.ts';

	const SNOOZE_DAYS = 3;

	let snoozedUntil = $state(Number(readString(STORAGE_KEYS.nudgeSnoozedUntil) ?? 0));
	const tracked = $derived(Object.keys(progress.map).length);
	const show = $derived(
		cloud.enabled && !cloud.user && !cloud.busy && tracked > 0 && Date.now() > snoozedUntil
	);

	function later() {
		snoozedUntil = Date.now() + SNOOZE_DAYS * 86_400_000;
		writeString(STORAGE_KEYS.nudgeSnoozedUntil, String(snoozedUntil));
	}
</script>

{#if show}
	<aside
		class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 border-link bg-panel px-3 py-2 text-xs"
		aria-label="Sign in reminder"
	>
		<p class="min-w-0 flex-1">
			You've tracked <span class="font-semibold">{plural(tracked, 'topic')}</span> on this device. Sign
			in so it's saved and syncs to your phone.
		</p>
		<button type="button" class="btn-primary" onclick={() => ui.openSignIn('signin')}
			>sign in</button
		>
		<button type="button" class="text-muted hover:text-fg" onclick={later}>later</button>
	</aside>
{/if}
