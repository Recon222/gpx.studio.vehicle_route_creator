// Type definitions for Mapbox Geocoding API responses
export interface GeocodingResponse {
    type: string;
    query: string[];
    features: GeocodingFeature[];
    attribution: string;
}

export interface GeocodingFeature {
    id: string;
    type: string;
    place_type: string[];
    relevance: number;
    properties: {
        accuracy?: string;
        address?: string;
        category?: string;
        maki?: string;
    };
    text: string;
    place_name: string;
    center: [number, number];
    geometry: {
        type: string;
        coordinates: [number, number];
    };
    context?: {
        id: string;
        text: string;
        wikidata?: string;
        short_code?: string;
    }[];
} 