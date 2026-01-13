'use client';

import { Waypoint } from '@/types/travel';
import { X, MapPin } from 'lucide-react';

interface WaypointListProps {
  waypoints: Waypoint[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function WaypointList({
  waypoints,
  onRemove,
  onClear,
}: WaypointListProps) {
  if (waypoints.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        Click on the map to add waypoints
      </div>
    );
  }

  return (
    <div className="bg-white border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-lg">
          Waypoints ({waypoints.length})
        </h2>
        <button
          onClick={onClear}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          Clear All
        </button>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
        <ul className="divide-y divide-gray-200">
          {waypoints.map((waypoint, index) => (
            <li
              key={waypoint.id}
              className="p-3 hover:bg-gray-50 transition-colors flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2 flex-1">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {waypoint.name || 'Unnamed'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onRemove(waypoint.id)}
                className="text-red-500 hover:text-red-700 p-1 transition-colors flex-shrink-0"
                title="Remove waypoint"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
