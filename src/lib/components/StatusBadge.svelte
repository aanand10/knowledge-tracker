<script lang="ts">
	import type { Status } from '#lib/types/index.ts';

	// Svelte 5: props are read with `$props()` (this replaces `export let status`).
	let { status }: { status: Status } = $props();

	const styles: Record<Status, string> = {
		'not-started': 'text-muted',
		learning: 'text-warn',
		confident: 'text-ok'
	};
</script>

<span class="font-mono text-xs whitespace-nowrap {styles[status]}">[{status}]</span>
