import { Waypoint, RouteData } from '@/types/travel';

/**
 * Fetches route from Mapbox Directions API
 */
export async function fetchRoute(
  waypoints: Waypoint[]
): Promise<RouteData | null> {
  if (waypoints.length < 2) return null;

  // Format coordinates for Mapbox API: "lng,lat;lng,lat;..."
  const coordinates = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Converts meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

/**
 * Converts seconds to hours and minutes
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
