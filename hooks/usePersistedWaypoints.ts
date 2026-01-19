'use client';

import { useState, useCallback, useEffect } from 'react';
import { Waypoint } from '@/types/travel';
import { searchBoxReverseGeocode } from '@/lib/mapboxSearch';
import { api } from '@/lib/trpc/client';

interface PersistenceOptions {
  routeId?: string;
  autoLoad?: boolean;
}

interface RouteWaypoint {
  id: string;
  latitude: string;
  longitude: string;
  name: string | null;
  position: number;
}

export function usePersistedWaypoints(options: PersistenceOptions = {}) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeId, setRouteId] = useState<string | undefined>(options.routeId);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load route from Supabase if routeId is provided
  useEffect(() => {
    if (routeId && options.autoLoad !== false) {
      const loadRoute = async () => {
        setLoading(true);
        try {
          const route = await api.routes.get.query({ id: routeId });
          const localWaypoints: Waypoint[] = (
            route.waypoints as RouteWaypoint[]
          )
            .sort(
              (a: RouteWaypoint, b: RouteWaypoint) => a.position - b.position
            )
            .map((wp: RouteWaypoint) => ({
              id: wp.id,
              lng: parseFloat(wp.longitude),
              lat: parseFloat(wp.latitude),
              name: wp.name || undefined,
            }));
          setWaypoints(localWaypoints);
        } catch (error) {
          console.error('Failed to load route:', error);
        } finally {
          setLoading(false);
        }
      };
      loadRoute();
    }
  }, [routeId, options.autoLoad]);

  const addWaypoint = useCallback(
    async (lng: number, lat: number) => {
      const id = `waypoint-${Date.now()}`;

      const newWaypoint: Waypoint = {
        id,
        lng,
        lat,
        name: '...',
      };
      setWaypoints((prev) => [...prev, newWaypoint]);

      try {
        const locationName = await searchBoxReverseGeocode(lng, lat);
        setWaypoints((prev) =>
          prev.map((w) => (w.id === id ? { ...w, name: locationName } : w))
        );
      } catch (error) {
        console.error('Failed to geocode location:', error);
        setWaypoints((prev) =>
          prev.map((w) =>
            w.id === id
              ? {
                  ...w,
                  name: `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
                }
              : w
          )
        );
      }

      // Sync to Supabase if routeId exists
      if (routeId) {
        setSyncing(true);
        try {
          await api.routes.addWaypoint.mutate({
            routeId,
            latitude: lat,
            longitude: lng,
            name: newWaypoint.name,
          });
        } catch (error) {
          console.error('Failed to sync waypoint:', error);
        } finally {
          setSyncing(false);
        }
      }
    },
    [routeId]
  );

  const removeWaypoint = useCallback(
    async (id: string) => {
      setWaypoints((prev) => prev.filter((w) => w.id !== id));

      // Sync to Supabase
      if (routeId) {
        setSyncing(true);
        try {
          await api.routes.removeWaypoint.mutate({ id });
        } catch (error) {
          console.error('Failed to remove waypoint:', error);
        } finally {
          setSyncing(false);
        }
      }
    },
    [routeId]
  );

  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
  }, []);

  const updateWaypoint = useCallback(
    (id: string, updates: Partial<Waypoint>) => {
      setWaypoints((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
    },
    []
  );

  const saveRoute = useCallback(
    async (name: string, description?: string) => {
      setSyncing(true);
      try {
        const route = await api.routes.create.mutate({
          name,
          description,
          waypoints: waypoints.map((w) => ({
            latitude: w.lat,
            longitude: w.lng,
            name: w.name,
          })),
        });
        setRouteId(route.id);
        return route;
      } catch (error) {
        console.error('Failed to save route:', error);
        throw error;
      } finally {
        setSyncing(false);
      }
    },
    [waypoints]
  );

  return {
    waypoints,
    routeId,
    loading,
    syncing,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    updateWaypoint,
    saveRoute,
    setRouteId,
  };
}
