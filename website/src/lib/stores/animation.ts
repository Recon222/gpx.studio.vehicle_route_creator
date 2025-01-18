import { writable, derived, type Writable } from 'svelte/store';
import type { ProcessedData, AnimationState, InterpolatedPosition } from '$lib/types/gps';
import * as turf from '@turf/turf';

export interface TimeRange {
  start: Date;
  end: Date;
}

interface AnimationStore extends AnimationState {
  gpsData: ProcessedData | null;
  currentPosition: InterpolatedPosition | null;
  timeFilter: TimeRange | null;
}

function createAnimationStore() {
  const { subscribe, set, update } = writable<AnimationStore>({
    isPlaying: false,
    currentTime: new Date(),
    playbackSpeed: 1,
    gpsData: null,
    currentPosition: null,
    timeFilter: null
  });

  let animationFrame: number;
  let lastFrameTime: number;

  function interpolatePosition(time: Date, points: ProcessedData['points']): InterpolatedPosition | null {
    const timestamp = time.getTime();
    const startTime = points[0].timestamp.getTime();
    const endTime = points[points.length - 1].timestamp.getTime();
    const clampedTimestamp = Math.max(startTime, Math.min(endTime, timestamp));

    // Binary search for the closest points
    let left = 0;
    let right = points.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = points[mid].timestamp.getTime();

      if (midTime === clampedTimestamp) {
        const point = points[mid];
        return {
          longitude: point.longitude,
          latitude: point.latitude,
          heading: point.heading,
          elevation: point.elevation
        };
      }

      if (midTime < clampedTimestamp) {
        if (mid === points.length - 1 || points[mid + 1].timestamp.getTime() > clampedTimestamp) {
          const current = points[mid];
          const next = points[mid + 1];
          const factor = (clampedTimestamp - midTime) / (next.timestamp.getTime() - midTime);

          const position: InterpolatedPosition = {
            longitude: current.longitude + (next.longitude - current.longitude) * factor,
            latitude: current.latitude + (next.latitude - current.latitude) * factor,
            elevation: current.elevation !== undefined && next.elevation !== undefined
              ? current.elevation + (next.elevation - current.elevation) * factor
              : undefined
          };

          // Calculate heading if not available
          if (!current.heading || !next.heading) {
            const heading = Math.atan2(
              next.longitude - current.longitude,
              next.latitude - current.latitude
            ) * (180 / Math.PI);
            position.heading = heading;
          } else {
            position.heading = current.heading + (next.heading - current.heading) * factor;
          }

          return position;
        }
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return null;
  }

  function startAnimation() {
    const animate = (timestamp: number) => {
      update(store => {
        if (!store.isPlaying || !store.gpsData) {
          return store;
        }

        if (!lastFrameTime) {
          lastFrameTime = timestamp;
          animationFrame = requestAnimationFrame(animate);
          return store;
        }

        const deltaTime = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        const newTime = new Date(
          store.currentTime.getTime() + 
          deltaTime * store.playbackSpeed
        );

        // Check if we've reached the end
        const effectiveTimeRange = store.timeFilter || store.gpsData.timeRange;
        if (newTime >= effectiveTimeRange.end) {
          return {
            ...store,
            currentTime: effectiveTimeRange.end,
            isPlaying: false
          };
        }

        const newPosition = interpolatePosition(newTime, store.gpsData.points);
        
        return {
          ...store,
          currentTime: newTime,
          currentPosition: newPosition
        };
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
  }

  function stopAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      lastFrameTime = 0;
    }
  }

  return {
    subscribe,
    setGpsData: (data: ProcessedData | null) => update(store => {
      if (data) {
        return {
          ...store,
          gpsData: data,
          currentTime: data.timeRange.start,
          isPlaying: false,
          currentPosition: null
        };
      }
      return { ...store, gpsData: null };
    }),
    togglePlayback: () => update(store => {
      const newIsPlaying = !store.isPlaying;
      if (newIsPlaying) {
        startAnimation();
      } else {
        stopAnimation();
      }
      return { ...store, isPlaying: newIsPlaying };
    }),
    setCurrentTime: (time: Date) => update(store => {
      if (!store.gpsData) return store;
      const newPosition = interpolatePosition(time, store.gpsData.points);
      return { ...store, currentTime: time, currentPosition: newPosition };
    }),
    setPlaybackSpeed: (speed: number) => update(store => ({ ...store, playbackSpeed: speed })),
    setTimeFilter: (filter: TimeRange | null) => update(store => ({ ...store, timeFilter: filter }))
  };
}

export const animationStore = createAnimationStore();

// Derived store for effective time range (considering filters)
export const effectiveTimeRange = derived(
  animationStore,
  $store => $store.timeFilter || ($store.gpsData?.timeRange ?? { start: new Date(), end: new Date() })
); 