<script lang="ts">
	import AnchorTimeComponentInput from './AnchorTimeComponentInput.svelte';

	export let showHours = true;
	export let value: number | undefined = undefined;
	export let disabled: boolean = false;
	export let onChange: (value: number) => void = () => {};

	let hours: string | number = '--';
	let minutes: string | number = '--';
	let seconds: string | number = '--';
	let isUserInput = false;

	function maybeParseInt(value: string | number): number | undefined {
		if (value === '--' || value === '') {
			return undefined;
		}
		const parsed = typeof value === 'string' ? parseInt(value) : value;
		return isNaN(parsed) ? undefined : parsed;
	}

	function computeValue(): number | undefined {
		const h = maybeParseInt(hours);
		const m = maybeParseInt(minutes);
		const s = maybeParseInt(seconds);

		if (h === undefined && m === undefined && s === undefined) {
			return undefined;
		}

		// Only return a value if all components are set
		if (h === undefined || m === undefined || s === undefined) {
			return undefined;
		}

		return h * 3600 + m * 60 + s;
	}

	function handleTimeInputChange(component: 'hours' | 'minutes' | 'seconds', event: Event) {
		isUserInput = true;
		const target = event.target as HTMLInputElement;
        if (!target) return;
        
        const newValue = target.value.trim();
        
        // Allow empty input to reset to placeholder
        if (newValue === '') {
            switch (component) {
                case 'hours':
                    hours = '--';
                    break;
                case 'minutes':
                    minutes = '--';
                    break;
                case 'seconds':
                    seconds = '--';
                    break;
            }
            return;
        }

        let parsed = parseInt(newValue);
        if (isNaN(parsed)) {
            return;
        }

        console.log(`[DEBUG] ${component} input changed to:`, parsed);

        switch (component) {
            case 'hours':
                if (parsed < 0) parsed = 0;
                if (parsed > 23) parsed = 23;
                hours = parsed;
                break;
            case 'minutes':
                if (parsed < 0) parsed = 0;
                if (parsed > 59) parsed = 59;
                minutes = parsed;
                break;
            case 'seconds':
                if (parsed < 0) parsed = 0;
                if (parsed > 59) parsed = 59;
                seconds = parsed;
                break;
        }
        
        // Only compute and update value if all fields are filled
		const computed = computeValue();
		if (computed !== undefined) {
			value = computed;
			onChange(computed);
		} else {
			value = undefined;
		}
		
		isUserInput = false;
    }

	$: if (!isUserInput && value !== undefined) {
		hours = Math.floor(value / 3600);
		minutes = Math.floor((value % 3600) / 60);
		seconds = value % 60;
	}

	let container: HTMLDivElement;
	let countKeyPress = 0;

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
			on:input={(e) => handleTimeInputChange('hours', e)}
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
		on:input={(e) => handleTimeInputChange('minutes', e)}
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
		on:input={(e) => handleTimeInputChange('seconds', e)}
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