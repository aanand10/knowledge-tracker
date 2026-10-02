<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { content, isAbort } from '#lib/stores/content.svelte.ts';
	import { progress } from '#lib/stores/progress.svelte.ts';
	import type { Rating } from '#lib/types/index.ts';
	import { relativeDay, todayISO } from '#lib/utils/dates.ts';
	import ContentGate from '#lib/components/ContentGate.svelte';
	import StateMessage from '#lib/components/StateMessage.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import PriorityBadge from '#lib/components/PriorityBadge.svelte';
	import MarkdownViewer from '#lib/components/MarkdownViewer.svelte';
	import ReviewButtons from '#lib/components/ReviewButtons.svelte';
	import ConfidenceInput from '#lib/components/ConfidenceInput.svelte';
	import StatusPicker from '#lib/components/StatusPicker.svelte';

	const id = $derived(page.params.id ?? '');
	const topic = $derived(content.byId.get(id));
	const topicProgress = $derived(progress.get(id));
	const today = todayISO();

	// Previous / next topic in the same category (in topics.json order).
	const siblings = $derived(
		topic ? content.topics.filter((t) => t.category === topic.category) : []
	);
	const index = $derived(siblings.findIndex((t) => t.id === id));
	const prev = $derived(index > 0 ? siblings[index - 1] : undefined);
	const next = $derived(index >= 0 ? siblings[index + 1] : undefined);

	type NoteState =
		| { kind: 'none' }
		| { kind: 'loading' }
		| { kind: 'ready'; markdown: string }
		| { kind: 'error'; message: string };

	let note = $state<NoteState>({ kind: 'loading' });

	// Fetch the note whenever the topic changes. If you navigate to another topic
	// before the request finishes, the cleanup aborts it (no stale note flashes in).
	$effect(() => {
		const current = topic;
		if (!current) return;
		if (!current.note) {
			note = { kind: 'none' };
			return;
		}

		const controller = new AbortController();
		note = { kind: 'loading' };
		content
			.loadNote(current, controller.signal)
			.then((markdown) => {
				note = markdown === null ? { kind: 'none' } : { kind: 'ready', markdown };
			})
			.catch((error: unknown) => {
				if (isAbort(error)) return;
				note = { kind: 'error', message: error instanceof Error ? error.message : String(error) };
			});

		return () => controller.abort();
	});

	function review(rating: Rating) {
		progress.review(id, rating);
	}
</script>

<svelte:head>
	<title>{topic?.title ?? 'Topic'} · Knowledge Tracker</title>
</svelte:head>

<ContentGate>
	{#if !topic}
		<StateMessage kind="empty" title="Topic not found">
			<p>
				No topic with id <code>{id}</code>.
				<a class="text-indigo-600 underline dark:text-indigo-400" href={resolve('/topics')}
					>See all topics</a
				>
			</p>
		</StateMessage>
	{:else}
		<nav aria-label="Breadcrumb" class="mb-3 text-sm text-slate-500 dark:text-slate-400">
			<a class="hover:underline" href={resolve('/topics')}>Topics</a>
			<span aria-hidden="true"> / </span>
			<a
				class="hover:underline"
				href={resolve(`/topics?category=${encodeURIComponent(topic.category)}`)}
			>
				{topic.category}
			</a>
		</nav>

		<header class="mb-6">
			<h1 class="text-2xl font-bold text-balance sm:text-3xl">{topic.title}</h1>
			<div class="mt-2 flex flex-wrap items-center gap-1.5">
				<StatusBadge status={topicProgress.status} />
				<PriorityBadge priority={topic.priority} />
				{#each topic.tags as tag (tag)}
					<a
						href={resolve(`/topics?tag=${encodeURIComponent(tag)}`)}
						class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
					>
						#{tag}
					</a>
				{/each}
			</div>
		</header>

		<!-- On wide screens: note on the left, your progress on the right. -->
		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
			<!-- {#key} recreates the editor panel per topic, resetting local UI state like the open review menu. -->
			{#key topic.id}
				<aside class="space-y-5 lg:order-last" aria-label="Your progress">
					<section class="space-y-4 card">
						<h2 class="font-semibold">Review</h2>
						<dl class="grid grid-cols-2 gap-2 text-sm">
							<div>
								<dt class="text-slate-500 dark:text-slate-400">Next review</dt>
								<dd class="font-medium">
									{topicProgress.nextReview
										? relativeDay(topicProgress.nextReview, today)
										: 'Not scheduled'}
								</dd>
							</div>
							<div>
								<dt class="text-slate-500 dark:text-slate-400">Reviews</dt>
								<dd class="font-medium">{topicProgress.reviewCount}</dd>
							</div>
							<div class="col-span-2">
								<dt class="text-slate-500 dark:text-slate-400">Last reviewed</dt>
								<dd class="font-medium">
									{topicProgress.lastReviewed
										? relativeDay(topicProgress.lastReviewed, today)
										: 'Never'}
								</dd>
							</div>
						</dl>
						<ReviewButtons progress={topicProgress} onreview={review} />
					</section>

					<section class="space-y-4 card">
						<h2 class="font-semibold">Progress</h2>
						<StatusPicker
							value={topicProgress.status}
							onchange={(status) => progress.update(id, { status })}
						/>
						<ConfidenceInput
							value={topicProgress.confidence}
							onchange={(confidence) => progress.update(id, { confidence })}
						/>
						<div>
							<label for="quick-notes" class="label">Quick notes</label>
							<textarea
								id="quick-notes"
								class="input min-h-24 resize-y"
								maxlength="2000"
								placeholder="Things to remember, mistakes you made…"
								value={topicProgress.quickNotes}
								oninput={(e) => progress.update(id, { quickNotes: e.currentTarget.value })}
							></textarea>
							<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
								Saved automatically on this device.
							</p>
						</div>
					</section>

					{#if topic.resources.length > 0}
						<section class="card">
							<h2 class="mb-2 font-semibold">Resources</h2>
							<ul class="space-y-1.5 text-sm">
								{#each topic.resources as resource (resource.url)}
									<li>
										<a
											href={resource.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
										>
											{resource.label}
											<span class="sr-only">(opens in a new tab)</span>
											<span aria-hidden="true">↗</span>
										</a>
									</li>
								{/each}
							</ul>
						</section>
					{/if}
				</aside>
			{/key}

			<div class="min-w-0">
				{#if note.kind === 'loading'}
					<StateMessage kind="loading" title="Loading note…" />
				{:else if note.kind === 'error'}
					<StateMessage kind="error" title="Couldn't load the note">
						<p>{note.message}</p>
					</StateMessage>
				{:else if note.kind === 'none'}
					<StateMessage kind="empty" title="No note for this topic yet">
						<p>Add a <code>note</code> path to this topic in <code>topics.json</code>.</p>
					</StateMessage>
				{:else}
					<MarkdownViewer markdown={note.markdown} baseUrl={content.noteUrl(topic)} />
				{/if}
			</div>
		</div>

		<nav
			aria-label="Topics in {topic.category}"
			class="mt-10 grid grid-cols-2 gap-3 border-t border-slate-200 pt-6 dark:border-slate-800"
		>
			{#if prev}
				<a
					href={resolve('/topics/[id]', { id: prev.id })}
					class="card hover:border-indigo-300 dark:hover:border-indigo-700"
				>
					<span class="block text-xs text-slate-500 dark:text-slate-400">← Previous</span>
					<span class="font-medium">{prev.title}</span>
				</a>
			{:else}
				<span></span>
			{/if}
			{#if next}
				<a
					href={resolve('/topics/[id]', { id: next.id })}
					class="card text-right hover:border-indigo-300 dark:hover:border-indigo-700"
				>
					<span class="block text-xs text-slate-500 dark:text-slate-400">Next →</span>
					<span class="font-medium">{next.title}</span>
				</a>
			{/if}
		</nav>
	{/if}
</ContentGate>
