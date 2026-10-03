<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { content } from '#lib/stores/content.svelte.ts';
	import { theme } from '#lib/stores/theme.svelte.ts';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import AccountButton from '#lib/components/AccountButton.svelte';
	import AuthDialog from '#lib/components/AuthDialog.svelte';
	import SignInNudge from '#lib/components/SignInNudge.svelte';
	import ContentWarnings from '#lib/components/ContentWarnings.svelte';
	import VisitorCount from '#lib/components/VisitorCount.svelte';
	import { trackPageView } from '#lib/utils/analytics.ts';

	// `children` is the current page. Layouts render it with {@render children()}.
	let { children } = $props();

	// onMount (not $effect) because loading should happen exactly once.
	// An $effect would re-run whenever any $state it reads changes.
	onMount(() => {
		content.load();
	});

	// Runs after the first page load AND after every client-side navigation,
	// so each page view is counted once. A no-op unless analytics is configured.
	afterNavigate(({ to }) => {
		if (to) trackPageView(to.url.pathname);
	});

	// Keep the `dark` class on <html> in sync with the theme store.
	$effect(() => {
		document.documentElement.classList.toggle('dark', theme.isDark);
	});

	// Match on the route id (e.g. "/topics/[id]") rather than the URL, so it works
	// regardless of the GitHub Pages base path.
	const links = [
		{ href: resolve('/'), label: 'topics', section: '/topics' },
		{ href: resolve('/dashboard'), label: 'dashboard', section: '/dashboard' },
		{ href: resolve('/settings'), label: 'settings', section: '/settings' }
	];

	function isCurrent(section: string): boolean {
		const id = page.route.id ?? '';
		// The topic list lives at "/", topic pages at "/topics/[id]": both count as "topics".
		if (section === '/topics') return id === '/' || id.startsWith('/topics');
		return id.startsWith(section);
	}
</script>

<a
	href="#main"
	class="sr-only z-50 bg-fg px-2 py-1 text-bg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
>
	skip to content
</a>

<header class="sticky top-0 z-40 border-b border-line bg-bg">
	<div class="mx-auto flex h-11 max-w-5xl items-center gap-3 px-4 sm:gap-4">
		<a
			href={resolve('/')}
			class="mr-auto font-semibold whitespace-nowrap"
			aria-label="Knowledge Tracker home"
		>
			<!-- Short name on phones so the nav never overflows. -->
			<span class="sm:hidden" aria-hidden="true">KT</span>
			<span class="hidden sm:inline">Knowledge Tracker</span>
		</a>
		<nav aria-label="Main">
			<ul class="flex gap-2.5 sm:gap-4">
				{#each links as link (link.href)}
					{@const current = isCurrent(link.section)}
					<li>
						<a
							href={link.href}
							aria-current={current ? 'page' : undefined}
							class="text-xs {current
								? 'text-fg underline decoration-2 underline-offset-[14px]'
								: 'text-muted hover:text-fg'}"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<ThemeToggle />
		<AccountButton />
	</div>
</header>

<main id="main" class="mx-auto max-w-5xl px-4 py-5 pb-16" tabindex="-1">
	<SignInNudge />
	<ContentWarnings />
	{@render children()}
</main>

<footer
	class="mx-auto flex max-w-5xl justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted"
>
	<a class="hover:text-fg" href="https://github.com/aanand10/knowledge-tracker">source</a>
	<VisitorCount />
</footer>

<AuthDialog />
