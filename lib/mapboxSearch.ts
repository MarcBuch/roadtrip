/**
 * Mapbox Search Box API wrapper for place search functionality
 * Handles both autocomplete suggestions and detailed place retrieval
 */

export interface SearchSuggestion {
  name: string;
  mapboxId: string;
  placeFormatted: string;
  featureType?: string;
}

export interface SearchResult {
  name: string;
  mapboxId: string;
  featureType: string;
  address?: string;
  placeFormatted: string;
  coordinates: {
    longitude: number;
    latitude: number;
  };
}

/**
 * Get autocomplete suggestions for a search query
 * Uses session-based billing for cost efficiency
 */
export async function getSuggestions(
  query: string,
  sessionToken: string,
  options?: {
    limit?: number;
    proximity?: { lng: number; lat: number };
    country?: string[];
  }
): Promise<SearchSuggestion[]> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!accessToken) {
    console.error('Mapbox access token not found');
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      access_token: accessToken,
      session_token: sessionToken,
      limit: String(options?.limit || 5),
      // Only return geographic places, not points of interest
      types: 'place,region,postcode,address',
    });

    if (options?.proximity) {
      params.append(
        'proximity',
        `${options.proximity.lng},${options.proximity.lat}`
      );
    }

    if (options?.country && options.country.length > 0) {
      params.append('country', options.country.join(','));
    }

    const url = `https://api.mapbox.com/search/searchbox/v1/suggest?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Search suggestions failed: ${response.statusText}`);
    }

    const data = await response.json();

    const rawSuggestions = (data.suggestions || []).map(
      (suggestion: any, index: number) => ({
        name: suggestion.name,
        mapboxId: suggestion.mapbox_id,
        placeFormatted: suggestion.place_formatted,
        featureType: suggestion.feature_type,
        originalIndex: index,
      })
    );

    const typePriority: Record<string, number> = {
      place: 0,
      region: 1,
      postcode: 2,
      address: 3,
    };

    const sortedSuggestions = rawSuggestions
      .map((suggestion) => ({
        ...suggestion,
        priority:
          typePriority[suggestion.featureType || ''] ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => {
        if (a.priority === b.priority) {
          return a.originalIndex - b.originalIndex;
        }
        return a.priority - b.priority;
      })
      .map(({ originalIndex, priority, ...rest }) => rest);

    return sortedSuggestions;
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return [];
  }
}

/**
 * Retrieve full details for a selected search suggestion
 * Includes exact coordinates and complete location information
 */
export async function retrieveSearchResult(
  mapboxId: string,
  sessionToken: string
): Promise<SearchResult | null> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!accessToken) {
    console.error('Mapbox access token not found');
    return null;
  }

  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      session_token: sessionToken,
    });

    const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Retrieve search result failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Retrieve API response:', data);

    const feature = data.features?.[0];

    if (!feature) {
      console.warn('No features found in retrieve response');
      return null;
    }

    const coords = feature.geometry?.coordinates;

    if (!Array.isArray(coords) || coords.length < 2) {
      console.error('Invalid coordinates from API:', coords);
      return null;
    }

    const longitude = Number(coords[0]);
    const latitude = Number(coords[1]);

    if (isNaN(longitude) || isNaN(latitude)) {
      console.error('Coordinates are NaN:', { longitude, latitude });
      return null;
    }

    const result = {
      name:
        feature.properties?.name || feature.place_name || 'Unknown Location',
      mapboxId: feature.id,
      featureType: feature.properties?.feature_type || 'unknown',
      address: feature.properties?.address || undefined,
      placeFormatted:
        feature.properties?.place_formatted || feature.place_name || '',
      coordinates: {
        longitude,
        latitude,
      },
    };

    console.log('Returning SearchResult:', result);
    return result;
  } catch (error) {
    console.error('Error retrieving search result:', error);
    return null;
  }
}

/**
 * Generate a unique session token for grouping related search requests
 * Uses UUID v4 format
 */
export function generateSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Enhanced reverse lookup returning full location details
 * Useful for displaying rich information about waypoints
 */
export interface ReverseGeocodeResult {
  name: string;
  address?: string;
  fullAddress?: string;
  placeFormatted?: string;
  featureType: string;
  category?: string[];
  brand?: string[];
  maki?: string;
  context: {
    country?: string;
    region?: string;
    place?: string;
    neighborhood?: string;
  };
}

/**
 * Reverse lookup using Search Box API
 * Returns the closest named location (POI, address, or place)
 *
 * @param lng Longitude
 * @param lat Latitude
 * @param options Optional configuration
 * @returns Location name or coordinate fallback
 */
export async function searchBoxReverseGeocode(
  lng: number,
  lat: number,
  options?: {
    types?: string; // Feature type filter
    language?: string;
    limit?: number;
    country?: string;
  }
): Promise<string> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!accessToken) {
    console.error('Mapbox access token not found');
    return `Waypoint (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      longitude: lng.toString(),
      latitude: lat.toString(),
      limit: (options?.limit ?? 1).toString(),
      ...(options?.types && { types: options.types }),
      ...(options?.language && { language: options.language }),
      ...(options?.country && { country: options.country }),
    });

    const url = `https://api.mapbox.com/search/searchbox/v1/reverse?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Search Box reverse geocoding failed: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const props = feature.properties;

      // Prefer city/place name, then POI name, then coordinates
      const cityName = props.context?.place?.name;
      if (cityName) return cityName;
      
      if (props.name) return props.name;
      
      return `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }

    return `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch (error) {
    console.error('Error during Search Box reverse geocoding:', error);
    return `Waypoint (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}

/**
 * Enhanced reverse lookup returning full location details
 * @param lng Longitude
 * @param lat Latitude
 * @returns Full location details or null on error
 */
export async function searchBoxReverseGeocodeDetailed(
  lng: number,
  lat: number
): Promise<ReverseGeocodeResult | null> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!accessToken) return null;

  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      longitude: lng.toString(),
      latitude: lat.toString(),
      limit: '1',
    });

    const url = `https://api.mapbox.com/search/searchbox/v1/reverse?${params}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);

    const data = await response.json();

    if (!data.features?.length) return null;

    const feature = data.features[0];
    const props = feature.properties;

    return {
      name: props.name || props.full_address || '',
      address: props.address,
      fullAddress: props.full_address,
      placeFormatted: props.place_formatted,
      featureType: props.feature_type,
      category: props.poi_category,
      brand: props.brand,
      maki: props.maki,
      context: {
        country: props.context?.country?.name,
        region: props.context?.region?.name,
        place: props.context?.place?.name,
        neighborhood: props.context?.neighborhood?.name,
      },
    };
  } catch (error) {
    console.error('Error during detailed reverse geocoding:', error);
    return null;
  }
}
