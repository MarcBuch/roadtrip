'use client';

import { Marker } from 'react-map-gl/mapbox';
import { MapPin, X } from 'lucide-react';
import { Waypoint } from '@/types/travel';

interface WaypointMarkerProps {
  waypoint: Waypoint;
  index: number;
  onRemove: (id: string) => void;
}

export function WaypointMarker({
  waypoint,
  index,
  onRemove,
}: WaypointMarkerProps) {
  return (
    <Marker longitude={waypoint.lng} latitude={waypoint.lat} anchor="bottom">
      <div className="relative group">
        <div className="flex flex-col items-center">
          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg">
            {index + 1}
          </div>
          <MapPin
            className="text-blue-600 -mt-1"
            size={20}
            fill="currentColor"
          />
        </div>

        {/* Remove button - shows on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(waypoint.id);
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      </div>
    </Marker>
  );
}
