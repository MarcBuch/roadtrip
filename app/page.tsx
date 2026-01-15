'use client';

import { TravelMap } from '@/components/Map/TravelMap';
import { ControlPanel } from '@/components/ControlPanel';
import { SearchPanel } from '@/components/SearchPanel';
import { useWaypoints } from '@/hooks/useWaypoints';
import { useRoute } from '@/hooks/useRoute';
import { useCostSettings } from '@/hooks/useCostSettings';
import { reverseGeocode } from '@/lib/geocoding';
import { SearchResult } from '@/lib/mapboxSearch';
import { useState } from 'react';

export default function Home() {
  const {
    waypoints,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    updateWaypoint,
  } = useWaypoints();
  const { route, loading } = useRoute(waypoints);
  const { settings, updateMpg, updatePrice } = useCostSettings();
  const [mapCenter, setMapCenter] = useState<
    { lng: number; lat: number } | undefined
  >();

  const handleUpdateWaypoint = async (id: string, lat: number, lng: number) => {
    // Update position immediately
    updateWaypoint(id, { lat, lng, name: '...' });

    // Fetch new location name
    try {
      const locationName = await reverseGeocode(lng, lat);
      updateWaypoint(id, { name: locationName });
    } catch (error) {
      console.error('Failed to geocode location:', error);
      updateWaypoint(id, {
        name: `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      });
    }
  };

  const handleUpdateWaypointName = (id: string, name: string) => {
    updateWaypoint(id, { name });
  };

  const handleLocationSelect = async (result: SearchResult) => {
    console.log('handleLocationSelect called with:', result);
    const { longitude, latitude } = result.coordinates;
    console.log('Adding waypoint at:', { lng: longitude, lat: latitude });
    await addWaypoint(longitude, latitude);
  };

  return (
    <main className="h-screen w-screen relative">
      <TravelMap
        waypoints={waypoints}
        route={route}
        onMapClick={addWaypoint}
        onRemoveWaypoint={removeWaypoint}
        onUpdateWaypoint={handleUpdateWaypoint}
      />

      <div className="absolute top-4 left-4 z-40">
        <SearchPanel
          onLocationSelect={handleLocationSelect}
          proximityCenter={mapCenter}
        />
      </div>

      <ControlPanel
        route={route}
        settings={settings}
        waypoints={waypoints}
        onUpdateMpg={updateMpg}
        onUpdatePrice={updatePrice}
        onRemoveWaypoint={removeWaypoint}
        onClearWaypoints={clearWaypoints}
        onUpdateWaypointName={handleUpdateWaypointName}
      />

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          Calculating route...
        </div>
      )}
    </main>
  );
}
