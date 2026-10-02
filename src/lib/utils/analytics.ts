/**
 * Privacy-friendly page-view counting via GoatCounter.
 * Does nothing unless `analyticsConfig.goatcounterCode` is set, and never runs
 * on localhost (so your own development doesn't inflate the numbers).
 */
import { analyticsConfig } from '#lib/config.ts';

interface GoatCounter {
	count: (vars: { path: string }) => void;
}

declare global {
	interface Window {
		goatcounter?: GoatCounter & { no_onload?: boolean };
	}
}

function siteUrl(): string | null {
	const code = analyticsConfig.goatcounterCode.trim();
	return code ? `https://${encodeURIComponent(code)}.goatcounter.com` : null;
}

function isLocalhost(): boolean {
	return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}

let loading: Promise<GoatCounter | null> | null = null;

/** Load count.js once. Resolves to null if analytics is off or the script is blocked. */
function loadScript(): Promise<GoatCounter | null> {
	const site = siteUrl();
	if (!site || isLocalhost()) return Promise.resolve(null);
	loading ??= new Promise((resolve) => {
		// We count page views ourselves on every client-side navigation.
		window.goatcounter = { ...window.goatcounter, no_onload: true } as Window['goatcounter'];
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://gc.zgo.at/count.js';
		script.dataset.goatcounter = `${site}/count`;
		script.onload = () => resolve(window.goatcounter ?? null);
		script.onerror = () => resolve(null); // ad blockers: fail silently
		document.head.appendChild(script);
	});
	return loading;
}

/** Record a page view. Only the path is sent (no query string, which may hold searches). */
export async function trackPageView(path: string) {
	const counter = await loadScript();
	counter?.count({ path });
}

/** Public total visitor count (e.g. "1,234"), or null if unavailable. */
export async function fetchVisitorCount(signal?: AbortSignal): Promise<string | null> {
	const site = siteUrl();
	if (!site) return null;
	try {
		const response = await fetch(`${site}/counter/TOTAL.json`, { signal });
		if (!response.ok) return null; // 403 until the public counter is enabled
		const data: unknown = await response.json();
		const count = (data as { count?: unknown }).count;
		return typeof count === 'string' || typeof count === 'number' ? String(count).trim() : null;
	} catch {
		return null;
	}
}
