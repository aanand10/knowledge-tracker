<script lang="ts">
	import { cloud } from '#lib/stores/cloud.svelte.ts';

	let name = $state('');
	let email = $state('');
	let code = $state('');
	// Supabase email codes are 6 digits by default (configurable up to 10).
	const CODE_PATTERN = '[0-9 ]{6,12}';
	// $props.id() gives unique ids, so this form can appear twice on a page safely.
	const id = $props.id();

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		await cloud.sendMagicLink(email, name);
	}
</script>

{#if cloud.linkSentTo}
	<div class="space-y-3 text-sm" role="status">
		<p>
			We emailed <span class="font-semibold">{cloud.linkSentTo}</span>. Tap the button in the email,
			or enter the code here.
		</p>
		<form
			class="flex gap-2"
			onsubmit={async (e) => {
				e.preventDefault();
				await cloud.verifyCode(code);
			}}
		>
			<label for="{id}-code" class="sr-only">Code from the email</label>
			<input
				id="{id}-code"
				class="input text-center font-mono tracking-[0.3em]"
				inputmode="numeric"
				autocomplete="one-time-code"
				pattern={CODE_PATTERN}
				placeholder="code"
				required
				bind:value={code}
			/>
			<button type="submit" class="btn-primary" disabled={cloud.busy}>
				{cloud.busy ? '…' : 'verify'}
			</button>
		</form>
		{#if cloud.error}<p class="text-xs text-danger" role="alert">{cloud.error}</p>{/if}
		<p class="text-xs text-muted">
			From "Recall". Check spam the first time.
			<button type="button" class="link" onclick={() => (cloud.linkSentTo = null)}
				>use a different email</button
			>
		</p>
	</div>
{:else}
	<form onsubmit={submit} class="space-y-2">
		<div>
			<label for="{id}-name" class="label">your name</label>
			<!-- The form only renders inside the sign-in dialog, where focusing the
			     first field is the expected behaviour, so autofocus is fine here. -->
			<!-- svelte-ignore a11y_autofocus -->
			<input
				autofocus
				id="{id}-name"
				type="text"
				required
				minlength="2"
				maxlength="60"
				autocomplete="name"
				class="input"
				placeholder="e.g. Anand"
				bind:value={name}
			/>
		</div>
		<div>
			<label for="{id}-email" class="label">email</label>
			<input
				id="{id}-email"
				type="email"
				required
				autocomplete="email"
				class="input"
				placeholder="you@example.com"
				bind:value={email}
			/>
		</div>
		<button type="submit" class="btn-primary w-full" disabled={cloud.busy}>
			{cloud.busy ? 'sending…' : 'email me a sign-in link'}
		</button>
		<p class="text-xs text-muted">No password needed. We'll email you a one-click link.</p>
		{#if cloud.error}<p class="text-xs text-danger" role="alert">{cloud.error}</p>{/if}
	</form>
{/if}
