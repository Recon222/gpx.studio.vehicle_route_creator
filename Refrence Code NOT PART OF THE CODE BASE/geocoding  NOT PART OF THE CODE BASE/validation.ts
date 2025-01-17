export function validateAddress(address: string): string | null {
  if (!address.trim()) {
    return 'Address cannot be empty';
  }
  
  if (address.length < 3) {
    return 'Address is too short';
  }
  
  return null;
}

export function validateGeocodingResponse(
  response: Response, 
  address: string
): string | null {
  if (!response.ok) {
    return `Geocoding failed: ${response.statusText}`;
  }
  
  if (response.status === 429) {
    return 'Rate limit exceeded. Please try again later.';
  }
  
  return null;
}

export function validateCoordinates(
  coordinates: [number, number] | undefined
): string | null {
  if (!coordinates) {
    return 'No coordinates found';
  }
  
  const [lng, lat] = coordinates;
  
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return 'Invalid coordinate format';
  }
  
  if (lng < -180 || lng > 180) {
    return 'Invalid longitude';
  }
  
  if (lat < -90 || lat > 90) {
    return 'Invalid latitude';
  }
  
  return null;
}