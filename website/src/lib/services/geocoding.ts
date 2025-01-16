import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  timestamp?: Date;
  notes?: string;
}

export interface CSVWaypoint {
  timestamp?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

const GEOCODING_DELAY = 100; // ms between requests to avoid rate limiting

function validateAddress(address: string): string | null {
  if (!address.trim()) {
    return 'Address cannot be empty';
  }
  
  if (address.length < 3) {
    return 'Address is too short';
  }
  
  return null;
}

function validateCoordinates(lat: number, lon: number): string | null {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return 'Invalid coordinate format';
  }
  
  if (lon < -180 || lon > 180) {
    return 'Invalid longitude';
  }
  
  if (lat < -90 || lat > 90) {
    return 'Invalid latitude';
  }
  
  return null;
}

function validateResponse(response: Response): string | null {
  if (!response.ok) {
    return `Geocoding failed: ${response.statusText}`;
  }
  
  if (response.status === 429) {
    return 'Rate limit exceeded. Please try again later.';
  }
  
  return null;
}

export async function geocodeAddress(
  query: string,
  language: string = 'en'
): Promise<GeocodeResult | null> {
  const validationError = validateAddress(query);
  if (validationError) {
    console.error(validationError);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${PUBLIC_MAPBOX_TOKEN}&language=${language}`
    );
    
    const responseError = validateResponse(response);
    if (responseError) {
      console.error(responseError);
      return null;
    }

    const data = await response.json();
    if (!data.features?.length) return null;

    const result = data.features[0];
    return {
      latitude: result.center[1],
      longitude: result.center[0],
      formattedAddress: result.place_name
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  language: string = 'en'
): Promise<GeocodeResult | null> {
  const validationError = validateCoordinates(latitude, longitude);
  if (validationError) {
    console.error(validationError);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${PUBLIC_MAPBOX_TOKEN}&language=${language}`
    );
    
    const responseError = validateResponse(response);
    if (responseError) {
      console.error(responseError);
      return null;
    }

    const data = await response.json();
    if (!data.features?.length) return null;

    const result = data.features[0];
    return {
      latitude,
      longitude,
      formattedAddress: result.place_name
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function processCSVWaypoint(
  waypoint: CSVWaypoint,
  language: string = 'en'
): Promise<GeocodeResult | null> {
  try {
    let result: GeocodeResult | null = null;

    // If coordinates are provided, do reverse geocoding
    if (typeof waypoint.latitude === 'number' && typeof waypoint.longitude === 'number') {
      result = await reverseGeocode(waypoint.latitude, waypoint.longitude, language);
    }
    // If address is provided, do forward geocoding
    else if (waypoint.address) {
      result = await geocodeAddress(waypoint.address, language);
    }
    else {
      console.error('Neither coordinates nor address provided');
      return null;
    }

    if (!result) return null;

    // Add optional fields if they exist
    if (waypoint.timestamp) {
      result.timestamp = new Date(waypoint.timestamp);
    }
    if (waypoint.notes) {
      result.notes = waypoint.notes;
    }

    return result;
  } catch (error) {
    console.error('Error processing waypoint:', error);
    return null;
  }
}

export async function geocodeWithDelay(
  query: string,
  language: string = 'en'
): Promise<GeocodeResult | null> {
  await new Promise(resolve => setTimeout(resolve, GEOCODING_DELAY));
  return geocodeAddress(query, language);
} 