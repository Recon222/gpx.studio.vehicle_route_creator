<script lang="ts">
	import { Input } from '$lib/components/ui/input';

	export let value: string | number;
</script>

<div>
	<Input
		type="text"
		step={1}
		bind:value
		on:input
		on:change
		on:keypress
		on:focusin={() => {
			let input = document.activeElement;
			if (input instanceof HTMLInputElement) {
				input.select();
			}
		}}
		on:focusin
		class="w-[22px] {$$props.class ?? ''}"
		{...$$restProps}
	/>
</div>

<style>
	div :global(input) {
		padding: 0 0.125rem;
		text-align: right;
		border: none;
	}
	div :global(input:focus) {
		outline: none;
		--tw-ring-offset-width: 0px;
		--tw-ring-offset-color: transparent;
		--tw-ring-color: transparent;
	}
</style> 