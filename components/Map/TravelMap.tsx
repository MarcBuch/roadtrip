'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import type { MapMouseEvent, MapRef, LineLayer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { WaypointMarker } from './WaypointMarker';
import { Waypoint, RouteData } from '@/types/travel';

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
  waypoints?: Waypoint[];
  route?: RouteData | null;
  onMapClick: (lng: number, lat: number) => void;
  onRemoveWaypoint?: (id: string) => void;
  onUpdateWaypoint?: (id: string, lat: number, lng: number) => void;
}

export function TravelMap({
  waypoints = [],
  route = null,
  onMapClick,
  onRemoveWaypoint,
  onUpdateWaypoint,
}: TravelMapProps) {
  const mapRef = useRef<MapRef>(null);
  const isDraggingMarker = useRef(false);
  const [viewState, setViewState] = useState({
    longitude: -109.5, // Center of US
    latitude: 38.5,
    zoom: 4,
  });

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      // Ignore clicks that happen right after dragging a marker
      if (isDraggingMarker.current) {
        isDraggingMarker.current = false;
        return;
      }
      const { lng, lat } = event.lngLat;
      onMapClick(lng, lat);
    },
    [onMapClick]
  );

  const handleMarkerDragStart = useCallback(() => {
    isDraggingMarker.current = true;
  }, []);

  const handleMarkerDragEnd = useCallback(
    (id: string, lat: number, lng: number) => {
      onUpdateWaypoint?.(id, lat, lng);
      // Keep isDraggingMarker true to prevent the click event
      setTimeout(() => {
        isDraggingMarker.current = false;
      }, 100);
    },
    [onUpdateWaypoint]
  );

  const handleRemoveWaypoint = useCallback(
    (id: string) => {
      onRemoveWaypoint?.(id);
    },
    [onRemoveWaypoint]
  );

  // Auto-fit map to route bounds
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
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      >
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
            onRemove={handleRemoveWaypoint}
            onDragStart={handleMarkerDragStart}
            onUpdatePosition={handleMarkerDragEnd}
          />
        ))}
      </Map>
    </div>
  );
}
