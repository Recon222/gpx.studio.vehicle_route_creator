<script lang="ts">
  import { format } from 'date-fns';
  import { Play, Pause, ChevronDown, Camera } from 'lucide-svelte';
  import { animationStore, effectiveTimeRange } from '$lib/stores/animation';
  import TimelineScrubber from './TimelineScrubber.svelte';
  import TimeFilter from './TimeFilter.svelte';

  const SPEED_OPTIONS = [0.5, 1, 2, 4, 8, 12, 16, 20];

  function formatTime(date: Date): string {
    return format(date, 'HH:mm:ss');
  }

  // Camera view types (we'll implement these later)
  enum CameraViewType {
    TopDown = 'top-down',
    Chase = 'chase',
    SideChase = 'side-chase',
    Driver = 'driver',
    Overview = 'overview'
  }

  // Camera state (we'll implement this later)
  let cameraState = {
    isFollowing: false,
    activeView: CameraViewType.TopDown
  };

  function toggleCameraFollow() {
    cameraState.isFollowing = !cameraState.isFollowing;
  }

  function setCameraView(view: CameraViewType) {
    cameraState.activeView = view;
  }
</script>

<div class="absolute bottom-0 left-0 right-0 bg-[#0B0F1A]/90 backdrop-blur-sm border-t border-white/10 z-40">
  <div class="max-w-6xl mx-auto p-2 space-y-4">
    <!-- Controls Row -->
    <div class="flex items-center justify-between">
      <!-- Left side: Play controls and speed -->
      <div class="flex items-center gap-4">
        <!-- Play/Pause Button -->
        <button
          on:click={() => animationStore.togglePlayback()}
          class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 
                 flex items-center justify-center transition-colors"
          aria-label={$animationStore.isPlaying ? 'Pause' : 'Play'}
        >
          {#if $animationStore.isPlaying}
            <Pause class="w-4 h-4 text-white" />
          {:else}
            <Play class="w-4 h-4 text-white translate-x-0.5" />
          {/if}
        </button>

        <!-- Speed Dropdown -->
        <div class="relative">
          <select
            bind:value={$animationStore.playbackSpeed}
            class="h-8 appearance-none bg-white/10 hover:bg-white/20 rounded px-2 pr-8 text-sm text-white
                   focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            {#each SPEED_OPTIONS as speed}
              <option value={speed}>
                {speed}x
              </option>
            {/each}
          </select>
          <ChevronDown class="w-4 h-4 text-white/70 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <!-- Current Time -->
        <div class="text-white/70 text-sm">
          {formatTime($animationStore.currentTime)}
        </div>

        <!-- Camera Quick Controls -->
        <div class="flex items-center gap-2 ml-4 border-l border-white/10 pl-4">
          <button
            on:click={toggleCameraFollow}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors {
              cameraState.isFollowing
                ? 'bg-white/20 text-white'
                : 'text-white/70 hover:bg-white/10'
            }"
          >
            <Camera class="w-4 h-4" />
            {cameraState.isFollowing ? 'Following' : 'Free Camera'}
          </button>
          
          <select
            bind:value={cameraState.activeView}
            class="h-8 appearance-none bg-white/10 hover:bg-white/20 rounded px-2 pr-8 text-sm text-white
                   focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            <option value={CameraViewType.TopDown}>Top Down</option>
            <option value={CameraViewType.Chase}>Chase</option>
            <option value={CameraViewType.SideChase}>Side View</option>
            <option value={CameraViewType.Driver}>Driver</option>
            <option value={CameraViewType.Overview}>Overview</option>
          </select>
        </div>
      </div>

      <!-- Right side: Time Filter -->
      <TimeFilter timeRange={$effectiveTimeRange} />
    </div>

    <!-- Timeline Scrubber -->
    <div>
      <TimelineScrubber
        start={$effectiveTimeRange.start}
        end={$effectiveTimeRange.end}
        current={$animationStore.currentTime}
        onChange={(time) => animationStore.setCurrentTime(time)}
      />
      
      <!-- Time Range Labels -->
      <div class="flex justify-between text-sm text-white/70 mt-1">
        <span>{formatTime($effectiveTimeRange.start)}</span>
        <span>{formatTime($effectiveTimeRange.end)}</span>
      </div>
    </div>
  </div>
</div> 