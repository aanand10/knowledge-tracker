<script lang="ts">
	import type { Priority } from '#lib/types/index.ts';
	import { PRIORITY_LABELS } from '#lib/utils/labels.ts';

	let { priority }: { priority: Priority } = $props();

	const styles: Record<Priority, string> = {
		high: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-300',
		medium: 'border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300',
		low: 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-400'
	};
</script>

<span
	class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium {styles[
		priority
	]}"
>
	<span class="sr-only">Priority:</span>
	{PRIORITY_LABELS[priority]}
</span>
