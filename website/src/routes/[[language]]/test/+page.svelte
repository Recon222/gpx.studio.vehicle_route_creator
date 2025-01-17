<script lang="ts">
    import AnchorTimestampPicker from '$lib/components/anchor-timing/AnchorTimestampPicker.svelte';

    function handleSave(data: { timestamp: Date; notes: string }) {
        console.log('Saved:', data);
    }

    function handleCancel() {
        console.log('Cancelled');
    }
</script>

<div class="flex items-center justify-center min-h-screen bg-background/50">
    <AnchorTimestampPicker
        timestamp={new Date()}
        notes=""
        onSave={handleSave}
        onCancel={handleCancel}
    />
</div> 