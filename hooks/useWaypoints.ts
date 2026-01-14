'use client';

import { useState, useCallback } from 'react';
import { Waypoint } from '@/types/travel';
import { reverseGeocode } from '@/lib/geocoding';

export function useWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const addWaypoint = useCallback(async (lng: number, lat: number) => {
    const id = `waypoint-${Date.now()}`;

    // Add waypoint immediately with temporary name
    const newWaypoint: Waypoint = {
      id,
      lng,
      lat,
      name: '...',
    };
    setWaypoints((prev) => [...prev, newWaypoint]);

    // Fetch the actual location name
    try {
      const locationName = await reverseGeocode(lng, lat);
      setWaypoints((prev) =>
        prev.map((w) => (w.id === id ? { ...w, name: locationName } : w))
      );
    } catch (error) {
      console.error('Failed to geocode location:', error);
      // Update with fallback name
      setWaypoints((prev) =>
        prev.map((w) =>
          w.id === id
            ? { ...w, name: `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}` }
            : w
        )
      );
    }
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  }, []);

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

  return {
    waypoints,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    updateWaypoint,
  };
}
