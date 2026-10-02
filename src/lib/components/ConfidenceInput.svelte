<script lang="ts">
	import { CONFIDENCE_LABELS } from '#lib/utils/labels.ts';

	interface Props {
		value: number;
		onchange: (value: number) => void;
	}

	let { value, onchange }: Props = $props();

	// $props.id() gives a unique id per component instance (safe for label/for pairs).
	const id = $props.id();
</script>

<!-- A radio group: arrow keys move between options, which is the native, accessible pattern. -->
<fieldset>
	<legend class="label">Confidence</legend>
	<div class="flex gap-1.5">
		{#each [1, 2, 3, 4, 5] as level (level)}
			<label class="flex-1">
				<input
					type="radio"
					name="confidence-{id}"
					value={level}
					checked={value === level}
					onchange={() => onchange(level)}
					class="peer sr-only"
				/>
				<span
					class="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-sm font-medium peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500 dark:border-slate-700"
					title={CONFIDENCE_LABELS[level]}
				>
					{level}
				</span>
			</label>
		{/each}
	</div>
	<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{CONFIDENCE_LABELS[value]}</p>
</fieldset>
