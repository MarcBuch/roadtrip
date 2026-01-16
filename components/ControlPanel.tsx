'use client';

import { CostDisplay } from './CostDisplay';
import { SettingsPanel } from './SettingsPanel';
import { WaypointList } from './WaypointList';
import { Button } from '@/components/ui/button';
import { Trash2, Save, Library } from 'lucide-react';
import { RouteData, CostSettings, Waypoint } from '@/types/travel';

interface ControlPanelProps {
  route: RouteData | null;
  settings: CostSettings;
  waypoints: Waypoint[];
  onUpdateMpg: (mpg: number) => void;
  onUpdatePrice: (price: number) => void;
  onRemoveWaypoint: (id: string) => void;
  onClearWaypoints: () => void;
  onUpdateWaypointName: (id: string, name: string) => void;
  onSaveRoute?: () => void;
  onShowLibrary?: () => void;
}

export function ControlPanel({
  route,
  settings,
  waypoints,
  onUpdateMpg,
  onUpdatePrice,
  onRemoveWaypoint,
  onClearWaypoints,
  onUpdateWaypointName,
  onSaveRoute,
  onShowLibrary,
}: ControlPanelProps) {
  return (
    <div className="absolute top-4 right-4 max-h-[calc(100vh-2rem)] overflow-y-auto space-y-4 flex flex-col">
      <CostDisplay
        route={route}
        settings={settings}
        waypointCount={waypoints.length}
      />

      <SettingsPanel
        settings={settings}
        onUpdateMpg={onUpdateMpg}
        onUpdatePrice={onUpdatePrice}
      />

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-400px)]">
        <WaypointList
          waypoints={waypoints}
          onRemove={onRemoveWaypoint}
          onClear={onClearWaypoints}
          onUpdateName={onUpdateWaypointName}
        />
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex gap-2">
        {onSaveRoute && (
          <Button
            size="sm"
            className="flex-1"
            onClick={onSaveRoute}
            disabled={waypoints.length === 0}
          >
            <Save size={16} className="mr-2" />
            Save Route
          </Button>
        )}
        {onShowLibrary && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onShowLibrary}
          >
            <Library size={16} className="mr-2" />
            Library
          </Button>
        )}
      </div>
    </div>
  );
}
