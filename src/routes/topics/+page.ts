import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

// The topic list moved to the home page. Keep old /topics?… links (and bookmarks) working.
export const prerender = false;

export function load({ url }) {
	redirect(307, `${resolve('/')}${url.search}`);
}
