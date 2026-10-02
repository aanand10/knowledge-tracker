import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import { defaultProgress } from '#lib/types/index.ts';
import ReviewButtons from './ReviewButtons.svelte';

describe('ReviewButtons', () => {
	it('asks how it went and reports the rating', async () => {
		const user = userEvent.setup();
		const onreview = vi.fn();
		render(ReviewButtons, { progress: defaultProgress(), onreview });

		await user.click(screen.getByRole('button', { name: 'Mark reviewed' }));
		const ok = screen.getByRole('button', { name: /OK/ });
		expect(ok).toHaveTextContent('+1d');
		expect(screen.getByRole('button', { name: /Easy/ })).toHaveTextContent('+3d');

		await user.click(ok);
		expect(onreview).toHaveBeenCalledWith('ok');
		expect(screen.getByText(/Next review in 1 day\./)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Mark reviewed' })).toHaveFocus();
	});

	it('closes on Escape without reviewing', async () => {
		const user = userEvent.setup();
		const onreview = vi.fn();
		render(ReviewButtons, { progress: defaultProgress(), onreview });

		await user.click(screen.getByRole('button', { name: 'Mark reviewed' }));
		await user.keyboard('{Escape}');
		expect(screen.queryByRole('button', { name: /Hard/ })).not.toBeInTheDocument();
		expect(onreview).not.toHaveBeenCalled();
	});
});
