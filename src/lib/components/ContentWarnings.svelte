<script lang="ts">
	import { content } from '#lib/stores/content.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { plural } from '#lib/utils/labels.ts';
</script>

{#if progress.saveFailed}
	<p
		role="alert"
		class="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
	>
		Your progress couldn't be saved. Browser storage may be full or blocked (private mode?). Export
		your progress from Settings to keep a copy.
	</p>
{/if}

{#if content.warnings.length > 0}
	<details
		class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
	>
		<summary class="cursor-pointer font-medium">
			{plural(content.warnings.length, 'content warning')}
		</summary>
		<ul class="mt-2 list-disc space-y-1 pl-5">
			{#each content.warnings as warning, i (i)}
				<li>{warning}</li>
			{/each}
		</ul>
	</details>
{/if}
