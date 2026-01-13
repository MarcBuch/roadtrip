# Phase 2: Map Integration

## Overview

Implement the interactive map interface using react-map-gl and Mapbox GL JS.

## Tasks

### 2.1 Create Map Component

Create `/components/Map/TravelMap.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { MapLayerMouseEvent } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TravelMapProps {
  onMapClick: (lng: number, lat: number) => void;
}

export function TravelMap({ onMapClick }: TravelMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -109.5, // Center of US
    latitude: 38.5,
    zoom: 4,
  });

  const handleMapClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const { lng, lat } = event.lngLat;
      onMapClick(lng, lat);
    },
    [onMapClick]
  );

  return (
    <div className="h-full w-full">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      />
    </div>
  );
}
```

### 2.2 Update Main Page

Modify `/app/page.tsx` to include the map:

```typescript
'use client';

import { TravelMap } from '@/components/Map/TravelMap';

export default function Home() {
  const handleMapClick = (lng: number, lat: number) => {
    console.log('Map clicked:', { lng, lat });
  };

  return (
    <main className="h-screen w-screen flex">
      <TravelMap onMapClick={handleMapClick} />
    </main>
  );
}
```

### 2.3 Update Global Styles

Ensure `/app/globals.css` includes:

```css
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
```

### 2.4 Test Map Interaction

- Click anywhere on the map
- Verify console logs show correct coordinates
- Test pan and zoom functionality
- Verify map loads without errors

## Acceptance Criteria

- [ ] Map renders full-screen
- [ ] Map is interactive (pan, zoom)
- [ ] Clicking map logs coordinates
- [ ] Map style loads correctly
- [ ] No console errors

## Estimated Time

45-60 minutes

## Troubleshooting

- If map doesn't render: Check Mapbox token in `.env.local`
- If styles are broken: Verify `mapbox-gl/dist/mapbox-gl.css` import
- If webpack errors: Check next.config.ts webpack alias
