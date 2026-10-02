/**
 * Markdown → sanitized HTML, plus a table of contents.
 *
 * This module pulls in marked, DOMPurify and highlight.js, so it is only ever
 * loaded with a dynamic `import()` from MarkdownViewer. That keeps those
 * libraries out of the initial bundle (lazy loading).
 */
import { Marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { slugify } from './slug';

export { slugify };

// Register only the languages we need: the full highlight.js bundle is ~1 MB.
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('go', go);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerAliases(['jsx', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['tsx'], { languageName: 'typescript' });
hljs.registerAliases(['html', 'svelte', 'vue'], { languageName: 'xml' });
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });

export interface TocItem {
	id: string;
	text: string;
	depth: number;
}

export interface RenderedMarkdown {
	html: string;
	toc: TocItem[];
}

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#39;': "'"
};

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Inline HTML → plain text (for TOC labels and slugs). */
function toPlainText(html: string): string {
	return html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}

/** Relative link in a note → absolute URL next to the note on GitHub. */
function resolveHref(href: string, baseUrl: string | undefined): string {
	if (!baseUrl || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return href;
	}
}

let hooksInstalled = false;
function installSanitizerHooks() {
	if (hooksInstalled) return;
	hooksInstalled = true;
	// Open external links in a new tab, safely.
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') ?? '')) {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	});
}

/**
 * Render Markdown to sanitized HTML.
 * @param baseUrl URL of the note itself; relative links and images resolve against it.
 */
export function renderMarkdown(markdown: string, baseUrl?: string): RenderedMarkdown {
	installSanitizerHooks();
	const toc: TocItem[] = [];
	const usedIds = new Map<string, number>();

	// A fresh Marked instance per call, so the TOC array isn't shared between renders.
	const marked = new Marked({
		gfm: true,
		walkTokens(token) {
			if (token.type === 'link' || token.type === 'image') {
				token.href = resolveHref(token.href, baseUrl);
			}
		},
		renderer: {
			heading({ tokens, depth }: Tokens.Heading) {
				const inner = this.parser.parseInline(tokens);
				const text = toPlainText(inner);
				const slug = slugify(text);
				const count = usedIds.get(slug) ?? 0;
				usedIds.set(slug, count + 1);
				// Prefix ids so they can't clash with built-in DOM properties
				// (DOMPurify strips ids like "title" or "location" to stop DOM clobbering).
				const id = `h-${slug}${count ? `-${count}` : ''}`;
				if (depth === 2 || depth === 3) toc.push({ id, text, depth });
				return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
			},
			code({ text, lang }: Tokens.Code) {
				const language = (lang ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
				const known = language !== '' && hljs.getLanguage(language) !== undefined;
				const body = known ? hljs.highlight(text, { language }).value : escapeHtml(text);
				const cls = known ? ` class="hljs language-${escapeHtml(language)}"` : ' class="hljs"';
				return `<pre><code${cls}>${body}</code></pre>\n`;
			}
		}
	});

	const raw = marked.parse(markdown, { async: false });
	const html = DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
	return { html, toc };
}
