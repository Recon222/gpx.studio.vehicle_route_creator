<script lang="ts">
    import { format } from 'date-fns';
    import { CalendarDate, type DateValue, getLocalTimeZone } from '@internationalized/date';
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
    let isInitialized = false;

    onMount(() => {
        console.log('[DEBUG] TimestampPicker mounted with props:', {
            timestamp,
            notes,
            anchor,
            isOpen
        });
        if (timestamp) {
            initializeFromTimestamp(timestamp);
        }
        isOpen = true;
    });

    function initializeFromTimestamp(ts: Date) {
        console.log('[DEBUG] Initializing from timestamp:', ts);
        
        dateValue = new CalendarDate(
            ts.getFullYear(),
            ts.getMonth() + 1,
            ts.getDate()
        );
        
        timeValue = 
            ts.getHours() * 3600 + 
            ts.getMinutes() * 60 + 
            ts.getSeconds();
            
        console.log('[DEBUG] Initialized values:', { dateValue, timeValue });
        isInitialized = true;
    }

    function handleTimeChange(newValue: number) {
        console.log('[DEBUG] Time changed to:', newValue);
        timeValue = newValue;
        updateTimestampFromValues();
    }

    function handleDateChange(newValue: DateValue | undefined) {
        if (!newValue) return;
        console.log('[DEBUG] Date changed to:', newValue);
        dateValue = newValue;
        updateTimestampFromValues();
    }

    function updateTimestampFromValues() {
        if (!dateValue || timeValue === undefined) return;
        
        console.log('[DEBUG] Updating timestamp from values:', { dateValue, timeValue });
        
        try {
            const localDate = dateValue.toDate(getLocalTimeZone());
            const hours = Math.floor(timeValue / 3600);
            const minutes = Math.floor((timeValue % 3600) / 60);
            const seconds = timeValue % 60;
            
            const newTimestamp = new Date(
                localDate.getFullYear(),
                localDate.getMonth(),
                localDate.getDate(),
                hours,
                minutes,
                seconds
            );
            
            console.log('[DEBUG] Setting new timestamp:', newTimestamp);
            timestamp = newTimestamp;
        } catch (error) {
            console.error('[DEBUG] Error updating timestamp:', error);
        }
    }

    function handleSave() {
        console.log('[DEBUG] handleSave called with:', { dateValue, timeValue, notes });
        if (!dateValue || timeValue === undefined) {
            console.warn('[DEBUG] Missing required date/time values for save');
            return;
        }

        try {
            const localDate = dateValue.toDate(getLocalTimeZone());
            const hours = Math.floor(timeValue / 3600);
            const minutes = Math.floor((timeValue % 3600) / 60);
            const seconds = timeValue % 60;
            
            const finalTimestamp = new Date(
                localDate.getFullYear(),
                localDate.getMonth(),
                localDate.getDate(),
                hours,
                minutes,
                seconds
            );

            console.log('[DEBUG] Saving with final timestamp:', finalTimestamp);
            onSave({ timestamp: finalTimestamp, notes });
            isOpen = false;
        } catch (error) {
            console.error('[DEBUG] Error saving timestamp:', error);
        }
    }

    function handleCancel() {
        console.log('[DEBUG] handleCancel called');
        onCancel();
        isOpen = false;
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