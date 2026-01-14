'use client';

import { TravelMap } from '@/components/Map/TravelMap';
import { ControlPanel } from '@/components/ControlPanel';
import { useWaypoints } from '@/hooks/useWaypoints';
import { useRoute } from '@/hooks/useRoute';
import { useCostSettings } from '@/hooks/useCostSettings';

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

  const handleUpdateWaypoint = (id: string, lat: number, lng: number) => {
    updateWaypoint(id, { lat, lng });
  };

  const handleUpdateWaypointName = (id: string, name: string) => {
    updateWaypoint(id, { name });
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
