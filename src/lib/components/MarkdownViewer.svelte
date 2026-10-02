<script lang="ts">
	import type { RenderedMarkdown } from '#lib/utils/markdown.ts';
	import TableOfContents from './TableOfContents.svelte';

	interface Props {
		markdown: string;
		/** URL of the note, so relative links/images inside it resolve correctly. */
		baseUrl?: string | null;
	}

	let { markdown, baseUrl = null }: Props = $props();

	let rendered = $state<RenderedMarkdown | null>(null);
	let renderError = $state<string | null>(null);

	// `$effect` runs after the component mounts and again whenever a value it
	// reads (`markdown`, `baseUrl`) changes. The function it returns is the
	// cleanup, which runs before the next re-run or when the component is destroyed.
	$effect(() => {
		const source = markdown;
		const base = baseUrl ?? undefined;
		let cancelled = false;

		// Dynamic import = lazy loading: marked, DOMPurify and highlight.js are
		// only downloaded when a note is actually shown.
		import('#lib/utils/markdown.ts')
			.then(({ renderMarkdown }) => {
				if (!cancelled) {
					rendered = renderMarkdown(source, base);
					renderError = null;
				}
			})
			.catch((error: unknown) => {
				if (!cancelled) renderError = error instanceof Error ? error.message : String(error);
			});

		return () => {
			cancelled = true; // ignore results for a note we've already navigated away from
		};
	});
</script>

{#if renderError}
	<p role="alert" class="text-xs text-danger">
		Couldn't render this note: {renderError}
	</p>
{:else if rendered}
	<div class="space-y-5">
		{#if rendered.toc.length >= 2}
			<TableOfContents items={rendered.toc} />
		{/if}
		<article class="note prose prose-sm max-w-none font-sans sm:prose-base">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- HTML is sanitized with DOMPurify in renderMarkdown -->
			{@html rendered.html}
		</article>
	</div>
{:else}
	<p class="text-xs text-muted" role="status">rendering…</p>
{/if}
