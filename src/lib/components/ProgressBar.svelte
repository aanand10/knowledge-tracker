<script lang="ts">
	import type { StatusCounts } from '#lib/utils/stats.ts';
	import { STATUS_LABELS } from '#lib/utils/labels.ts';
	import { STATUSES } from '#lib/types/index.ts';

	interface Props {
		counts: StatusCounts;
		label: string;
	}

	let { counts, label }: Props = $props();

	// `$derived` values update whenever `counts` changes. Think of them as
	// spreadsheet formulas: always in sync with their inputs.
	const total = $derived(STATUSES.reduce((sum, s) => sum + counts[s], 0));
	const summary = $derived(
		STATUSES.map((s) => `${counts[s]} ${STATUS_LABELS[s].toLowerCase()}`).join(', ')
	);

	const colors = { confident: 'bg-ok', learning: 'bg-warn' } as const;
	const order = ['confident', 'learning'] as const;
</script>

<!-- One table-like row: label | bar | confident/learning/total -->
<div
	class="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[10rem_1fr_auto]"
>
	<span class="truncate">{label}</span>
	<div class="flex h-1.5 bg-line" role="img" aria-label="{label}: {summary}">
		{#each order as status (status)}
			{#if total && counts[status]}
				<div class={colors[status]} style:width="{(counts[status] / total) * 100}%"></div>
			{/if}
		{/each}
	</div>
	<span class="text-muted tabular-nums" aria-hidden="true">
		<span class="text-ok">{counts.confident}</span>/<span class="text-warn">{counts.learning}</span
		>/{total}
	</span>
</div>
