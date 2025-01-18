<script lang="ts">
    import { format } from 'date-fns';
    import { CalendarDate, type DateValue } from '@internationalized/date';
    import { locale } from 'svelte-i18n';
    import { get } from 'svelte/store';
    import AnchorDatePicker from './AnchorDatePicker.svelte';
    import AnchorTimePicker from './AnchorTimePicker.svelte';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import * as Popover from '$lib/components/ui/popover';
    import { Clock } from 'lucide-svelte';
    import { onMount } from 'svelte';

    export let timestamp: Date | undefined = undefined;
    export let notes: string = '';
    export let onSave: (data: { timestamp: Date; notes: string }) => void;
    export let onCancel: () => void;
    export let anchor: { lat: number; lng: number } | undefined = undefined;

    let dateValue: DateValue | undefined = undefined;
    let timeValue: number | undefined = undefined;
    let isOpen = false;

    onMount(() => {
        console.log('[DEBUG] TimestampPicker mounted with props:', {
            timestamp,
            notes,
            anchor,
            isOpen
        });
        isOpen = true;
    });

    // Convert timestamp to date and time values
    $: if (timestamp) {
        console.log('[DEBUG] Initial timestamp set:', timestamp);
        dateValue = new CalendarDate(
            timestamp.getFullYear(),
            timestamp.getMonth() + 1,
            timestamp.getDate()
        );
        timeValue = 
            timestamp.getHours() * 3600 + 
            timestamp.getMinutes() * 60 + 
            timestamp.getSeconds();
        console.log('[DEBUG] Converted to:', { dateValue, timeValue });
    }

    // Handle changes to date/time values
    $: if (dateValue && timeValue !== undefined) {
        console.log('[DEBUG] Date/Time values changed:', { dateValue, timeValue });
        const date = dateValue.toDate(get(locale) ?? 'en');
        const hours = Math.floor(timeValue / 3600);
        const minutes = Math.floor((timeValue % 3600) / 60);
        const seconds = timeValue % 60;
        
        const newTimestamp = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            hours,
            minutes,
            seconds
        );
        
        if (!timestamp || newTimestamp.getTime() !== timestamp.getTime()) {
            console.log('[DEBUG] Updating timestamp to:', newTimestamp);
            timestamp = newTimestamp;
        }
    }

    $: {
        console.log('[DEBUG] Popover open state changed:', isOpen);
    }

    function handleSave() {
        console.log('[DEBUG] handleSave called with:', { dateValue, timeValue, notes });
        if (!dateValue || timeValue === undefined || !timestamp) {
            console.warn('[DEBUG] Missing required values for save');
            return;
        }

        console.log('[DEBUG] Saving with final timestamp:', timestamp);
        onSave({ timestamp, notes });
        isOpen = false;
    }

    function handleCancel() {
        console.log('[DEBUG] handleCancel called');
        onCancel();
        isOpen = false;
    }

    function handleTimeChange(newTimeValue: number) {
        console.log('[DEBUG] Time changed to:', newTimeValue);
        timeValue = newTimeValue;
    }

    function handleDateChange(newDateValue: DateValue) {
        console.log('[DEBUG] Date changed to:', newDateValue);
        dateValue = newDateValue;
    }
</script>

<Popover.Root bind:open={isOpen}>
    <Popover.Trigger asChild let:builder>
        <Button
            variant="ghost"
            size="icon"
            class="w-8 h-8 p-0"
            builders={[builder]}
        >
            <Clock class="w-4 h-4" />
        </Button>
    </Popover.Trigger>
    
    <Popover.Content
        class="w-[400px] p-4 bg-background border rounded-lg shadow-lg"
        side="right"
        align="start"
        sideOffset={5}
    >
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <Label class="flex items-center gap-2">
                    <Clock class="w-4 h-4" />
                    Timestamp
                </Label>
                <div class="flex flex-col gap-2">
                    <AnchorDatePicker
                        bind:value={dateValue}
                        locale={get(locale) ?? 'en'}
                        placeholder="Select date"
                        class="w-full"
                        onValueChange={handleDateChange}
                    />
                    <AnchorTimePicker
                        bind:value={timeValue}
                        showHours={true}
                        onChange={handleTimeChange}
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <Label>Notes</Label>
                <Input
                    type="text"
                    placeholder="Add notes about this anchor point..."
                    bind:value={notes}
                />
            </div>

            <div class="flex justify-end gap-2">
                <Button variant="outline" on:click={handleCancel}>
                    Cancel
                </Button>
                <Button on:click={handleSave}>
                    Save
                </Button>
            </div>
        </div>
    </Popover.Content>
</Popover.Root>