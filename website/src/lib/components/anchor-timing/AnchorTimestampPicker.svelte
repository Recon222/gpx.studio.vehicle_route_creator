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
    import { Clock } from 'lucide-svelte';

    export let timestamp: Date | undefined = undefined;
    export let notes: string = '';
    export let onSave: (data: { timestamp: Date; notes: string }) => void;
    export let onCancel: () => void;

    let dateValue: DateValue | undefined = undefined;
    let timeValue: number | undefined = undefined;

    // Convert timestamp to date and time values
    $: if (timestamp) {
        dateValue = new CalendarDate(
            timestamp.getFullYear(),
            timestamp.getMonth() + 1,
            timestamp.getDate()
        );
        timeValue = 
            timestamp.getHours() * 3600 + 
            timestamp.getMinutes() * 60 + 
            timestamp.getSeconds();
    }

    function handleSave() {
        if (!dateValue || timeValue === undefined) return;

        const date = dateValue.toDate(get(locale) ?? 'en');
        const hours = Math.floor(timeValue / 3600);
        const minutes = Math.floor((timeValue % 3600) / 60);
        const seconds = timeValue % 60;

        const finalTimestamp = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            hours,
            minutes,
            seconds
        );

        onSave({ timestamp: finalTimestamp, notes });
    }
</script>

<div class="flex flex-col gap-4 p-4 bg-background border rounded-lg shadow-lg w-[400px]">
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
            />
            <AnchorTimePicker
                bind:value={timeValue}
                showHours={true}
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
        <Button variant="outline" on:click={onCancel}>
            Cancel
        </Button>
        <Button on:click={handleSave}>
            Save
        </Button>
    </div>
</div> 