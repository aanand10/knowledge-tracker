<script lang="ts">
	/**
	 * Recall logo: a loop arrow (spaced repetition brings a topic back around)
	 * with a dot at its centre (the memory you keep). Colours follow the theme.
	 * Arrow geometry adapted from Lucide's "rotate-cw" (ISC licence).
	 */
	let { size = 20 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
	<rect width="32" height="32" rx="8" class="fill-fg" />
	<g
		transform="translate(6 6) scale(0.8333)"
		fill="none"
		class="stroke-bg"
		stroke-width="2.6"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
		<path d="M21 3v5h-5" />
	</g>
	<circle cx="16" cy="16" r="2.6" class="fill-warn" />
</svg>
