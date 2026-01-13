'use client';

import { useState, useEffect } from 'react';
import { Waypoint, RouteData } from '@/types/travel';
import { fetchRoute } from '@/lib/routing';

export function useRoute(waypoints: Waypoint[]) {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (waypoints.length < 2) {
      setRoute(null);
      return;
    }

    let cancelled = false;

    const getRoute = async () => {
      setLoading(true);
      const routeData = await fetchRoute(waypoints);
      if (!cancelled) {
        setRoute(routeData);
        setLoading(false);
      }
    };

    getRoute();

    return () => {
      cancelled = true;
    };
  }, [waypoints]);

  return { route, loading };
}
