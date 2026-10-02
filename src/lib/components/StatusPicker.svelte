<script lang="ts">
	import { STATUSES, type Status } from '#lib/types/index.ts';

	interface Props {
		value: Status;
		onchange: (value: Status) => void;
	}

	let { value, onchange }: Props = $props();
	const id = $props.id();
</script>

<fieldset>
	<legend class="label">status</legend>
	<div class="grid grid-cols-3">
		{#each STATUSES as status (status)}
			<label class="-ml-px first:ml-0">
				<input
					type="radio"
					name="status-{id}"
					value={status}
					checked={value === status}
					onchange={() => onchange(status)}
					class="peer sr-only"
				/>
				<span
					class="flex h-8 cursor-pointer items-center justify-center border border-line px-1 text-xs whitespace-nowrap text-muted peer-checked:relative peer-checked:z-10 peer-checked:border-fg peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:relative peer-focus-visible:z-20 peer-focus-visible:outline-2 peer-focus-visible:outline-link hover:text-fg"
				>
					{status}
				</span>
			</label>
		{/each}
	</div>
</fieldset>
