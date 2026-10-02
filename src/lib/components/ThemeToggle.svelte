<script lang="ts">
	import { theme } from '#lib/stores/theme.svelte.ts';

	const labels = { system: 'System', light: 'Light', dark: 'Dark' } as const;
</script>

<button
	type="button"
	class="btn-secondary px-2.5"
	onclick={() => theme.cycle()}
	aria-label="Theme: {labels[theme.preference]}. Click to change."
	title="Theme: {labels[theme.preference]}"
>
	{#if theme.preference === 'light'}
		<svg
			class="size-5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
			/>
		</svg>
	{:else if theme.preference === 'dark'}
		<svg
			class="size-5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
		</svg>
	{:else}
		<svg
			class="size-5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<rect x="3" y="4" width="18" height="12" rx="2" />
			<path d="M8 20h8M12 16v4" />
		</svg>
	{/if}
</button>
