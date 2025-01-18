<script lang="ts">
	import AnchorTimeComponentInput from './AnchorTimeComponentInput.svelte';

	export let showHours = true;
	export let value: number | undefined = undefined;
	export let disabled: boolean = false;
	export let onChange: (value: number) => void = () => {};

	let hours: string | number = '--';
	let minutes: string | number = '--';
	let seconds: string | number = '--';

	function maybeParseInt(value: string | number): number {
		if (value === '--' || value === '') {
			return 0;
		}
		return typeof value === 'string' ? parseInt(value) : value;
	}

	function computeValue(): number {
		return Math.max(
			maybeParseInt(hours) * 3600 + maybeParseInt(minutes) * 60 + maybeParseInt(seconds),
			1
		);
	}

	function updateValue() {
        const newValue = computeValue();
        if (newValue !== value) {
            console.log('[DEBUG] Time value updated:', { hours, minutes, seconds, newValue });
            value = newValue;
            onChange(newValue);
        }
	}

	$: hours, minutes, seconds, updateValue();

	$: if (value === undefined) {
		hours = '--';
		minutes = '--';
		seconds = '--';
	} else if (value !== computeValue()) {
		let rounded = Math.max(Math.round(value), 1);
		if (showHours) {
			hours = Math.floor(rounded / 3600);
			minutes = Math.floor((rounded % 3600) / 60)
				.toString()
				.padStart(2, '0');
		} else {
			minutes = Math.floor(rounded / 60).toString();
		}
		seconds = (rounded % 60).toString().padStart(2, '0');
        console.log('[DEBUG] Time components updated from value:', { hours, minutes, seconds });
	}

	let container: HTMLDivElement;
	let countKeyPress = 0;

	function handleTimeInputChange(component: 'hours' | 'minutes' | 'seconds', inputValue: string | number) {
        console.log(`[DEBUG] ${component} changed to:`, inputValue);
        let parsed = typeof inputValue === 'string' ? parseInt(inputValue) : inputValue;
        
        if (isNaN(parsed)) {
            parsed = 0;
        }

        switch (component) {
            case 'hours':
                if (parsed < 0) parsed = 0;
                hours = parsed;
                break;
            case 'minutes':
                if (parsed < 0) parsed = 0;
                if (showHours && parsed > 59) parsed = 59;
                minutes = parsed.toString().padStart(showHours ? 2 : 1, '0');
                break;
            case 'seconds':
                if (parsed < 0) parsed = 0;
                if (parsed > 59) parsed = 59;
                seconds = parsed.toString().padStart(2, '0');
                break;
        }
        
        updateValue();
    }

	function onKeyPress(e: KeyboardEvent) {
		if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
			countKeyPress++;
			if (countKeyPress === 2) {
				const target = e.target as HTMLInputElement;
				if (target.id === 'hours') {
					const minutesInput = container.querySelector('#minutes') as HTMLInputElement;
					minutesInput?.focus();
				} else if (target.id === 'minutes') {
					const secondsInput = container.querySelector('#seconds') as HTMLInputElement;
					secondsInput?.focus();
				}
			}
		}
	}
</script>

<div
	bind:this={container}
	class="flex flex-row items-center w-full min-w-fit border rounded-md px-3 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 {disabled
		? 'opacity-50 cursor-not-allowed'
		: ''}"
>
	{#if showHours}
		<AnchorTimeComponentInput
			id="hours"
			bind:value={hours}
			{disabled}
			class="w-[30px]"
			on:input={(e) => handleTimeInputChange('hours', e.target.value)}
			on:keypress={onKeyPress}
			on:focusin={() => {
				countKeyPress = 0;
			}}
		/>
		<span class="text-sm">:</span>
	{/if}
	<AnchorTimeComponentInput
		id="minutes"
		bind:value={minutes}
		{disabled}
		on:input={(e) => handleTimeInputChange('minutes', e.target.value)}
		on:keypress={onKeyPress}
		on:focusin={() => {
			countKeyPress = 0;
		}}
	/>
	<span class="text-sm">:</span>
	<AnchorTimeComponentInput
		id="seconds"
		bind:value={seconds}
		{disabled}
		on:input={(e) => handleTimeInputChange('seconds', e.target.value)}
		on:keypress={onKeyPress}
		on:focusin={() => {
			countKeyPress = 0;
		}}
	/>
</div>

<style lang="postcss">
	div :global(input) {
		appearance: none;
		-webkit-appearance: none;
	}
	div :global(input::-webkit-outer-spin-button) {
		-webkit-appearance: none;
		margin: 0;
	}
	div :global(input::-webkit-inner-spin-button) {
		-webkit-appearance: none;
		margin: 0;
	}
	div :global(input[type='number']) {
		-moz-appearance: textfield;
	}
</style>