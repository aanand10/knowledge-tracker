import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/,
// so the app needs a base path. The deploy workflow sets BASE_PATH=/<repo>.
// Locally it is empty, so `pnpm dev` serves from "/".
const base = (process.env.BASE_PATH ?? '') as '' | `/${string}`;

export default defineConfig({
	plugins: [
		tailwindcss(),
		// SvelteKit 3 takes its config here instead of svelte.config.js.
		sveltekit({
			compilerOptions: {
				// Force runes mode for our own files (Svelte 5 syntax only).
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				// Topic pages like /topics/js-closures depend on runtime data from GitHub,
				// so they can't be prerendered. 404.html is the SPA fallback page that
				// GitHub Pages serves for any unknown path.
				fallback: '404.html'
			}),
			paths: { base }
		}),
		svelteTesting()
	],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		setupFiles: ['./vitest-setup.ts'],
		expect: { requireAssertions: true }
	}
});
