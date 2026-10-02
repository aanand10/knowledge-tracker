<script lang="ts">
	import { contentConfig } from '#lib/config.ts';
	import { content } from '#lib/stores/content.svelte.ts';
	import { progress, type ImportResult } from '#lib/stores/progress.svelte.ts';
	import { todayISO } from '#lib/utils/dates.ts';
	import { plural } from '#lib/utils/labels.ts';

	let importResult = $state<ImportResult | null>(null);
	let confirmingReset = $state(false);
	let resetDone = $state(false);

	const trackedCount = $derived(Object.keys(progress.map).length);

	function exportProgress() {
		const blob = new Blob([progress.exportJSON()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `knowledge-tracker-progress-${todayISO()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	async function importProgress(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		if (!file) return;
		try {
			importResult = progress.importJSON(await file.text());
		} catch {
			importResult = { ok: false, imported: 0, warnings: ["Couldn't read that file."] };
		}
		input.value = ''; // allow importing the same file again
	}

	function reset() {
		progress.reset();
		confirmingReset = false;
		resetDone = true;
	}
</script>

<svelte:head><title>Settings · Knowledge Tracker</title></svelte:head>

<h1 class="mb-4 text-2xl font-bold">Settings</h1>

<div class="space-y-6">
	<section class="space-y-3 card" aria-labelledby="source-heading">
		<h2 id="source-heading" class="text-lg font-semibold">Content source</h2>
		<dl class="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
			<dt class="text-slate-500 dark:text-slate-400">Configured repo</dt>
			<dd class="break-all">
				{#if contentConfig.githubUsername && contentConfig.repo}
					<code>{contentConfig.githubUsername}/{contentConfig.repo}@{contentConfig.branch}</code>
				{:else}
					<span>None. Edit <code>src/lib/config.ts</code> to use your own repo.</span>
				{/if}
			</dd>
			<dt class="text-slate-500 dark:text-slate-400">Currently showing</dt>
			<dd>
				{#if content.status === 'loading'}
					Loading…
				{:else if content.source === 'github'}
					GitHub content
				{:else if content.source === 'sample'}
					Bundled sample content
				{:else}
					Nothing loaded
				{/if}
			</dd>
			{#if content.baseUrl}
				<dt class="text-slate-500 dark:text-slate-400">Base URL</dt>
				<dd class="break-all"><code class="text-xs">{content.baseUrl}</code></dd>
			{/if}
			<dt class="text-slate-500 dark:text-slate-400">Topics loaded</dt>
			<dd>{content.topics.length}</dd>
		</dl>
		<button
			type="button"
			class="btn-primary"
			disabled={content.status === 'loading'}
			onclick={() => content.reload()}
		>
			{content.status === 'loading' ? 'Reloading…' : 'Reload content'}
		</button>
		<p class="text-xs text-slate-500 dark:text-slate-400">
			GitHub's raw CDN can take a few minutes to show changes you just pushed.
		</p>
	</section>

	<section class="space-y-3 card" aria-labelledby="backup-heading">
		<h2 id="backup-heading" class="text-lg font-semibold">Backup & sync</h2>
		<p class="text-sm text-slate-600 dark:text-slate-400">
			Progress lives only in this browser ({plural(trackedCount, 'topic')} tracked). Export it to back
			it up or move it to another device.
		</p>
		<div class="flex flex-wrap gap-2">
			<button type="button" class="btn-secondary" onclick={exportProgress}>Export progress</button>
			<!-- A visually styled label wrapping a hidden file input keeps native keyboard behaviour. -->
			<label
				class="btn-secondary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-500"
			>
				Import progress
				<input
					type="file"
					accept="application/json,.json"
					class="sr-only"
					onchange={importProgress}
				/>
			</label>
		</div>
		{#if importResult}
			<div
				role="status"
				class="rounded-lg p-3 text-sm {importResult.ok
					? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
					: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'}"
			>
				{#if importResult.ok}
					<p>Imported progress for {plural(importResult.imported, 'topic')}.</p>
				{:else}
					<p>Import failed.</p>
				{/if}
				{#if importResult.warnings.length}
					<ul class="mt-1 list-disc pl-5">
						{#each importResult.warnings as warning, i (i)}
							<li>{warning}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
		<p class="text-xs text-slate-500 dark:text-slate-400">
			Importing merges: topics in the file overwrite this device's progress for the same topic;
			everything else is kept.
		</p>
	</section>

	<section
		class="space-y-3 card border-red-200 dark:border-red-900"
		aria-labelledby="danger-heading"
	>
		<h2 id="danger-heading" class="text-lg font-semibold text-red-700 dark:text-red-400">
			Reset progress
		</h2>
		<p class="text-sm text-slate-600 dark:text-slate-400">
			Deletes all statuses, confidence, review history and quick notes on this device. Your GitHub
			notes are not affected.
		</p>
		{#if confirmingReset}
			<div role="alert" class="space-y-2">
				<p class="text-sm font-medium">
					Delete progress for {plural(trackedCount, 'topic')}? This can't be undone.
				</p>
				<div class="flex flex-wrap gap-2">
					<button type="button" class="btn-danger" onclick={reset}>Yes, delete everything</button>
					<button type="button" class="btn-secondary" onclick={() => (confirmingReset = false)}>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<button
				type="button"
				class="btn-secondary text-red-700 dark:text-red-400"
				disabled={trackedCount === 0}
				onclick={() => {
					resetDone = false;
					confirmingReset = true;
				}}
			>
				Reset all progress…
			</button>
			{#if resetDone}
				<p role="status" class="text-sm text-emerald-700 dark:text-emerald-400">
					All progress was reset.
				</p>
			{/if}
		{/if}
	</section>
</div>
