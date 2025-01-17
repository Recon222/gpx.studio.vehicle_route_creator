import type { GeocodingResponse } from '../../../website/src/lib/types/GeocodingTypes';

export interface GeocodingResult {
  coordinates: [number, number];
  address: string;
  error?: string;
}

export interface GeocodingProgress {
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
}

export interface GeocodingOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  onProgress?: (progress: GeocodingProgress) => void;
}