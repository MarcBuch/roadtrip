'use client';

import { TravelMap } from '@/components/Map/TravelMap';
import { ControlPanel } from '@/components/ControlPanel';
import { SearchPanel } from '@/components/SearchPanel';
import { SaveRouteDialog } from '@/components/SaveRouteDialog';
import { RoutesLibrary } from '@/components/RoutesLibrary';
import { useWaypoints } from '@/hooks/useWaypoints';
import { useRoute } from '@/hooks/useRoute';
import { useCostSettings } from '@/hooks/useCostSettings';
import { SearchResult, searchBoxReverseGeocode } from '@/lib/mapboxSearch';
import { useState } from 'react';

export default function Home() {
  const {
    waypoints,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    updateWaypoint,
    setWaypointsFromRoute,
  } = useWaypoints();
  const { route, loading } = useRoute(waypoints);
  const { settings, updateMpg, updatePrice } = useCostSettings();
  const [mapCenter, setMapCenter] = useState<
    { lng: number; lat: number } | undefined
  >();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  const handleUpdateWaypoint = async (id: string, lat: number, lng: number) => {
    updateWaypoint(id, { lat, lng, name: '...' });

    try {
      const locationName = await searchBoxReverseGeocode(lng, lat);
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

  const handleSaveRoute = async (name: string, description?: string) => {
    try {
      const { api } = await import('@/lib/trpc/client');
      await api.routes.create.mutate({
        name,
        description,
        waypoints: waypoints.map((w) => ({
          latitude: w.lat,
          longitude: w.lng,
          name: w.name,
        })),
      });
      clearWaypoints();
    } catch (error) {
      console.error('Failed to save route:', error);
      alert('Failed to save route');
    }
  };

  const handleLoadRoute = async (routeId: string) => {
    try {
      const { api } = await import('@/lib/trpc/client');
      const route = await api.routes.get.query({ id: routeId });
      
      if (route.waypoints && route.waypoints.length > 0) {
        const loadedWaypoints = route.waypoints
          .sort((a, b) => a.position - b.position)
          .map((wp) => ({
            id: wp.id,
            lng: wp.longitude,
            lat: wp.latitude,
            name: wp.name || undefined,
          }));
        
        setWaypointsFromRoute(loadedWaypoints);
        setShowLibrary(false);
      }
    } catch (error) {
      console.error('Failed to load route:', error);
      alert('Failed to load route');
    }
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
        onSaveRoute={() => setSaveDialogOpen(true)}
        onShowLibrary={() => setShowLibrary(true)}
      />

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          Calculating route...
        </div>
      )}

      <SaveRouteDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveRoute}
      />

      {showLibrary && (
        <div className="absolute bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <RoutesLibrary onLoadRoute={handleLoadRoute} />
          <button
            onClick={() => setShowLibrary(false)}
            className="w-full p-2 text-sm text-gray-600 border-t hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      )}
    </main>
  );
}
