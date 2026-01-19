'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Trash2, Map } from 'lucide-react';
import type { Route as DbRoute } from '@/lib/db/schema';

interface RouteWithWaypoints extends Omit<
  DbRoute,
  'created_at' | 'updated_at'
> {
  created_at: string | Date;
  updated_at: string | Date;
  waypoints?: Array<{
    id: string;
    latitude: string;
    longitude: string;
    name: string | null;
    position: number;
  }>;
}

interface RoutesLibraryProps {
  onLoadRoute: (routeId: string) => void;
}

export function RoutesLibrary({ onLoadRoute }: RoutesLibraryProps) {
  const [routes, setRoutes] = useState<RouteWithWaypoints[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const data = await api.routes.list.query();
        setRoutes(data);
      } catch (error) {
        console.error('Failed to load routes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRoutes();
  }, []);

  const handleDelete = async (routeId: string) => {
    if (confirm('Delete this route?')) {
      try {
        await api.routes.delete.mutate({ id: routeId });
        setRoutes((prev) => prev.filter((r) => r.id !== routeId));
      } catch (error) {
        console.error('Failed to delete route:', error);
      }
    }
  };

  if (loading) {
    return <div className="p-4">Loading routes...</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="font-semibold">Saved Routes</h3>
      {routes.length === 0 ? (
        <p className="text-sm text-gray-500">No saved routes yet</p>
      ) : (
        <div className="space-y-2">
          {routes.map((route) => (
            <div
              key={route.id}
              className="flex items-center justify-between p-2 bg-gray-100 rounded"
            >
              <div>
                <p className="font-medium">{route.name}</p>
                <p className="text-xs text-gray-600">
                  {route.waypoints?.length || 0} waypoints
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onLoadRoute(route.id)}
                >
                  <Map size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(route.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
