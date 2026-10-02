import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsConfig } from '#lib/config.ts';
import { fetchVisitorCount, trackPageView } from './analytics';

const configuredCode = analyticsConfig.goatcounterCode;

beforeEach(() => {
	analyticsConfig.goatcounterCode = '';
});

afterEach(() => {
	analyticsConfig.goatcounterCode = configuredCode;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('analytics', () => {
	it('does nothing when no GoatCounter code is configured', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		const append = vi.spyOn(document.head, 'appendChild');
		await trackPageView('/topics');
		expect(await fetchVisitorCount()).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(append).not.toHaveBeenCalled();
	});

	it('never loads the script on localhost', async () => {
		analyticsConfig.goatcounterCode = 'demo';
		const append = vi.spyOn(document.head, 'appendChild');
		await trackPageView('/'); // jsdom runs on http://localhost
		expect(append).not.toHaveBeenCalled();
	});

	it('reads the public visitor count', async () => {
		analyticsConfig.goatcounterCode = 'demo';
		const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ count: '1,234' })));
		vi.stubGlobal('fetch', fetchSpy);
		expect(await fetchVisitorCount()).toBe('1,234');
		expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://demo.goatcounter.com/counter/TOTAL.json');
	});

	it('returns null when the public counter is disabled or unreachable', async () => {
		analyticsConfig.goatcounterCode = 'demo';
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 403 })));
		expect(await fetchVisitorCount()).toBeNull();
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
		expect(await fetchVisitorCount()).toBeNull();
	});
});
