'use client';

import { TravelMap } from '@/components/Map/TravelMap';
import { ControlPanel } from '@/components/ControlPanel';
import { useWaypoints } from '@/hooks/useWaypoints';
import { useRoute } from '@/hooks/useRoute';
import { useCostSettings } from '@/hooks/useCostSettings';

export default function Home() {
  const { waypoints, addWaypoint, removeWaypoint, clearWaypoints } =
    useWaypoints();
  const { route, loading } = useRoute(waypoints);
  const { settings, updateMpg, updatePrice } = useCostSettings();

  return (
    <main className="h-screen w-screen relative">
      <TravelMap
        waypoints={waypoints}
        route={route}
        onMapClick={addWaypoint}
        onRemoveWaypoint={removeWaypoint}
      />

      <ControlPanel
        route={route}
        settings={settings}
        waypointCount={waypoints.length}
        onUpdateMpg={updateMpg}
        onUpdatePrice={updatePrice}
        onClearRoute={clearWaypoints}
      />

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          Calculating route...
        </div>
      )}
    </main>
  );
}
