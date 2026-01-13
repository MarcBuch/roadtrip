# Phase 3: Waypoint System

## Overview

Implement waypoint management: adding, displaying, removing waypoints with visual markers.

## Tasks

### 3.1 Create Waypoint State Management

Create `/hooks/useWaypoints.ts`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { Waypoint } from '@/types/travel';

export function useWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const addWaypoint = useCallback((lng: number, lat: number) => {
    const newWaypoint: Waypoint = {
      id: `waypoint-${Date.now()}`,
      lng,
      lat,
      name: undefined, // Will be populated by geocoding
    };
    setWaypoints((prev) => [...prev, newWaypoint]);
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
  }, []);

  const updateWaypoint = useCallback(
    (id: string, updates: Partial<Waypoint>) => {
      setWaypoints((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
    },
    []
  );

  return {
    waypoints,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    updateWaypoint,
  };
}
```

### 3.2 Create Waypoint Marker Component

Create `/components/Map/WaypointMarker.tsx`:

```typescript
'use client';

import { Marker } from 'react-map-gl/mapbox';
import { MapPin, X } from 'lucide-react';
import { Waypoint } from '@/types/travel';

interface WaypointMarkerProps {
  waypoint: Waypoint;
  index: number;
  onRemove: (id: string) => void;
}

export function WaypointMarker({
  waypoint,
  index,
  onRemove,
}: WaypointMarkerProps) {
  return (
    <Marker longitude={waypoint.lng} latitude={waypoint.lat} anchor="bottom">
      <div className="relative group">
        <div className="flex flex-col items-center">
          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg">
            {index + 1}
          </div>
          <MapPin
            className="text-blue-600 -mt-1"
            size={20}
            fill="currentColor"
          />
        </div>

        {/* Remove button - shows on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(waypoint.id);
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      </div>
    </Marker>
  );
}
```

### 3.3 Update TravelMap Component

Modify `/components/Map/TravelMap.tsx` to display waypoints:

```typescript
import { WaypointMarker } from './WaypointMarker';
import { Waypoint } from '@/types/travel';

interface TravelMapProps {
  waypoints: Waypoint[];
  onMapClick: (lng: number, lat: number) => void;
  onRemoveWaypoint: (id: string) => void;
}

export function TravelMap({
  waypoints,
  onMapClick,
  onRemoveWaypoint,
}: TravelMapProps) {
  // ... existing code ...

  return (
    <div className="h-full w-full">
      <Map {...viewState} /* ... */>
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

### 3.4 Update Main Page

Connect waypoint system to the page:

```typescript
'use client';

import { TravelMap } from '@/components/Map/TravelMap';
import { useWaypoints } from '@/hooks/useWaypoints';

export default function Home() {
  const { waypoints, addWaypoint, removeWaypoint } = useWaypoints();

  return (
    <main className="h-screen w-screen flex">
      <TravelMap
        waypoints={waypoints}
        onMapClick={addWaypoint}
        onRemoveWaypoint={removeWaypoint}
      />
    </main>
  );
}
```

### 3.5 Add Waypoint List Panel (Optional Enhancement)

Create `/components/WaypointList.tsx` for a sidebar showing all waypoints.

## Acceptance Criteria

- [ ] Clicking map adds numbered waypoint markers
- [ ] Markers display correctly with numbers
- [ ] Hovering marker shows remove button
- [ ] Clicking remove button deletes waypoint
- [ ] Multiple waypoints can be added
- [ ] Waypoint state persists until removed

## Estimated Time

1-1.5 hours

## Future Enhancements

- Draggable waypoints
- Reorder waypoints via drag-and-drop
- Named waypoints from geocoding
