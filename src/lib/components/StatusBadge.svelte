<script lang="ts">
	import type { Status } from '#lib/types/index.ts';
	import { STATUS_LABELS } from '#lib/utils/labels.ts';

	// Svelte 5: props are read with `$props()` (this replaces `export let status`).
	let { status }: { status: Status } = $props();

	const styles: Record<Status, string> = {
		'not-started': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
		learning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
		confident: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {styles[status]}"
>
	{STATUS_LABELS[status]}
</span>
