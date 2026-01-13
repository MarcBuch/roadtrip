# Project Brief: Travel Route & Cost MVP (Phase 1)

## Role & Goal

You are a development agent tasked with building the initial Proof of Concept for a travel planning tool. The goal is a functional map interface where users can plot a route and receive immediate travel cost feedback.

## Core Features

- **Interactive Map**: A full-screen or split-pane map (using Mapbox or Leaflet).
- **Waypoint System**: User can click the map to add stops. Points must be draggable or removable.
- **Routing Engine**: Generate a path following actual roads between waypoints.
- **Cost Estimator**: A persistent UI overlay showing:
  - Total distance (miles/km).
  - Estimated travel time.
  - Estimated fuel cost based on a configurable "Price per Gallon" and "MPG" (Miles Per Gallon) variable.

## Technical Specifications

- **Stack**: Next.js, Tailwind CSS, Lucide React (icons), ShadCN/ui components, tRPC.
- **Mapping Library**: `react-map-gl` (Mapbox) or `react-leaflet`.
- **Component Library**: ShadCN/ui for UI components (Button, Card, Slider, Dialog, Input, etc.).
- **State Management**: Use React `useState` or `useReducer` to manage an array of `Waypoints` objects:
  ```typescript
  interface Waypoint {
    id: string;
    lng: number;
    lat: number;
    name?: string;
  }
  ```

## Mathematical Logic

The total cost \( C \) should be calculated as:
$$ C = \left( \frac{D}{MPG} \right) \times P $$
Where:

- \( D \) = Total distance from the routing API.
- \( MPG \) = User-defined vehicle efficiency.
- \( P \) = User-defined fuel price.

## Success Criteria

1. User clicks Map A, then Map B.
2. A line (polyline) appears connecting A to B via roads.
3. The UI updates to show "Total Distance: X miles" and "Fuel Cost: $Y".
4. The map centers/zooms to fit the entire route.

## Preferred Data Source

- **Directions**: Mapbox Directions API or OpenStreetMap (OSRM).
- **Geocoding**: Reverse geocode clicks to get location names (e.g., "Moab, Utah").
