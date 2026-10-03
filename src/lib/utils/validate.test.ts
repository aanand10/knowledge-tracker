import { describe, expect, it } from 'vitest';
import { validateProgressMap, validateTopics } from './validate';

const valid = {
	id: 'js-closures',
	title: 'Closures',
	category: 'JavaScript',
	priority: 'high',
	tags: ['fundamentals'],
	note: 'notes/javascript/closures.md',
	resources: [{ label: 'javascript.info', url: 'https://javascript.info/closure' }]
};

describe('validateTopics', () => {
	it('accepts a valid topic', () => {
		const { value, warnings } = validateTopics([valid]);
		expect(warnings).toEqual([]);
		expect(value).toEqual([{ ...valid, area: 'JavaScript' }]);
	});

	it('rejects non-array input', () => {
		const { value, warnings } = validateTopics({ topics: [] });
		expect(value).toEqual([]);
		expect(warnings[0]).toMatch(/array/);
	});

	it('skips entries missing required fields but keeps the rest', () => {
		const { value, warnings } = validateTopics([
			valid,
			{ title: 'No id', category: 'X' },
			{ id: 'no-title', category: 'X' },
			{ id: 'no-category', title: 'Hi' },
			'just a string',
			null
		]);
		expect(value.map((t) => t.id)).toEqual(['js-closures']);
		expect(warnings).toHaveLength(5);
	});

	it('skips duplicate ids', () => {
		const { value, warnings } = validateTopics([valid, { ...valid, title: 'Dup' }]);
		expect(value).toHaveLength(1);
		expect(value[0]?.title).toBe('Closures');
		expect(warnings[0]).toMatch(/duplicate/);
	});

	it('skips invalid priorities and defaults missing ones to medium', () => {
		const { value } = validateTopics([
			{ ...valid, id: 'a', priority: 'urgent' },
			{ ...valid, id: 'b', priority: undefined }
		]);
		expect(value.map((t) => [t.id, t.priority])).toEqual([['b', 'medium']]);
	});

	it('fills defaults for optional fields', () => {
		const { value } = validateTopics([{ id: 'x', title: 'X', category: 'C' }]);
		expect(value[0]).toEqual({
			id: 'x',
			title: 'X',
			category: 'C',
			area: 'C',
			priority: 'medium',
			tags: [],
			note: null,
			resources: []
		});
	});

	it('ignores unsafe note paths', () => {
		for (const note of ['../secret.md', '/etc/passwd.md', 'https://evil.com/a.md', 'notes/a.txt']) {
			const { value, warnings } = validateTopics([{ ...valid, note }]);
			expect(value[0]?.note).toBeNull();
			expect(warnings).toHaveLength(1);
		}
	});

	it('drops resources with non-http URLs', () => {
		const { value, warnings } = validateTopics([
			{
				...valid,
				resources: [
					{ label: 'ok', url: 'https://example.com' },
					{ label: 'xss', url: 'javascript:alert(1)' },
					{ label: 'missing url' }
				]
			}
		]);
		expect(value[0]?.resources).toEqual([{ label: 'ok', url: 'https://example.com' }]);
		expect(warnings).toHaveLength(2);
	});

	it('filters out non-string tags', () => {
		const { value } = validateTopics([{ ...valid, tags: ['a', 3, '', 'b'] }]);
		expect(value[0]?.tags).toEqual(['a', 'b']);
	});
});

describe('validateProgressMap', () => {
	it('accepts the export envelope and the bare map', () => {
		const entry = { status: 'learning', confidence: 3 };
		expect(validateProgressMap({ version: 1, progress: { a: entry } }).value.a?.status).toBe(
			'learning'
		);
		expect(validateProgressMap({ a: entry }).value.a?.confidence).toBe(3);
	});

	it('repairs invalid fields with defaults', () => {
		const { value } = validateProgressMap({
			a: {
				status: 'mastered',
				confidence: 9,
				nextReview: 'tomorrow',
				history: ['2026-01-01', 'nope'],
				reviewCount: -2
			}
		});
		expect(value.a).toMatchObject({
			status: 'not-started',
			confidence: 1,
			nextReview: null,
			history: ['2026-01-01'],
			reviewCount: 0
		});
	});

	it('skips non-object entries and rejects non-objects', () => {
		expect(validateProgressMap({ a: 5 }).warnings).toHaveLength(1);
		expect(validateProgressMap([1, 2]).value).toEqual({});
	});
});

describe('area field', () => {
	it('uses the area when given and warns on a bad one', () => {
		expect(validateTopics([{ ...valid, area: ' Languages ' }]).value[0]?.area).toBe('Languages');
		const bad = validateTopics([{ ...valid, area: 5 }]);
		expect(bad.value[0]?.area).toBe('JavaScript');
		expect(bad.warnings).toHaveLength(1);
	});
});
