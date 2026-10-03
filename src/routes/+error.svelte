<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>Error · Recall</title></svelte:head>

<div class="box px-3 py-4 text-xs">
	<p class="text-danger">error {page.status}: {page.error?.message ?? 'something went wrong'}</p>
	<a class="mt-2 inline-block link" href={resolve('/')}>← back to topics</a>
</div>
