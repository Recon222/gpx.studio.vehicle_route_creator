<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { page } from '$app/stores';
  import { processCSVFile, type CSVProcessingProgress } from '$lib/services/csv';
  import type { GeocodeResult } from '$lib/services/geocoding';
  import { Button } from './ui/button';
  import { Progress } from './ui/progress';
  import { _ } from 'svelte-i18n';

  const dispatch = createEventDispatcher<{
    complete: { waypoints: GeocodeResult[] };
  }>();

  let fileInput: HTMLInputElement;
  let processing = false;
  let progress: CSVProcessingProgress = {
    processed: 0,
    total: 0
  };

  async function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    processing = true;
    progress = { processed: 0, total: 0 };

    try {
      const waypoints = await processCSVFile(
        file,
        $page.params.language || 'en',
        (p) => progress = p
      );
      
      dispatch('complete', { waypoints });
    } catch (error) {
      console.error('Error processing CSV:', error);
    } finally {
      processing = false;
      if (fileInput) fileInput.value = '';
    }
  }
</script>

<div class="flex flex-col gap-2">
  <input
    type="file"
    accept=".csv"
    class="hidden"
    bind:this={fileInput}
    on:change={handleFileSelect}
  />
  
  <Button
    variant="outline"
    on:click={() => fileInput.click()}
    disabled={processing}
  >
    {$_('import_csv')}
  </Button>

  {#if processing}
    <div class="flex flex-col gap-1">
      <Progress value={(progress.processed / progress.total) * 100} />
      <p class="text-sm text-muted-foreground">
        {progress.processed} / {progress.total} {$_('locations_processed')}
      </p>
      {#if progress.currentWaypoint}
        <p class="text-sm text-muted-foreground truncate">
          {progress.currentWaypoint.formattedAddress}
        </p>
      {/if}
    </div>
  {/if}
</div> 