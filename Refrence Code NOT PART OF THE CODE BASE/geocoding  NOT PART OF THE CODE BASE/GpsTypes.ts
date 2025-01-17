export interface GpsPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  elevation?: number;
}
