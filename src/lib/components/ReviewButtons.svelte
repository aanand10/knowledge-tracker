<script lang="ts">
	import { tick } from 'svelte';
	import { RATINGS, type Rating, type TopicProgress } from '#lib/types/index.ts';
	import { intervalFor } from '#lib/utils/schedule.ts';
	import { RATING_LABELS, plural } from '#lib/utils/labels.ts';

	interface Props {
		progress: TopicProgress;
		onreview: (rating: Rating) => void;
	}

	let { progress, onreview }: Props = $props();

	let open = $state(false);
	let confirmation = $state('');
	// `bind:this` (below) fills this variable with the actual DOM element.
	let group = $state<HTMLDivElement>();
	let trigger = $state<HTMLButtonElement>();

	// Move focus into the rating options when they appear (keyboard users).
	$effect(() => {
		if (open) group?.querySelector('button')?.focus();
	});

	function choose(rating: Rating) {
		const days = intervalFor(progress.intervalStep, rating);
		onreview(rating);
		confirmation = `Marked as reviewed. Next review in ${plural(days, 'day')}.`;
		close();
	}

	function close() {
		open = false;
		// Wait for the "Mark reviewed" button to be re-rendered, then focus it.
		tick().then(() => trigger?.focus());
	}

	function describe(rating: Rating): string {
		const days = intervalFor(progress.intervalStep, rating);
		return days === 1 ? 'tomorrow' : `in ${days} days`;
	}

	const styles: Record<Rating, string> = {
		hard: 'hover:border-danger hover:text-danger',
		ok: 'hover:border-link hover:text-link',
		easy: 'hover:border-ok hover:text-ok'
	};
</script>

<!-- <svelte:window> attaches a listener to `window` and removes it automatically on destroy. -->
<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') close();
	}}
/>

<div>
	{#if open}
		<div bind:this={group} role="group" aria-labelledby="review-question">
			<p id="review-question" class="mb-1.5 text-xs text-muted">how did it go?</p>
			<div class="grid grid-cols-3 gap-1.5">
				{#each RATINGS as rating (rating)}
					{@const days = intervalFor(progress.intervalStep, rating)}
					<button
						type="button"
						class="btn {styles[rating]}"
						aria-label="{RATING_LABELS[rating]}, next review {describe(rating)}"
						onclick={() => choose(rating)}
					>
						{rating} <span class="text-muted">+{days}d</span>
					</button>
				{/each}
			</div>
			<button type="button" class="mt-1.5 text-xs text-muted hover:text-fg" onclick={close}>
				cancel (esc)
			</button>
		</div>
	{:else}
		<button
			bind:this={trigger}
			type="button"
			class="btn-primary w-full"
			onclick={() => {
				confirmation = '';
				open = true;
			}}
		>
			Mark reviewed
		</button>
	{/if}
	<!-- aria-live announces the confirmation to screen-reader users. -->
	<p class="mt-1.5 min-h-4 text-xs text-ok" aria-live="polite">{confirmation}</p>
</div>
