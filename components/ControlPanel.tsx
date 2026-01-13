'use client';

import { CostDisplay } from './CostDisplay';
import { SettingsPanel } from './SettingsPanel';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { RouteData, CostSettings } from '@/types/travel';

interface ControlPanelProps {
  route: RouteData | null;
  settings: CostSettings;
  waypointCount: number;
  onUpdateMpg: (mpg: number) => void;
  onUpdatePrice: (price: number) => void;
  onClearRoute: () => void;
}

export function ControlPanel({
  route,
  settings,
  waypointCount,
  onUpdateMpg,
  onUpdatePrice,
  onClearRoute,
}: ControlPanelProps) {
  return (
    <div className="absolute top-4 right-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <CostDisplay
        route={route}
        settings={settings}
        waypointCount={waypointCount}
      />

      <SettingsPanel
        settings={settings}
        onUpdateMpg={onUpdateMpg}
        onUpdatePrice={onUpdatePrice}
      />

      {waypointCount > 0 && (
        <Button onClick={onClearRoute} variant="destructive" className="w-full">
          <Trash2 size={16} className="mr-2" />
          Clear All Waypoints
        </Button>
      )}
    </div>
  );
}
