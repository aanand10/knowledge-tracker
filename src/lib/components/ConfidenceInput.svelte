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
	<legend class="label">confidence</legend>
	<div class="flex">
		{#each [1, 2, 3, 4, 5] as level (level)}
			<label class="-ml-px flex-1 first:ml-0">
				<input
					type="radio"
					name="confidence-{id}"
					value={level}
					checked={value === level}
					onchange={() => onchange(level)}
					class="peer sr-only"
				/>
				<span
					class="flex h-8 cursor-pointer items-center justify-center border border-line px-1 text-xs whitespace-nowrap text-muted peer-checked:relative peer-checked:z-10 peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:relative peer-focus-visible:z-20 peer-focus-visible:outline-2 peer-focus-visible:outline-link hover:text-fg"
					title={CONFIDENCE_LABELS[level]}
				>
					{level}
				</span>
			</label>
		{/each}
	</div>
	<p class="mt-1 text-xs text-muted">{CONFIDENCE_LABELS[value]}</p>
</fieldset>
