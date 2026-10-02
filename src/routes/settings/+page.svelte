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

<h1 class="sr-only">Settings</h1>

<div class="space-y-5">
	<section class="box" aria-labelledby="source-heading">
		<h2 id="source-heading" class="box-head">content source</h2>
		<div class="space-y-3 p-3">
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
				<dt class="text-muted">repo</dt>
				<dd class="break-all">
					{#if contentConfig.githubUsername && contentConfig.repo}
						{contentConfig.githubUsername}/{contentConfig.repo}@{contentConfig.branch}
					{:else}
						<span class="text-muted">none (edit src/lib/config.ts)</span>
					{/if}
				</dd>
				<dt class="text-muted">source</dt>
				<dd>
					{#if content.status === 'loading'}
						loading…
					{:else if content.source === 'github'}
						<span class="text-ok">github</span>
					{:else if content.source === 'sample'}
						<span class="text-warn">bundled sample</span>
					{:else}
						-
					{/if}
				</dd>
				{#if content.baseUrl}
					<dt class="text-muted">url</dt>
					<dd class="break-all">{content.baseUrl}</dd>
				{/if}
				<dt class="text-muted">topics</dt>
				<dd>{content.topics.length}</dd>
			</dl>
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					class="btn"
					disabled={content.status === 'loading'}
					onclick={() => content.reload()}
				>
					{content.status === 'loading' ? 'reloading…' : 'reload content'}
				</button>
				<span class="text-xs text-muted">raw.githubusercontent caches for a few minutes</span>
			</div>
		</div>
	</section>

	<section class="box" aria-labelledby="backup-heading">
		<h2 id="backup-heading" class="box-head">backup / sync</h2>
		<div class="space-y-3 p-3 text-xs">
			<p class="text-muted">
				Progress is stored in this browser only ({plural(trackedCount, 'topic')} tracked). Export it to
				back up or move to another device. Import merges by topic id.
			</p>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="btn" onclick={exportProgress}>export .json</button>
				<!-- A styled label wrapping a hidden file input keeps native keyboard behaviour. -->
				<label
					class="btn cursor-pointer focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-link"
				>
					import .json
					<input
						type="file"
						accept="application/json,.json"
						class="sr-only"
						onchange={importProgress}
					/>
				</label>
			</div>
			{#if importResult}
				<div role="status" class={importResult.ok ? 'text-ok' : 'text-danger'}>
					<p>
						{importResult.ok
							? `imported progress for ${plural(importResult.imported, 'topic')}`
							: 'error: import failed'}
					</p>
					{#if importResult.warnings.length}
						<ul class="mt-1 text-muted">
							{#each importResult.warnings as warning, i (i)}
								<li>- {warning}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<section class="box border-danger/50" aria-labelledby="danger-heading">
		<h2 id="danger-heading" class="box-head border-danger/50 text-danger">danger zone</h2>
		<div class="space-y-3 p-3 text-xs">
			<p class="text-muted">
				Deletes all statuses, confidence, review history and quick notes on this device. Your GitHub
				notes are not affected.
			</p>
			{#if confirmingReset}
				<div role="alert" class="space-y-2">
					<p>Delete progress for {plural(trackedCount, 'topic')}? This can't be undone.</p>
					<div class="flex flex-wrap gap-2">
						<button type="button" class="btn-danger" onclick={reset}>yes, delete everything</button>
						<button type="button" class="btn" onclick={() => (confirmingReset = false)}>
							cancel
						</button>
					</div>
				</div>
			{:else}
				<button
					type="button"
					class="btn-danger"
					disabled={trackedCount === 0}
					onclick={() => {
						resetDone = false;
						confirmingReset = true;
					}}
				>
					reset all progress…
				</button>
				{#if resetDone}
					<p role="status" class="text-ok">all progress was reset.</p>
				{/if}
			{/if}
		</div>
	</section>
</div>
