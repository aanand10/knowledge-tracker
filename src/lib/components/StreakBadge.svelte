<script lang="ts">
	import { resolve } from '$app/paths';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { reviewStreak } from '#lib/utils/stats.ts';
	import { todayISO } from '#lib/utils/dates.ts';
	import { plural } from '#lib/utils/labels.ts';

	const today = todayISO();
	// Same logic as the dashboard's "streak" stat, so the numbers always match.
	const streak = $derived(reviewStreak(progress.map, today));
	const doneToday = $derived(Object.values(progress.map).some((p) => p.history.includes(today)));

	const hint = $derived(
		streak === 0
			? 'No streak yet. Mark a topic reviewed to start one.'
			: doneToday
				? `${plural(streak, 'day')} streak. You reviewed today, nice.`
				: `${plural(streak, 'day')} streak. Review a topic today to keep it.`
	);
</script>

<a
	href={resolve('/dashboard')}
	class="flex items-center gap-1 text-xs tabular-nums {doneToday
		? 'text-warn'
		: 'text-muted hover:text-fg'}"
	title={hint}
	aria-label={hint}
>
	<!-- Flame: filled when today's review is done, outlined when the streak is at risk. -->
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill={doneToday ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width="2"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5 0 2 1 3 2 3-.5-3 0-6 1-9Z" />
	</svg>
	<span>{streak}</span>
</a>
