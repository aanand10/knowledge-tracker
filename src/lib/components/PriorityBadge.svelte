<script lang="ts">
	import type { Priority } from '#lib/types/index.ts';

	let { priority }: { priority: Priority } = $props();

	const styles: Record<Priority, string> = {
		high: 'text-danger',
		medium: 'text-fg',
		low: 'text-muted'
	};
	const short: Record<Priority, string> = { high: 'high', medium: 'med', low: 'low' };
</script>

<span class="font-mono text-xs whitespace-nowrap {styles[priority]}">
	<span class="sr-only">Priority:</span>{short[priority]}
</span>
