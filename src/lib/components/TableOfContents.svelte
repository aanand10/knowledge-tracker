<script lang="ts">
	import type { TocItem } from '#lib/utils/markdown.ts';

	let { items }: { items: TocItem[] } = $props();
</script>

<nav aria-label="Table of contents" class="card text-sm">
	<!-- <details> gives a collapsible TOC with zero JavaScript and full keyboard support. -->
	<details open>
		<summary class="cursor-pointer font-semibold select-none">On this page</summary>
		<ol class="mt-2 space-y-1">
			{#each items as item (item.id)}
				<li class={item.depth === 3 ? 'pl-4' : ''}>
					<a
						href="#{item.id}"
						class="text-slate-600 underline-offset-2 hover:text-indigo-600 hover:underline dark:text-slate-400 dark:hover:text-indigo-400"
					>
						{item.text}
					</a>
				</li>
			{/each}
		</ol>
	</details>
</nav>
