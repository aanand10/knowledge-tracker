<script lang="ts">
	import { STATUSES, type Status } from '#lib/types/index.ts';
	import { STATUS_LABELS } from '#lib/utils/labels.ts';

	interface Props {
		value: Status;
		onchange: (value: Status) => void;
	}

	let { value, onchange }: Props = $props();
	const id = $props.id();
</script>

<fieldset>
	<legend class="label">Status</legend>
	<div class="grid grid-cols-3 gap-1.5">
		{#each STATUSES as status (status)}
			<label>
				<input
					type="radio"
					name="status-{id}"
					value={status}
					checked={value === status}
					onchange={() => onchange(status)}
					class="peer sr-only"
				/>
				<span
					class="flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-2 text-center text-sm font-medium peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500 dark:border-slate-700"
				>
					{STATUS_LABELS[status]}
				</span>
			</label>
		{/each}
	</div>
</fieldset>
