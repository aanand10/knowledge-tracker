<script lang="ts">
	// Renders a title like "`$state` and `$derived`" with the backticked parts as <code>.
	// Splitting the string (instead of {@html}) keeps it safe from injected HTML.
	let { title }: { title: string } = $props();

	const parts = $derived(
		title
			.split(/(`[^`]+`)/)
			.filter(Boolean)
			.map((part) =>
				part.startsWith('`') && part.endsWith('`')
					? { code: true, text: part.slice(1, -1) }
					: { code: false, text: part }
			)
	);
</script>

{#each parts as part, i (i)}{#if part.code}<code
			class="rounded-sm bg-panel px-1 font-mono text-[0.9em]">{part.text}</code
		>{:else}{part.text}{/if}{/each}
