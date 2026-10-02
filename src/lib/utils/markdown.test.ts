import { describe, expect, it } from 'vitest';
import { renderMarkdown, slugify } from './markdown';

describe('slugify', () => {
	it('creates URL-friendly slugs', () => {
		expect(slugify('Hello, World!')).toBe('hello-world');
		expect(slugify('  `var` in loops  ')).toBe('var-in-loops');
		expect(slugify('???')).toBe('section');
	});
});

describe('renderMarkdown', () => {
	it('builds a table of contents from h2/h3 with unique ids', () => {
		const { html, toc } = renderMarkdown('# Title\n## Intro\n### Details\n## Intro\n#### Deep');
		expect(toc).toEqual([
			{ id: 'h-intro', text: 'Intro', depth: 2 },
			{ id: 'h-details', text: 'Details', depth: 3 },
			{ id: 'h-intro-1', text: 'Intro', depth: 2 }
		]);
		expect(html).toContain('<h2 id="h-intro">');
		expect(html).toContain('<h2 id="h-intro-1">');
	});

	it('uses plain text for headings with inline formatting', () => {
		const { toc } = renderMarkdown('## The `this` keyword & you');
		expect(toc[0]?.text).toBe('The this keyword & you');
	});

	it('removes scripts and event handlers', () => {
		const { html } = renderMarkdown(
			'<script>alert(1)</script>\n\n<img src="x.png" onerror="alert(1)">\n\n[x](javascript:alert(1))'
		);
		expect(html).not.toContain('<script');
		expect(html).not.toContain('onerror');
		expect(html).not.toContain('javascript:');
	});

	it('highlights known languages and escapes unknown ones', () => {
		const known = renderMarkdown('```js\nconst a = 1;\n```').html;
		expect(known).toContain('language-js');
		expect(known).toContain('hljs-keyword');
		const unknown = renderMarkdown('```brainfuck\n<b>\n```').html;
		expect(unknown).toContain('&lt;b&gt;');
	});

	it('resolves relative links and images against the note URL', () => {
		const base = 'https://raw.githubusercontent.com/u/r/main/notes/js/closures.md';
		const { html } = renderMarkdown('[next](./event-loop.md) ![d](img/a.png) [top](#intro)', base);
		expect(html).toContain(
			'href="https://raw.githubusercontent.com/u/r/main/notes/js/event-loop.md"'
		);
		expect(html).toContain('src="https://raw.githubusercontent.com/u/r/main/notes/js/img/a.png"');
		expect(html).toContain('href="#intro"');
	});

	it('opens external links in a new tab safely', () => {
		const { html } = renderMarkdown('[mdn](https://developer.mozilla.org)');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});
});
