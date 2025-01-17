<script lang="ts">
  import { onMount } from 'svelte';

  export let start: Date;
  export let end: Date;
  export let current: Date;
  export let onChange: (time: Date) => void;

  let containerElement: HTMLDivElement;
  let isDragging = false;

  $: totalDuration = end.getTime() - start.getTime();
  $: currentProgress = (current.getTime() - start.getTime()) / totalDuration;

  function updateTime(clientX: number) {
    if (!containerElement) return;

    const rect = containerElement.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = new Date(start.getTime() + progress * totalDuration);
    onChange(newTime);
  }

  function handlePointerDown(e: PointerEvent) {
    if (!containerElement) return;
    isDragging = true;
    containerElement.setPointerCapture(e.pointerId);
    updateTime(e.clientX);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    updateTime(e.clientX);
  }

  function handlePointerUp(e: PointerEvent) {
    if (!containerElement) return;
    isDragging = false;
    containerElement.releasePointerCapture(e.pointerId);
  }
</script>

<div 
  bind:this={containerElement}
  class="relative h-6 group cursor-pointer"
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
>
  <!-- Track Background -->
  <div class="absolute inset-0 my-2.5 rounded-full bg-white/10 overflow-hidden">
    <!-- Progress Bar -->
    <div 
      class="absolute h-full bg-white/30 transition-all duration-75"
      style:width="{currentProgress * 100}%"
    />
  </div>

  <!-- Thumb -->
  <div 
    class="absolute top-0 -ml-2 w-4 h-4 rounded-full bg-white border border-white/20 shadow-lg
           transform transition-transform duration-75 hover:scale-110"
    style:left="{currentProgress * 100}%"
  />
</div> 