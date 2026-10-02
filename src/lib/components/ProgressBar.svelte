<script lang="ts">
	import type { StatusCounts } from '#lib/utils/stats.ts';
	import { STATUS_LABELS } from '#lib/utils/labels.ts';
	import { STATUSES } from '#lib/types/index.ts';

	interface Props {
		counts: StatusCounts;
		label: string;
		/** Show the per-status numbers under the bar. */
		showLegend?: boolean;
	}

	// Default values are given with destructuring defaults.
	let { counts, label, showLegend = true }: Props = $props();

	// `$derived` values update whenever `counts` changes. Think of them as
	// spreadsheet formulas: always in sync with their inputs.
	const total = $derived(STATUSES.reduce((sum, s) => sum + counts[s], 0));
	const percentDone = $derived(total ? Math.round((counts.confident / total) * 100) : 0);
	const summary = $derived(
		STATUSES.map((s) => `${counts[s]} ${STATUS_LABELS[s].toLowerCase()}`).join(', ')
	);

	const colors = {
		confident: 'bg-emerald-500',
		learning: 'bg-amber-400',
		'not-started': 'bg-slate-200 dark:bg-slate-700'
	} as const;
	const order = ['confident', 'learning', 'not-started'] as const;
</script>

<div>
	<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
		<span class="font-medium">{label}</span>
		<span class="text-slate-500 tabular-nums dark:text-slate-400">{percentDone}% confident</span>
	</div>
	<div
		class="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
		role="img"
		aria-label="{label}: {summary}"
	>
		{#each order as status (status)}
			{#if total && counts[status]}
				<div class={colors[status]} style:width="{(counts[status] / total) * 100}%"></div>
			{/if}
		{/each}
	</div>
	{#if showLegend}
		<ul
			class="mt-1.5 flex flex-wrap gap-x-3 text-xs text-slate-600 dark:text-slate-400"
			aria-hidden="true"
		>
			{#each order as status (status)}
				<li class="flex items-center gap-1">
					<span class="size-2 rounded-full {colors[status]}"></span>
					{counts[status]}
					{STATUS_LABELS[status].toLowerCase()}
				</li>
			{/each}
		</ul>
	{/if}
</div>
