<script lang="ts">
	import type { TocItem } from '#lib/utils/markdown.ts';

	let { items }: { items: TocItem[] } = $props();
</script>

<nav aria-label="Table of contents" class="border-l-2 border-line pl-3 text-xs">
	<!-- <details> gives a collapsible TOC with zero JavaScript and full keyboard support. -->
	<details open>
		<summary class="cursor-pointer text-muted select-none">contents</summary>
		<ol class="mt-1.5 space-y-1">
			{#each items as item (item.id)}
				<li class={item.depth === 3 ? 'pl-3' : ''}>
					<a href="#{item.id}" class="link">{item.text}</a>
				</li>
			{/each}
		</ol>
	</details>
</nav>
