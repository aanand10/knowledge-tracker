import { describe, expect, it } from 'vitest';
import { firstName, greeting, personalName } from './greeting';

describe('firstName', () => {
	it('takes and capitalises the first word', () => {
		expect(firstName('anand suryawanshi')).toBe('Anand');
		expect(firstName('  Priya  ')).toBe('Priya');
		expect(firstName('')).toBe('');
	});
});

describe('personalName', () => {
	it('ignores names that are just the email prefix', () => {
		expect(personalName('anandsuryawanshi66', 'anandsuryawanshi66@gmail.com')).toBe('');
		expect(personalName('Anand Suryawanshi', 'anandsuryawanshi66@gmail.com')).toBe('Anand');
		expect(personalName(null, 'a@b.com')).toBe('');
	});
});

describe('greeting', () => {
	it('depends on the hour', () => {
		const at = (h: number) => new Date(2026, 9, 4, h);
		expect(greeting(at(2))).toBe('Up late');
		expect(greeting(at(9))).toBe('Good morning');
		expect(greeting(at(14))).toBe('Good afternoon');
		expect(greeting(at(20))).toBe('Good evening');
	});
});
