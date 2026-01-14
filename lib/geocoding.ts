/**
 * Reverse geocode coordinates to get the name of the closest point of interest or city
 * @param lng Longitude
 * @param lat Latitude
 * @returns The name of the location (POI or city name)
 */
export async function reverseGeocode(
  lng: number,
  lat: number
): Promise<string> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!accessToken) {
    console.error('Mapbox access token not found');
    return `Waypoint (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  try {
    // Use Mapbox Geocoding API for reverse geocoding
    // types=poi,place prioritizes points of interest and cities
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}&types=poi,place&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(data);

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];

      // Return the place name (text property)
      return (
        feature.text ||
        feature.place_name ||
        `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`
      );
    }

    // Fallback if no results found
    return `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch (error) {
    console.error('Error during reverse geocoding:', error);
    return `Waypoint (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}
