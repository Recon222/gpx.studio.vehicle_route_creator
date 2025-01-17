import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import type { ProcessedData, AnimationState, InterpolatedPosition } from '../types';
import { CameraViewType, CameraState } from '../types/CameraView';

interface AnimationContextType {
  gpsData: ProcessedData | null;
  setGpsData: (data: ProcessedData | null) => void;
  animationState: AnimationState;
  currentPosition: InterpolatedPosition | null;
  togglePlayback: () => void;
  setCurrentTime: (time: Date) => void;
  setPlaybackSpeed: (speed: number) => void;
  timeFilter: { start: Date; end: Date } | null;
  setTimeFilter: (filter: { start: Date; end: Date } | null) => void;
  filteredMetadata: ProcessedData['metadata'] | null;
  cameraState: CameraState;
  setCameraView: (view: CameraViewType) => void;
  toggleCameraFollow: () => void;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [gpsData, setGpsData] = useState<ProcessedData | null>(null);
  const [currentPosition, setCurrentPosition] = useState<InterpolatedPosition | null>(null);
  const [timeFilter, setTimeFilter] = useState<{ start: Date; end: Date } | null>(null);
  const [filteredMetadata, setFilteredMetadata] = useState<ProcessedData['metadata'] | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState>({
    isPlaying: false,
    currentTime: new Date(),
    playbackSpeed: 1,
  });
  
  // Camera state
  const [cameraState, setCameraState] = useState<CameraState>({
    activeView: CameraViewType.TopDown,
    isFollowing: true
  });

  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>();

  // Camera controls
  const setCameraView = useCallback((view: CameraViewType) => {
    setCameraState(prev => ({
      ...prev,
      activeView: view,
      isFollowing: true, // Auto-enable following when changing views
    }));
  }, []);

  const toggleCameraFollow = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      isFollowing: !prev.isFollowing,
    }));
  }, []);

  // Calculate filtered metadata when time filter changes
  useEffect(() => {
    if (!gpsData || !timeFilter) {
      setFilteredMetadata(null);
      return;
    }

    const { points } = gpsData;
    const filteredPoints = points.filter(point => {
      const timestamp = point.timestamp.getTime();
      return timestamp >= timeFilter.start.getTime() && timestamp <= timeFilter.end.getTime();
    });

    if (filteredPoints.length < 2) {
      setFilteredMetadata(null);
      return;
    }

    // Create a GeoJSON LineString from filtered points
    const line = turf.lineString(filteredPoints.map(p => [p.longitude, p.latitude]));
    const length = turf.length(line, { units: 'kilometers' });

    // Calculate duration
    const duration = timeFilter.end.getTime() - timeFilter.start.getTime();

    // Calculate speeds
    let maxSpeed = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    filteredPoints.forEach((point, i) => {
      if (i < filteredPoints.length - 1) {
        const nextPoint = filteredPoints[i + 1];
        const distance = turf.distance(
          [point.longitude, point.latitude],
          [nextPoint.longitude, nextPoint.latitude],
          { units: 'kilometers' }
        );
        const timeDiff = (nextPoint.timestamp.getTime() - point.timestamp.getTime()) / 3600000; // Convert to hours
        
        if (timeDiff > 0.00027778 && timeDiff < 1) {
          const speed = distance / timeDiff;
          if (speed < 200) {
            maxSpeed = Math.max(maxSpeed, speed);
            totalSpeed += speed;
            speedCount++;
          }
        }
      }
    });

    setFilteredMetadata({
      totalDistance: length,
      duration,
      averageSpeed: speedCount > 0 ? totalSpeed / speedCount : 0,
      maxSpeed
    });
  }, [gpsData, timeFilter]);

  // Update current time when GPS data is loaded or filter changes
  useEffect(() => {
    if (gpsData) {
      const effectiveTimeRange = timeFilter || gpsData.timeRange;
      setAnimationState(prev => ({
        ...prev,
        currentTime: effectiveTimeRange.start,
        isPlaying: false
      }));
      setCurrentPosition(null);
    }
  }, [gpsData, timeFilter]);

  const interpolatePosition = useCallback((time: Date) => {
    if (!gpsData) return null;

    const { points } = gpsData;
    const timestamp = time.getTime();

    // Clamp timestamp to valid range
    const startTime = gpsData.timeRange.start.getTime();
    const endTime = gpsData.timeRange.end.getTime();
    const clampedTimestamp = Math.max(startTime, Math.min(endTime, timestamp));

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

    const point = timestamp <= startTime ? points[0] : points[points.length - 1];
    return {
      longitude: point.longitude,
      latitude: point.latitude,
      heading: point.heading,
      elevation: point.elevation
    };
  }, [gpsData]);

  // Animation frame loop with performance optimizations
  useEffect(() => {
    if (!gpsData || !animationState.isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        lastFrameTimeRef.current = undefined;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      setAnimationState(prev => {
        const newTime = new Date(
          prev.currentTime.getTime() + 
          deltaTime * prev.playbackSpeed
        );

        // Check if we've reached the end
        const effectiveTimeRange = timeFilter || gpsData.timeRange;
        if (newTime >= effectiveTimeRange.end) {
          return {
            ...prev,
            currentTime: effectiveTimeRange.end,
            isPlaying: false
          };
        }

        return {
          ...prev,
          currentTime: newTime
        };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        lastFrameTimeRef.current = undefined;
      }
    };
  }, [gpsData, animationState.isPlaying, animationState.playbackSpeed, timeFilter]);

  // Update position when time changes
  useEffect(() => {
    if (!gpsData) return;
    const newPosition = interpolatePosition(animationState.currentTime);
    if (newPosition) {
      setCurrentPosition(newPosition);
    }
  }, [gpsData, animationState.currentTime, interpolatePosition]);

  const togglePlayback = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      isPlaying: !prev.isPlaying
    }));
  }, []);

  const setCurrentTime = useCallback((time: Date) => {
    setAnimationState(prev => ({
      ...prev,
      currentTime: time
    }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setAnimationState(prev => ({
      ...prev,
      playbackSpeed: speed
    }));
  }, []);

  const value: AnimationContextType = {
    gpsData,
    setGpsData,
    animationState,
    currentPosition,
    togglePlayback,
    setCurrentTime,
    setPlaybackSpeed,
    timeFilter,
    setTimeFilter,
    filteredMetadata,
    cameraState,
    setCameraView,
    toggleCameraFollow
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}
