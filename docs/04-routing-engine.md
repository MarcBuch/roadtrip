# Phase 4: Routing Engine Integration

## Overview

Integrate Mapbox Directions API to generate routes between waypoints and display them on the map.

## Tasks

### 4.1 Create Routing Utility

Create `/lib/routing.ts`:

```typescript
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
```

### 4.2 Create Route State Hook

Create `/hooks/useRoute.ts`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Waypoint, RouteData } from '@/types/travel';
import { fetchRoute } from '@/lib/routing';

export function useRoute(waypoints: Waypoint[]) {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (waypoints.length < 2) {
      setRoute(null);
      return;
    }

    let cancelled = false;

    const getRoute = async () => {
      setLoading(true);
      const routeData = await fetchRoute(waypoints);
      if (!cancelled) {
        setRoute(routeData);
        setLoading(false);
      }
    };

    getRoute();

    return () => {
      cancelled = true;
    };
  }, [waypoints]);

  return { route, loading };
}
```

### 4.3 Add Route Layer to Map

Update `/components/Map/TravelMap.tsx`:

```typescript
import { Source, Layer } from 'react-map-gl/mapbox';
import type { LineLayer } from 'react-map-gl/mapbox';

const routeLayer: LineLayer = {
  id: 'route',
  type: 'line',
  source: 'route',
  layout: {
    'line-join': 'round',
    'line-cap': 'round',
  },
  paint: {
    'line-color': '#3b82f6',
    'line-width': 4,
    'line-opacity': 0.8,
  },
};

interface TravelMapProps {
  waypoints: Waypoint[];
  route: RouteData | null;
  onMapClick: (lng: number, lat: number) => void;
  onRemoveWaypoint: (id: string) => void;
}

export function TravelMap({
  waypoints,
  route,
  onMapClick,
  onRemoveWaypoint,
}: TravelMapProps) {
  // ... existing code ...

  return (
    <div className="h-full w-full">
      <Map {...viewState} /* ... */>
        {/* Route line */}
        {route && (
          <Source id="route" type="geojson" data={route.geometry}>
            <Layer {...routeLayer} />
          </Source>
        )}

        {/* Waypoint markers */}
        {waypoints.map((waypoint, index) => (
          <WaypointMarker
            key={waypoint.id}
            waypoint={waypoint}
            index={index}
            onRemove={onRemoveWaypoint}
          />
        ))}
      </Map>
    </div>
  );
}
```

### 4.4 Auto-fit Map to Route

Add map bounds calculation:

```typescript
import { useEffect, useRef } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

export function TravelMap({ waypoints, route /* ... */ }: TravelMapProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (!mapRef.current || !route || waypoints.length < 2) return;

    // Calculate bounds from route geometry
    const coordinates = route.geometry.coordinates;
    const bounds = coordinates.reduce(
      (acc, coord) => {
        return {
          minLng: Math.min(acc.minLng, coord[0]),
          maxLng: Math.max(acc.maxLng, coord[0]),
          minLat: Math.min(acc.minLat, coord[1]),
          maxLat: Math.max(acc.maxLat, coord[1]),
        };
      },
      {
        minLng: coordinates[0][0],
        maxLng: coordinates[0][0],
        minLat: coordinates[0][1],
        maxLat: coordinates[0][1],
      }
    );

    mapRef.current.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      { padding: 100, duration: 1000 }
    );
  }, [route, waypoints]);

  return (
    <div className="h-full w-full">
      <Map ref={mapRef} {...viewState} /* ... */>
        {/* ... */}
      </Map>
    </div>
  );
}
```

### 4.5 Update Main Page

Integrate routing into the main page:

```typescript
import { useRoute } from '@/hooks/useRoute';

export default function Home() {
  const { waypoints, addWaypoint, removeWaypoint } = useWaypoints();
  const { route, loading } = useRoute(waypoints);

  return (
    <main className="h-screen w-screen flex">
      <TravelMap
        waypoints={waypoints}
        route={route}
        onMapClick={addWaypoint}
        onRemoveWaypoint={removeWaypoint}
      />
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          Calculating route...
        </div>
      )}
    </main>
  );
}
```

## Acceptance Criteria

- [ ] Adding 2+ waypoints generates a route
- [ ] Route follows actual roads (not straight line)
- [ ] Route displays as blue line on map
- [ ] Map auto-zooms to fit entire route
- [ ] Loading indicator appears during route calculation
- [ ] Removing waypoints updates route

## Estimated Time

1.5-2 hours

## Testing Checklist

1. Add 2 waypoints → verify route appears
2. Add 3rd waypoint → verify route updates
3. Remove middle waypoint → verify route recalculates
4. Test long-distance route (e.g., coast to coast)
5. Test international routes if needed
