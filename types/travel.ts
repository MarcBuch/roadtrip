import type { LineString } from 'geojson';

export interface Waypoint {
  id: string;
  lng: number;
  lat: number;
  name?: string;
}

export interface RouteData {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: LineString;
}

export interface CostSettings {
  mpg: number;
  pricePerGallon: number;
}
