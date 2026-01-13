# Phase 5: Cost Estimator UI and Logic

## Overview

Implement the cost calculation UI overlay showing distance, duration, and fuel cost based on user-configurable MPG and fuel price.

## Tasks

### 5.1 Create Cost Calculation Utility

Create `/lib/costCalculator.ts`:

```typescript
import { CostSettings } from '@/types/travel';

/**
 * Calculate fuel cost based on distance, MPG, and price per gallon
 * Formula: C = (D / MPG) × P
 * Where:
 *   D = distance in miles
 *   MPG = miles per gallon
 *   P = price per gallon
 */
export function calculateFuelCost(
  distanceInMiles: number,
  settings: CostSettings
): number {
  const gallonsNeeded = distanceInMiles / settings.mpg;
  const totalCost = gallonsNeeded * settings.pricePerGallon;
  return Number(totalCost.toFixed(2));
}

/**
 * Calculate gallons needed for trip
 */
export function calculateGallonsNeeded(
  distanceInMiles: number,
  mpg: number
): number {
  return Number((distanceInMiles / mpg).toFixed(2));
}
```

### 5.2 Create Cost Settings Hook

Create `/hooks/useCostSettings.ts`:

```typescript
'use client';

import { useState } from 'react';
import { CostSettings } from '@/types/travel';

const DEFAULT_SETTINGS: CostSettings = {
  mpg: 25,
  pricePerGallon: 3.5,
};

export function useCostSettings() {
  const [settings, setSettings] = useState<CostSettings>(DEFAULT_SETTINGS);

  const updateMpg = (mpg: number) => {
    setSettings((prev) => ({ ...prev, mpg }));
  };

  const updatePrice = (pricePerGallon: number) => {
    setSettings((prev) => ({ ...prev, pricePerGallon }));
  };

  return {
    settings,
    updateMpg,
    updatePrice,
  };
}
```

### 5.3 Create Cost Display Component

Create `/components/CostDisplay.tsx`:

```typescript
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
```

### 5.4 Create Settings Panel Component

Create `/components/SettingsPanel.tsx`:

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { CostSettings } from '@/types/travel';
import { Settings } from 'lucide-react';

interface SettingsPanelProps {
  settings: CostSettings;
  onUpdateMpg: (mpg: number) => void;
  onUpdatePrice: (price: number) => void;
}

export function SettingsPanel({
  settings,
  onUpdateMpg,
  onUpdatePrice,
}: SettingsPanelProps) {
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings size={18} />
          Vehicle Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* MPG Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="mpg">Miles Per Gallon (MPG)</Label>
            <span className="text-sm font-semibold">{settings.mpg}</span>
          </div>
          <Slider
            id="mpg"
            min={10}
            max={60}
            step={1}
            value={[settings.mpg]}
            onValueChange={(value) => onUpdateMpg(value[0])}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Typical: Sedan 25-30, SUV 20-25, Truck 15-20
          </p>
        </div>

        {/* Price Input */}
        <div className="space-y-2">
          <Label htmlFor="price">Price Per Gallon</Label>
          <div className="flex items-center gap-2">
            <span className="text-xl">$</span>
            <Input
              id="price"
              type="number"
              min="1"
              max="10"
              step="0.01"
              value={settings.pricePerGallon}
              onChange={(e) => onUpdatePrice(Number(e.target.value))}
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Current average: $3.50 - $4.00
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.5 Create Control Panel Layout

Create `/components/ControlPanel.tsx`:

```typescript
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
```

### 5.6 Update Main Page

Integrate all components:

```typescript
'use client';

import { TravelMap } from '@/components/Map/TravelMap';
import { ControlPanel } from '@/components/ControlPanel';
import { useWaypoints } from '@/hooks/useWaypoints';
import { useRoute } from '@/hooks/useRoute';
import { useCostSettings } from '@/hooks/useCostSettings';

export default function Home() {
  const { waypoints, addWaypoint, removeWaypoint, clearWaypoints } =
    useWaypoints();
  const { route, loading } = useRoute(waypoints);
  const { settings, updateMpg, updatePrice } = useCostSettings();

  return (
    <main className="h-screen w-screen relative">
      <TravelMap
        waypoints={waypoints}
        route={route}
        onMapClick={addWaypoint}
        onRemoveWaypoint={removeWaypoint}
      />

      <ControlPanel
        route={route}
        settings={settings}
        waypointCount={waypoints.length}
        onUpdateMpg={updateMpg}
        onUpdatePrice={updatePrice}
        onClearRoute={clearWaypoints}
      />

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          Calculating route...
        </div>
      )}
    </main>
  );
}
```

## Acceptance Criteria

- [ ] Cost panel displays distance, time, and fuel cost
- [ ] MPG slider adjusts between 10-60
- [ ] Price input accepts decimal values
- [ ] Cost updates instantly when settings change
- [ ] Clear button removes all waypoints
- [ ] UI remains visible and usable at all times
- [ ] Responsive layout works on different screen sizes

## Estimated Time

2-2.5 hours

## Testing Checklist

1. Create route → verify cost calculation
2. Adjust MPG slider → verify cost updates
3. Change fuel price → verify cost updates
4. Test formula: $$ C = \left( \frac{D}{MPG} \right) \times P $$
5. Clear waypoints → verify UI resets
6. Test with various MPG values (15, 25, 45)
7. Test with various prices ($2.50, $3.50, $5.00)
