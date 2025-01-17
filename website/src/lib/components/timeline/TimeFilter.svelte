<script lang="ts">
  import { format } from 'date-fns';
  import { animationStore, type TimeRange } from '$lib/stores/animation';

  export let timeRange: TimeRange;

  const formatDateTime = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm");

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const start = new Date(formData.get('start') as string);
    const end = new Date(formData.get('end') as string);

    // Ensure valid date range
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      animationStore.setTimeFilter({ start, end });
    }
  }

  function handleReset() {
    animationStore.setTimeFilter(null);
  }
</script>

<form 
  on:submit={handleSubmit}
  class="flex items-center gap-2"
>
  <div class="flex items-center gap-2">
    <input
      type="datetime-local"
      name="start"
      value={formatDateTime(timeRange.start)}
      min={formatDateTime(timeRange.start)}
      max={formatDateTime(timeRange.end)}
      class="h-8 w-44 bg-white/10 hover:bg-white/20 border border-white/10 rounded px-2 text-sm text-white
             focus:outline-none focus:ring-1 focus:ring-white/30"
    />
    <span class="text-white/70">to</span>
    <input
      type="datetime-local"
      name="end"
      value={formatDateTime(timeRange.end)}
      min={formatDateTime(timeRange.start)}
      max={formatDateTime(timeRange.end)}
      class="h-8 w-44 bg-white/10 hover:bg-white/20 border border-white/10 rounded px-2 text-sm text-white
             focus:outline-none focus:ring-1 focus:ring-white/30"
    />
  </div>
  <div class="flex items-center gap-2">
    <button
      type="submit"
      class="h-8 px-3 bg-white/10 hover:bg-white/20 text-white rounded text-sm
             transition-colors"
    >
      Apply
    </button>
    <button
      type="button"
      on:click={handleReset}
      class="h-8 px-3 text-white/70 hover:text-white text-sm
             transition-colors"
    >
      Reset
    </button>
  </div>
</form> 