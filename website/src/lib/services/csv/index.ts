import Papa from 'papaparse';
import type { CSVWaypoint, CSVProcessingResult } from './types';
import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public';

async function geocodeAddress(address: string): Promise<[number, number] | null> {
    try {
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${PUBLIC_MAPBOX_TOKEN}`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
            const [lon, lat] = data.features[0].center;
            return [lat, lon];
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

export async function processCSVFile(data: string): Promise<CSVProcessingResult> {
    return new Promise((resolve, reject) => {
        Papa.parse(data, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const waypoints: CSVWaypoint[] = [];
                const errors: string[] = [];

                // Process each row sequentially to avoid rate limiting
                for (let index = 0; index < results.data.length; index++) {
                    const row: any = results.data[index];
                    try {
                        let waypoint: CSVWaypoint | null = null;

                        if (row.latitude && row.longitude) {
                            waypoint = {
                                latitude: parseFloat(row.latitude),
                                longitude: parseFloat(row.longitude)
                            };
                        } else if (row.lat && row.lon) {
                            waypoint = {
                                latitude: parseFloat(row.lat),
                                longitude: parseFloat(row.lon)
                            };
                        } else if (row.address) {
                            const coords = await geocodeAddress(row.address);
                            if (coords) {
                                waypoint = {
                                    address: row.address,
                                    latitude: coords[0],
                                    longitude: coords[1]
                                };
                            } else {
                                errors.push(`Row ${index + 1}: Could not geocode address "${row.address}"`);
                                continue;
                            }
                        }

                        if (waypoint) {
                            if (row.timestamp || row.time) {
                                waypoint.timestamp = new Date(row.timestamp || row.time);
                            }
                            if (row.notes || row.description || row.desc) {
                                waypoint.notes = row.notes || row.description || row.desc;
                            }
                            waypoints.push(waypoint);
                        } else {
                            errors.push(`Row ${index + 1}: No valid coordinates or address found`);
                        }
                    } catch (error) {
                        errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }

                resolve({ waypoints, errors });
            },
            error: (error: Error) => {
                reject(error);
            }
        });
    });
} 