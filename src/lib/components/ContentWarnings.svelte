<script lang="ts">
	import { content } from '#lib/stores/content.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import { plural } from '#lib/utils/labels.ts';
</script>

{#if progress.saveFailed}
	<p role="alert" class="mb-4 border-l-2 border-danger py-1 pl-3 text-xs text-danger">
		error: progress couldn't be saved (storage full or blocked?). Export it from settings to keep a
		copy.
	</p>
{/if}

{#if content.warnings.length > 0}
	<details class="mb-4 border-l-2 border-warn py-1 pl-3 text-xs">
		<summary class="cursor-pointer text-warn">
			warning: {plural(content.warnings.length, 'content issue')}
		</summary>
		<ul class="mt-1 space-y-0.5 text-muted">
			{#each content.warnings as warning, i (i)}
				<li>- {warning}</li>
			{/each}
		</ul>
	</details>
{/if}
