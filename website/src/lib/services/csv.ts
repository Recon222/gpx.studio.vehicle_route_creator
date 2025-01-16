import Papa from 'papaparse';
import type { ParseResult, ParseStepResult } from 'papaparse';
import type { CSVWaypoint, GeocodeResult } from './geocoding';
import { processCSVWaypoint } from './geocoding';

export interface CSVProcessingProgress {
  processed: number;
  total: number;
  currentWaypoint?: GeocodeResult;
}

export async function processCSVFile(
  file: File,
  language: string,
  onProgress?: (progress: CSVProcessingProgress) => void
): Promise<GeocodeResult[]> {
  return new Promise((resolve, reject) => {
    const results: GeocodeResult[] = [];
    let rowCount = 0;
    let processedCount = 0;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: () => resolve(results),
      error: (error: Error) => reject(error),
      step: async (row: ParseStepResult<Record<string, any>>) => {
        rowCount++;
        const data = row.data;
        
        // Map CSV columns to CSVWaypoint interface
        const waypoint: CSVWaypoint = {
          timestamp: data.timestamp || data.Timestamp || data.time || data.Time,
          address: data.address || data.Address || data.location || data.Location,
          latitude: data.latitude || data.Latitude || data.lat || data.Lat,
          longitude: data.longitude || data.Longitude || data.lon || data.Lon || data.lng || data.Lng,
          notes: data.notes || data.Notes || data.text || data.Text || data.description || data.Description
        };

        try {
          const result = await processCSVWaypoint(waypoint, language);
          if (result) {
            results.push(result);
          }
          processedCount++;
          
          if (onProgress) {
            onProgress({
              processed: processedCount,
              total: rowCount,
              currentWaypoint: result || undefined
            });
          }
        } catch (error) {
          console.error('Error processing row:', error);
          processedCount++;
        }
      }
    });
  });
} 