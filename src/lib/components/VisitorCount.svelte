<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchVisitorCount } from '#lib/utils/analytics.ts';

	let count = $state<string | null>(null);

	onMount(() => {
		const controller = new AbortController();
		fetchVisitorCount(controller.signal).then((value) => (count = value));
		// Returning a function from onMount = cleanup when the component is destroyed.
		return () => controller.abort();
	});
</script>

{#if count}
	<span>{count} visitors</span>
{/if}
