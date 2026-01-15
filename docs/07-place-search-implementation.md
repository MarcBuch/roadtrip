# Place Search Implementation Guide

## Overview

Currently, the travel planner application only allows adding waypoints by clicking on the map. This guide outlines how to implement place search functionality using Mapbox's search tools, enabling users to search for locations by name instead of clicking coordinates.

## Available Mapbox Search Tools

### 1. Geocoding API (Current Implementation)

**Status**: Already in use for reverse geocoding

**Capabilities**:

- Forward geocoding: Convert location text to coordinates
- Reverse geocoding: Convert coordinates to place names (already implemented)
- Autocomplete support
- Batch geocoding

**Limitations**:

- POI (Point of Interest) data was removed in v6
- Per-request billing
- One keystroke = one request (can be expensive for autocomplete)

**Current Usage**: `lib/geocoding.ts` uses reverse geocoding for waypoint names

---

### 2. Search Box API (Recommended for Place Search)

**Status**: Modern alternative with enhanced features

**Key Endpoints**:

- `/suggest` - Autocomplete suggestions (type-ahead)
- `/retrieve` - Get full details for a selected suggestion
- `/forward` - One-off text search (no autocomplete)
- `/category` - Search POIs by category
- `/reverse` - Reverse location lookup

**Advantages**:

- Includes POI data (restaurants, landmarks, etc.)
- Session-based billing (more cost-effective for interactive search)
- Better autocomplete experience
- Support for POI categories
- Same location data hierarchy as Geocoding API

**Considerations**:

- Session token required for `/suggest` and `/retrieve`
- Sessions end after one complete search or 60 minutes
- Supported in US, Canada, and Europe primarily
- Rate limit: 10 requests/second (default)

---

## Implementation Approaches

### Approach 1: Interactive Search with Autocomplete (Recommended)

**Best for**: Users typing to search for places with real-time suggestions

**Flow**:

1. User opens search dialog and types place name
2. Each keystroke calls `/suggest` endpoint
3. Display list of suggested results
4. User selects a result
5. Call `/retrieve` endpoint to get coordinates
6. Add waypoint at those coordinates

**Benefits**:

- Excellent user experience
- Cost-effective billing (grouped as single session)
- Real-time feedback

**Considerations**:

- Need to manage session tokens (UUID per search session)
- Should debounce requests (wait for 300-500ms of typing before requesting)
- Rate limiting at 10 req/sec

**Implementation**:

```typescript
// Hook for interactive search
useSearchPlaces(searchQuery: string, sessionToken: string)
```

---

### Approach 2: Simple Text Search

**Best for**: Users who want quick one-off searches

**Flow**:

1. User enters search text and submits
2. Call `/forward` endpoint
3. Display results with coordinates
4. User selects a result to add as waypoint

**Benefits**:

- Simpler implementation
- No session management needed
- Works for quick searches

**Considerations**:

- Per-request billing
- No autocomplete suggestions
- Less interactive experience

---

## Recommended Implementation Plan

### Phase 1: Basic Place Search (MVP)

#### 1. Create Search Hook

**File**: `hooks/useSearch.ts`

```typescript
interface SearchResult {
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

interface SearchSuggestion {
  name: string;
  mapboxId: string;
  placeFormatted: string;
}

export function useSearch() {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToken] = useState(() => generateUUID());

  const suggest = async (query: string) => {
    // Call /suggest endpoint with debouncing
  };

  const retrieve = async (mapboxId: string): Promise<SearchResult | null> => {
    // Call /retrieve endpoint with mapboxId
  };

  return { suggestions, loading, suggest, retrieve, sessionToken };
}
```

#### 2. Create Search Panel Component

**File**: `components/SearchPanel.tsx`

- Search input with real-time suggestions
- Dropdown list of search results
- Auto-complete functionality
- Loading states and error handling

#### 3. Integrate into Main App

**File**: `app/page.tsx`

- Add search panel to the UI
- Handle waypoint creation from search results
- Use existing `addWaypoint()` function with coordinates from search

---

### Phase 2: Enhanced Features

#### Optional Enhancements:

1. **Category Search**: Quick buttons for "Restaurants", "Hotels", "Gas Stations"
2. **Proximity Biasing**: Bias search results to map center
3. **Bounding Box Filtering**: Limit results to visible map area
4. **Search History**: Remember recent searches
5. **Favorite Places**: Save frequently searched locations

---

## API Comparison: Search Box API vs Geocoding API

| Feature               | Search Box API                    | Geocoding API               |
| --------------------- | --------------------------------- | --------------------------- |
| POI Data              | ✅ Included                       | ❌ Removed in v6            |
| Autocomplete          | ✅ `/suggest` endpoint            | ✅ `autocomplete` parameter |
| Feature Coverage      | Addresses, Places, Streets, POIs  | Addresses, Places, Streets  |
| Billing Model         | Session-based or per-request      | Per-request only            |
| Cost for Autocomplete | Single session (e.g., 7 requests) | 7 separate charges          |
| Data Freshness        | More current POI data             | Stable, address-focused     |

---

## Implementation Details

### Search Box API Endpoints

#### Suggest (Autocomplete)

```
GET /search/searchbox/v1/suggest?q={query}&access_token={token}&session_token={sessionToken}
```

**Parameters**:

- `q`: Search query (max 256 characters)
- `session_token`: UUID to group requests (required)
- `limit`: Max 10 results (default 5)
- `proximity`: Bias results near coordinates `lon,lat`
- `bbox`: Bounding box filter `minLon,minLat,maxLon,maxLat`
- `country`: Filter by ISO country codes (comma-separated)
- `types`: Feature type filter (address,place,poi,street,etc.)
- `language`: IETF language tag

**Response**: Array of suggestions with `mapbox_id` for retrieval

#### Retrieve

```
GET /search/searchbox/v1/retrieve/{mapbox_id}?access_token={token}&session_token={sessionToken}
```

**Returns**: GeoJSON Feature with full coordinates and metadata

#### Forward (Text Search, Non-Interactive)

```
GET /search/searchbox/v1/forward?q={query}&access_token={token}
```

**Use**: For one-off searches without session tracking

---

### File Structure

```
components/
├── SearchPanel.tsx       # Main search UI component
├── SearchInput.tsx       # Input with autocomplete
├── SearchResults.tsx     # Results dropdown list
└── SearchResultItem.tsx  # Individual result item

hooks/
├── useSearch.ts          # Hook for search logic
├── useSearchDebounce.ts  # Debounce helper

lib/
└── mapboxSearch.ts       # API calls wrapper
```

---

## Security Considerations

1. **API Token**: Use `NEXT_PUBLIC_MAPBOX_TOKEN` (already configured)
2. **Rate Limiting**: Implement client-side debouncing
3. **Session Management**: Generate unique UUID per search session
4. **Data Validation**: Validate coordinates are within expected ranges
5. **CORS**: Search Box API supports browser requests

---

## Testing Considerations

1. Test with various location types (addresses, POIs, neighborhoods)
2. Test debounce timing (300-500ms recommended)
3. Test session token generation and reuse
4. Test error handling (no results, API errors)
5. Test proximity biasing with map center
6. Performance test with rapid typing

---

## Migration Path: From Current Geocoding to Search Box API

If integrating POI search becomes important:

1. **Keep** existing reverse geocoding for waypoint name display
2. **Add** Search Box API for new place search feature
3. **Option**: Eventually replace forward geocoding calls with Search Box `/forward`
4. **Monitor**: Track usage patterns to optimize billing

---

## Cost Analysis

### Example Scenario: User searches for "restaurants"

- **Typing "restaurants"**: 11 keystrokes
- **Geocoding API**: 11 API requests × cost per request
- **Search Box API** (with `/suggest` + `/retrieve`): 1 session (billed as 1 session regardless of keystrokes)

**Estimated Savings**: 90% reduction for interactive search workflows

---

## Next Steps

1. **Choose Approach**: Interactive Search (recommended) vs Simple Text Search
2. **Implement Hook**: Create `useSearch.ts` with Search Box API integration
3. **Create UI**: Build search panel component
4. **Integration**: Connect to existing waypoint management
5. **Testing**: Comprehensive testing with real location data
6. **Monitoring**: Track API usage and performance

---

## Resources

- [Mapbox Search Box API Documentation](https://docs.mapbox.com/api/search/search-box/)
- [Mapbox Geocoding API v6](https://docs.mapbox.com/api/search/geocoding/)
- [Search Box API Playground](https://docs.mapbox.com/playground/search-box/)
- [Session-Based Billing Guide](https://docs.mapbox.com/api/search/search-box/#session-billing)

---

## Conclusion

Implementing place search using Mapbox Search Box API will significantly enhance user experience by allowing direct location searches. The interactive autocomplete approach is recommended for best UX and cost-effectiveness, especially for users who interact frequently with search features.
