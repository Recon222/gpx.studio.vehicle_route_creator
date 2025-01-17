export interface GpsPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  elevation?: number;
}

export interface ProcessedData {
  points: GpsPoint[];
  timeRange: {
    start: Date;
    end: Date;
  };
  metadata: {
    totalDistance: number;
    duration: number;
    averageSpeed: number;
    maxSpeed: number;
  };
}

export interface InterpolatedPosition {
  latitude: number;
  longitude: number;
  heading?: number;
  elevation?: number;
}

export interface AnimationState {
  isPlaying: boolean;
  currentTime: Date;
  playbackSpeed: number;
} 