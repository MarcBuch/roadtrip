'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fuel, MapPin, Clock } from 'lucide-react';
import { RouteData, CostSettings } from '@/types/travel';
import { metersToMiles, formatDuration } from '@/lib/routing';
import {
  calculateFuelCost,
  calculateGallonsNeeded,
} from '@/lib/costCalculator';

interface CostDisplayProps {
  route: RouteData | null;
  settings: CostSettings;
  waypointCount: number;
}

export function CostDisplay({
  route,
  settings,
  waypointCount,
}: CostDisplayProps) {
  if (!route || waypointCount < 2) {
    return (
      <Card className="w-80">
        <CardHeader>
          <CardTitle className="text-lg">Trip Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add at least 2 waypoints to calculate route
          </p>
        </CardContent>
      </Card>
    );
  }

  const distanceMiles = metersToMiles(route.distance);
  const fuelCost = calculateFuelCost(distanceMiles, settings);
  const gallonsNeeded = calculateGallonsNeeded(distanceMiles, settings.mpg);

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Trip Overview
          <Badge variant="secondary">{waypointCount} stops</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Distance */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <MapPin className="text-blue-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Distance</p>
            <p className="text-lg font-semibold">
              {distanceMiles.toFixed(1)} mi
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <Clock className="text-green-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated Time</p>
            <p className="text-lg font-semibold">
              {formatDuration(route.duration)}
            </p>
          </div>
        </div>

        {/* Fuel Cost */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Fuel className="text-amber-600" size={20} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated Fuel Cost</p>
            <p className="text-lg font-semibold">${fuelCost}</p>
            <p className="text-xs text-muted-foreground">
              {gallonsNeeded} gallons @ {settings.mpg} MPG
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
