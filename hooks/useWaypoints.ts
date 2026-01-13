'use client';

import { useState, useCallback } from 'react';
import { Waypoint } from '@/types/travel';

export function useWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const addWaypoint = useCallback((lng: number, lat: number) => {
    const newWaypoint: Waypoint = {
      id: `waypoint-${Date.now()}`,
      lng,
      lat,
      name: undefined, // Will be populated by geocoding
    };
    setWaypoints((prev) => [...prev, newWaypoint]);
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
