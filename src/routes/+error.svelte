<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>Error · Knowledge Tracker</title></svelte:head>

<div class="card py-10 text-center">
	<h1 class="text-2xl font-bold">{page.status}</h1>
	<p class="mt-2 text-slate-600 dark:text-slate-400">
		{page.error?.message ?? 'Something went wrong.'}
	</p>
	<a class="mt-4 btn-primary" href={resolve('/')}>Back to dashboard</a>
</div>
