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
	import TopicTitle from '#lib/components/TopicTitle.svelte';

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
	<title>{topic?.title.replaceAll('`', '') ?? 'Topic'} · Recall</title>
</svelte:head>

<ContentGate>
	{#if !topic}
		<StateMessage kind="empty" title="topic not found: {id}">
			<a class="link" href={resolve('/')}>← all topics</a>
		</StateMessage>
	{:else}
		<nav aria-label="Breadcrumb" class="mb-2 text-xs text-muted">
			<a class="link" href={resolve('/')}>topics</a>
			<span aria-hidden="true">/</span>
			<a class="link" href={resolve(`/?category=${encodeURIComponent(topic.category)}`)}>
				{topic.category}
			</a>
			<span aria-hidden="true">/</span>
			<span>{topic.id}</span>
		</nav>

		<header class="mb-5 border-b border-line pb-3">
			<h1 class="font-sans text-2xl font-semibold text-balance">
				<TopicTitle title={topic.title} />
			</h1>
			<div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted">
				<StatusBadge status={topicProgress.status} />
				<span>priority:<PriorityBadge priority={topic.priority} /></span>
				{#each topic.tags as tag (tag)}
					<a href={resolve(`/?tag=${encodeURIComponent(tag)}`)} class="hover:text-link">
						#{tag}
					</a>
				{/each}
			</div>
		</header>

		<!-- On wide screens: note on the left, your progress on the right. -->
		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
			<!-- {#key} recreates the panel per topic, resetting local UI state like the open review menu. -->
			{#key topic.id}
				<aside class="space-y-4 lg:order-last" aria-label="Your progress">
					<section class="box">
						<h2 class="box-head">review</h2>
						<div class="space-y-3 p-3">
							<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
								<dt class="text-muted">next</dt>
								<dd>
									{topicProgress.nextReview
										? `${topicProgress.nextReview} (${relativeDay(topicProgress.nextReview, today)})`
										: '-'}
								</dd>
								<dt class="text-muted">last</dt>
								<dd>{topicProgress.lastReviewed ?? 'never'}</dd>
								<dt class="text-muted">count</dt>
								<dd>{topicProgress.reviewCount}</dd>
							</dl>
							<ReviewButtons progress={topicProgress} onreview={review} />
						</div>
					</section>

					<section class="box">
						<h2 class="box-head">progress</h2>
						<div class="space-y-3 p-3">
							<StatusPicker
								value={topicProgress.status}
								onchange={(status) => progress.update(id, { status })}
							/>
							<ConfidenceInput
								value={topicProgress.confidence}
								onchange={(confidence) => progress.update(id, { confidence })}
							/>
							<div>
								<label for="quick-notes" class="label">quick notes (saved locally)</label>
								<textarea
									id="quick-notes"
									class="input min-h-20 resize-y"
									maxlength="2000"
									placeholder="things to remember…"
									value={topicProgress.quickNotes}
									oninput={(e) => progress.update(id, { quickNotes: e.currentTarget.value })}
								></textarea>
							</div>
						</div>
					</section>

					{#if topic.resources.length > 0}
						<section class="box">
							<h2 class="box-head">resources</h2>
							<ul class="space-y-1 p-3 text-xs">
								{#each topic.resources as resource (resource.url)}
									<li>
										<a href={resource.url} target="_blank" rel="noopener noreferrer" class="link">
											{resource.label}<span class="sr-only"> (opens in a new tab)</span>
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
					<StateMessage kind="loading" title="loading note…" />
				{:else if note.kind === 'error'}
					<StateMessage kind="error" title="couldn't load the note">
						<p>{note.message}</p>
					</StateMessage>
				{:else if note.kind === 'none'}
					<StateMessage kind="empty" title="no note for this topic yet">
						<p>Add a <code>note</code> path to this topic in <code>topics.json</code>.</p>
					</StateMessage>
				{:else}
					<MarkdownViewer markdown={note.markdown} baseUrl={content.noteUrl(topic)} />
				{/if}
			</div>
		</div>

		<nav
			aria-label="Topics in {topic.category}"
			class="mt-10 flex justify-between gap-3 border-t border-line pt-3 text-xs"
		>
			{#if prev}
				<a href={resolve('/topics/[id]', { id: prev.id })} class="link"
					>← <TopicTitle title={prev.title} /></a
				>
			{:else}
				<span></span>
			{/if}
			{#if next}
				<a href={resolve('/topics/[id]', { id: next.id })} class="text-right link"
					><TopicTitle title={next.title} /> →</a
				>
			{/if}
		</nav>
	{/if}
</ContentGate>
