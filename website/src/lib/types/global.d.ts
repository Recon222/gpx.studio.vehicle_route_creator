import type { Map as MapboxMap } from 'mapbox-gl';

declare global {
  interface Window {
    _map: MapboxMap;
  }
}

export {}; 