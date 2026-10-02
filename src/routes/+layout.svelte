<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { asset, resolve } from '$app/paths';
	import { content } from '#lib/stores/content.svelte.ts';
	import { theme } from '#lib/stores/theme.svelte.ts';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import ContentWarnings from '#lib/components/ContentWarnings.svelte';

	// `children` is the current page. Layouts render it with {@render children()}.
	let { children } = $props();

	// onMount (not $effect) because loading should happen exactly once.
	// An $effect would re-run whenever any $state it reads changes.
	onMount(() => {
		content.load();
	});

	// Keep the `dark` class on <html> in sync with the theme store.
	$effect(() => {
		document.documentElement.classList.toggle('dark', theme.isDark);
	});

	// Match on the route id (e.g. "/topics/[id]") rather than the URL, so it works
	// regardless of the GitHub Pages base path.
	const links = [
		{ href: resolve('/'), label: 'Dashboard', section: '/' },
		{ href: resolve('/topics'), label: 'Topics', section: '/topics' },
		{ href: resolve('/settings'), label: 'Settings', section: '/settings' }
	];

	function isCurrent(section: string): boolean {
		const id = page.route.id ?? '';
		return section === '/' ? id === '/' : id.startsWith(section);
	}
</script>

<a
	href="#main"
	class="sr-only z-50 rounded-lg bg-indigo-600 px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
>
	Skip to content
</a>

<header
	class="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
>
	<div class="mx-auto flex max-w-4xl items-center gap-2 px-4 py-2">
		<a href={resolve('/')} class="mr-auto flex items-center gap-2 font-semibold">
			<img src={asset('favicon.svg')} alt="" class="size-7" />
			<span class="hidden sm:inline">Knowledge Tracker</span>
		</a>
		<nav aria-label="Main">
			<ul class="flex gap-1">
				{#each links as link (link.href)}
					{@const current = isCurrent(link.section)}
					<li>
						<a
							href={link.href}
							aria-current={current ? 'page' : undefined}
							class="block rounded-lg px-2.5 py-2 text-sm font-medium {current
								? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
								: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
		<ThemeToggle />
	</div>
</header>

<main id="main" class="mx-auto max-w-4xl px-4 py-6 pb-16" tabindex="-1">
	<ContentWarnings />
	{@render children()}
</main>
