# Reverse Geocoding Refactoring: Geocoding API v5 to Search Box API

## Executive Summary

The current reverse geocoding implementation uses Mapbox Geocoding API v5. While functional, migrating to the Search Box API's `/reverse` endpoint offers advantages including:

- **Unified Search Platform**: Single API for all location search needs
- **POI Data**: Access to detailed Point of Interest information
- **Better Metadata**: Richer feature information and context hierarchy
- **Future-Proof**: Aligns with Mapbox's modern, actively maintained API
- **Feature Parity**: Search Box API `/reverse` is more feature-rich than Geocoding v5 reverse geocoding

---

## Current Implementation Analysis

### Existing Code (lib/geocoding.ts)

```typescript
export async function reverseGeocode(lng: number, lat: number): Promise<string>;
```

**Endpoint**: `https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json`

**Parameters Used**:

- `types=poi,place` - Filter to POIs and places only
- `limit=1` - Return single result
- `access_token` - Mapbox token

**Response Processing**:

- Extracts `feature.text` or `feature.place_name`
- Falls back to coordinate string if no results

**Usage**: Called when user drags a waypoint marker to update its name

---

## Search Box API Reverse Endpoint

### Endpoint Specification

```
GET https://api.mapbox.com/search/searchbox/v1/reverse?longitude={lng}&latitude={lat}&access_token={token}
```

### Key Differences from Geocoding v5

| Aspect                   | Geocoding v5                                                                | Search Box API                                                                           |
| ------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **POI Data**             | Limited (v6 removed it)                                                     | ✅ Full POI support                                                                      |
| **Feature Types**        | country, region, postcode, district, place, locality, neighborhood, address | country, region, postcode, district, place, locality, neighborhood, street, address, poi |
| **Response Format**      | GeoJSON Feature                                                             | GeoJSON FeatureCollection with richer properties                                         |
| **Metadata**             | Basic                                                                       | Includes maki icons, categories, external IDs                                            |
| **Context Object**       | Limited                                                                     | Full geographic hierarchy                                                                |
| **Routable Points**      | Not included                                                                | ✅ Included for routing                                                                  |
| **Coordinates Accuracy** | accuracy metric only                                                        | accuracy + routable_points                                                               |
| **Brand Data**           | N/A                                                                         | ✅ For POIs (Starbucks, McDonald's, etc.)                                                |
| **Cost**                 | Per-request                                                                 | Per-request (same model)                                                                 |

### Response Example Comparison

#### Geocoding v5 Response

```json
{
  "features": [
    {
      "id": "poi.xxx",
      "type": "Feature",
      "text": "Michigan Stadium",
      "place_name": "Michigan Stadium, Ann Arbor, Michigan 48104, United States",
      "geometry": { "type": "Point", "coordinates": [...] },
      "properties": {}
    }
  ]
}
```

#### Search Box API Response

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [...] },
      "properties": {
        "name": "Michigan Stadium",
        "feature_type": "poi",
        "address": "1201 S Main St",
        "full_address": "1201 S Main St, Ann Arbor, Michigan 48104, United States of America",
        "place_formatted": "Ann Arbor, Michigan 48104, United States of America",
        "maki": "marker",
        "poi_category": ["track", "sports"],
        "coordinates": {
          "latitude": 42.265837,
          "longitude": -83.748708,
          "routable_points": [...]
        },
        "context": {
          "country": { "name": "United States of America", "country_code": "US" },
          "region": { "name": "Michigan", "region_code": "MI" },
          "place": { "name": "Ann Arbor" },
          ...
        }
      }
    }
  ]
}
```

---

## Refactoring Plan

### Phase 1: Create New Reverse Geocoding Function

#### New Function: `lib/mapboxSearch.ts`

```typescript
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

      // Prefer full address, then address, then place name
      return (
        props.full_address ||
        props.address ||
        props.name ||
        `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`
      );
    }

    return `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch (error) {
    console.error('Error during Search Box reverse geocoding:', error);
    return `Waypoint (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
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
```

---

### Phase 2: Migration Path

#### Option A: Gradual Replacement (Recommended)

**Step 1**: Create new Search Box functions alongside existing implementation

```typescript
// lib/mapboxSearch.ts (new)
export async function searchBoxReverseGeocode(...) { ... }

// lib/geocoding.ts (existing)
export async function reverseGeocode(...) { ... }  // Keep for backwards compatibility
```

**Step 2**: Update app to use new function

```typescript
// app/page.tsx
- import { reverseGeocode } from '@/lib/geocoding';
+ import { searchBoxReverseGeocode } from '@/lib/mapboxSearch';

  const handleUpdateWaypoint = async (id: string, lat: number, lng: number) => {
    updateWaypoint(id, { lat, lng, name: '...' });
    try {
-     const locationName = await reverseGeocode(lng, lat);
+     const locationName = await searchBoxReverseGeocode(lng, lat);
      updateWaypoint(id, { name: locationName });
    } catch (error) { ... }
  };
```

**Step 3**: Remove old function once stable

```typescript
// lib/geocoding.ts - can deprecate reverseGeocode
```

#### Option B: Direct Replacement

Replace the existing `reverseGeocode` function entirely:

```typescript
// lib/geocoding.ts
export async function reverseGeocode(
  lng: number,
  lat: number
): Promise<string> {
  // Now uses Search Box API instead of Geocoding v5
  return searchBoxReverseGeocode(lng, lat);
}
```

---

### Phase 3: Enhanced Waypoint Display (Future)

With Search Box API's richer data, consider enhancing waypoint display:

```typescript
// types/travel.ts
export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  name: string;
  // New optional fields
  address?: string;
  featureType?: string; // 'poi' | 'place' | 'address' | etc.
  poi_category?: string[]; // ['restaurant', 'food_and_drink']
  maki?: string; // 'marker', 'restaurant', 'hotel', etc.
}
```

UI enhancements:

- Display feature type badge (POI, Address, Place, etc.)
- Show detailed address instead of just name
- Display POI category information
- Use maki icons for quick visual identification

---

## Detailed Comparison: Parameter Support

### Reverse Geocoding Parameters

| Parameter   | Geocoding v5 | Search Box API | Use Case                  |
| ----------- | ------------ | -------------- | ------------------------- |
| `types`     | ✅ Yes       | ✅ Yes         | Filter by feature type    |
| `limit`     | ✅ Yes       | ✅ Yes         | Return multiple results   |
| `language`  | ✅ Yes       | ✅ Yes         | Response language         |
| `country`   | ✅ Yes       | ✅ Yes         | Geographic filtering      |
| `bbox`      | ❌ No        | ❌ No          | Not applicable to reverse |
| `proximity` | ❌ No        | ❌ No          | Not applicable to reverse |

**Common Search Box Parameters Not in Geocoding v5**:

- None that apply to reverse lookup

---

## Testing Strategy

### Unit Tests

```typescript
describe('searchBoxReverseGeocode', () => {
  it('should return location name for valid coordinates', async () => {
    const result = await searchBoxReverseGeocode(-83.748708, 42.265837);
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/Location at/);
  });

  it('should return fallback for no results', async () => {
    const result = await searchBoxReverseGeocode(0, 0);
    expect(result).toMatch(/Location at/);
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    const result = await searchBoxReverseGeocode(-83.748708, 42.265837);
    expect(result).toBeTruthy();
  });

  it('should parse POI results correctly', async () => {
    const result = await searchBoxReverseGeocodeDetailed(-83.748708, 42.265837);
    expect(result?.featureType).toBe('poi');
    expect(result?.category).toBeDefined();
  });
});
```

### Integration Tests

- Test with various coordinate types (POI, address, place, neighborhood)
- Test error scenarios (invalid coords, API downtime)
- Test performance (response time, token usage)
- Compare v5 vs Search Box results for same coordinates

### Edge Cases

- Ocean coordinates (no land features)
- Disputed territories
- Very remote locations
- Boundary coordinates

---

## Implementation Checklist

### Prerequisites

- [x] Review Search Box API documentation
- [x] Understand response format differences
- [x] Confirm Mapbox token has Search Box API access
- [ ] Create test coordinates dataset
- [ ] Set up development/staging environment

### Implementation

- [ ] Create `lib/mapboxSearch.ts` with new functions
- [ ] Add TypeScript types for responses
- [ ] Write unit tests
- [ ] Test with sample locations
- [ ] Compare results with current implementation
- [ ] Update imports in `app/page.tsx`
- [ ] Add error handling and logging
- [ ] Performance benchmark

### Validation

- [ ] Integration test with real waypoints
- [ ] Test drag-to-update workflow
- [ ] Test error scenarios
- [ ] Verify token usage hasn't increased
- [ ] Check for any regressions

### Documentation

- [ ] Update JSDoc comments
- [ ] Document response format
- [ ] Add usage examples
- [ ] Document any breaking changes
- [ ] Update changelog

---

## Performance Considerations

### API Calls

- **Current**: 1 request per waypoint drag
- **After Migration**: 1 request per waypoint drag (no change)
- **Caching Opportunity**: Cache results by coordinates to avoid duplicate requests

### Response Size

- **Geocoding v5**: ~500 bytes
- **Search Box API**: ~1-2 KB (richer data)
- **Impact**: Minimal, as only called on waypoint interaction

### Latency

- **Expected**: Similar (both Mapbox APIs)
- **Typical**: 200-500ms

---

## Cost Analysis

### Billing Impact

Both APIs use **per-request billing** for reverse geocoding:

- One reverse lookup = one API request charge
- **No cost advantage** for reverse geocoding migration
- However, unified API may provide volume discounts

### When Combined with Place Search

If implementing both features:

- Reverse lookup on drag: Search Box API `/reverse`
- Place search on type: Search Box API `/suggest` + `/retrieve` (session-based)
- **Cost efficiency**: Unified platform with better session pricing

---

## Potential Issues & Solutions

### Issue 1: Different Result Quality

**Problem**: Search Box API might return different POI than Geocoding v5

**Solution**:

- Run both APIs on sample coordinates during development
- Create test comparison matrix
- Document any differences
- Consider adjusting feature type filters if needed

### Issue 2: Response Structure Changes

**Problem**: Different JSON structure requires code changes

**Solution**:

- Create adapter function to normalize responses
- Maintain backwards compatibility temporarily
- Update all consuming code carefully

### Issue 3: Data Privacy

**Problem**: Richer POI data may have privacy implications

**Solution**:

- Review Mapbox ToS for data usage
- Ensure user consent for feature tracking
- Don't store detailed POI information longer than necessary

---

## Recommendation

**Go with Search Box API `/reverse` endpoint because**:

1. ✅ **Future-Proof**: Modern, actively maintained API
2. ✅ **Feature-Rich**: Access to POI categories, brands, detailed metadata
3. ✅ **Unified Platform**: Single API for both search and reverse geocoding
4. ✅ **Better Integration**: Works seamlessly with place search feature
5. ✅ **Same Cost**: Per-request billing, no cost increase
6. ✅ **Enhanced UX**: Enables richer waypoint information display

**Implementation Priority**:

1. Phase 1: Create new functions (low risk)
2. Phase 2: Gradually migrate existing code (test thoroughly)
3. Phase 3: Enhance UI with richer data (future improvement)

---

## Resources

- [Search Box API `/reverse` Documentation](https://docs.mapbox.com/api/search/search-box/#reverse-lookup)
- [Geocoding API v5 Documentation](https://docs.mapbox.com/api/search/geocoding-v5/)
- [Search Box vs Geocoding Comparison](https://docs.mapbox.com/api/search/search-box/#upgrade-to-search-box-api-from-mapbox-geocoding-api)
