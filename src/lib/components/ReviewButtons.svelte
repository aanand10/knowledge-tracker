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
		hard: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950',
		ok: 'border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950',
		easy: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950'
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
			<p id="review-question" class="mb-2 text-sm font-medium">How did it go?</p>
			<div class="grid grid-cols-3 gap-2">
				{#each RATINGS as rating (rating)}
					<button
						type="button"
						class="btn flex-col gap-0 border {styles[rating]}"
						onclick={() => choose(rating)}
					>
						<span>{RATING_LABELS[rating]}</span>
						<span class="text-xs font-normal opacity-80">{describe(rating)}</span>
					</button>
				{/each}
			</div>
			<button
				type="button"
				class="mt-2 text-sm text-slate-500 underline-offset-2 hover:underline"
				onclick={close}
			>
				Cancel
			</button>
		</div>
	{:else}
		<button
			bind:this={trigger}
			type="button"
			class="btn-primary w-full sm:w-auto"
			onclick={() => {
				confirmation = '';
				open = true;
			}}
		>
			Mark reviewed
		</button>
	{/if}
	<!-- aria-live announces the confirmation to screen-reader users. -->
	<p class="mt-2 min-h-5 text-sm text-emerald-700 dark:text-emerald-400" aria-live="polite">
		{confirmation}
	</p>
</div>
