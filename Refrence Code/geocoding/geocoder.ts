const GEOCODING_DELAY = 100; // ms between requests to avoid rate limiting

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export async function geocodeAddress(
  address: string, 
  token: string
): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}`
    );
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    if (!data.features?.length) return null;
    
    const [longitude, latitude] = data.features[0].center;
    
    return {
      latitude,
      longitude,
      formattedAddress: data.features[0].place_name
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function geocodeWithDelay(
  address: string, 
  token: string
): Promise<GeocodeResult | null> {
  await new Promise(resolve => setTimeout(resolve, GEOCODING_DELAY));
  return geocodeAddress(address, token);
}