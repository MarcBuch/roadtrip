# Phase 9: Persistent Waypoints with Supabase

## Overview

This document outlines the implementation strategy for adding persistent waypoint storage to the Travel application using Supabase as the backend database. Waypoints will be stored, retrieved, and managed through a Supabase PostgreSQL database, allowing users to save and load their travel routes across sessions.

## Current State Analysis

### Existing Waypoint System
- **Location**: `/hooks/useWaypoints.ts`
- **State Management**: React hooks with client-side state only
- **Features**: Add, remove, update, clear waypoints
- **Data Structure**:
  ```typescript
  interface Waypoint {
    id: string;           // Client-generated ID (waypoint-${timestamp})
    lng: number;          // Longitude
    lat: number;          // Latitude
    name?: string;        // Location name from reverse geocoding
  }
  ```

### Current Architecture
- **Client-only**: All waypoint data is ephemeral (lost on page refresh)
- **No persistence layer**: No database integration
- **No authentication**: No user identification
- **No API layer**: Communication happens only within client components

## Implementation Strategy

### Phase 1: Supabase Setup

#### 1.1 Install Dependencies

Add Supabase client library:
```bash
npm install @supabase/supabase-js
```

#### 1.2 Environment Configuration

Add to `.env.local`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Create `/lib/supabase/client.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 1.3 Database Schema

Create tables in Supabase SQL Editor:

**1. Users Table** (optional - for future authentication)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. Routes Table** (collections of waypoints)
```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX routes_user_id_idx ON routes(user_id);
```

**3. Waypoints Table**
```sql
CREATE TABLE waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,  -- Order in the route
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX waypoints_route_id_idx ON waypoints(route_id);
CREATE INDEX waypoints_route_position_idx ON waypoints(route_id, position);
```

**4. Row-Level Security (RLS) Policies**

For routes table:
```sql
-- Allow users to create routes
CREATE POLICY "Users can create routes"
  ON routes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own routes
CREATE POLICY "Users can read own routes"
  ON routes FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

-- Allow users to update their own routes
CREATE POLICY "Users can update own routes"
  ON routes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own routes
CREATE POLICY "Users can delete own routes"
  ON routes FOR DELETE
  USING (auth.uid() = user_id);
```

For waypoints table (inherited through route_id):
```sql
-- Allow users to manage waypoints in their routes
CREATE POLICY "Users can manage waypoints in own routes"
  ON waypoints FOR ALL
  USING (
    route_id IN (
      SELECT id FROM routes WHERE auth.uid() = user_id
    )
  );
```

### Phase 2: API Layer with tRPC

Since the project already uses tRPC, create procedures for waypoint operations.

Create `/app/api/trpc/[trpc].ts` (if not exists) or update existing tRPC setup:

#### 2.1 Waypoint tRPC Procedures

Create `/lib/trpc/routes.ts`:
```typescript
import { router, publicProcedure } from '@/lib/trpc';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';

const WaypointSchema = z.object({
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().optional(),
  position: z.number(),
});

const RouteSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  waypoints: z.array(WaypointSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const routeRouter = router({
  // Create a new route with waypoints
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        waypoints: z.array(
          z.object({
            latitude: z.number(),
            longitude: z.number(),
            name: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: input.name,
          description: input.description,
        })
        .select()
        .single();

      if (routeError) throw routeError;

      const waypointsData = input.waypoints.map((wp, index) => ({
        route_id: route.id,
        latitude: wp.latitude,
        longitude: wp.longitude,
        name: wp.name,
        position: index,
      }));

      const { error: waypointsError } = await supabase
        .from('waypoints')
        .insert(waypointsData);

      if (waypointsError) throw waypointsError;

      return route;
    }),

  // Get all routes (public and user's routes if authenticated)
  list: publicProcedure.query(async () => {
    const { data, error } = await supabase
      .from('routes')
      .select(
        `
        *,
        waypoints:waypoints(
          id,
          latitude,
          longitude,
          name,
          position
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }),

  // Get a specific route
  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('routes')
        .select(
          `
          *,
          waypoints:waypoints(
            id,
            latitude,
            longitude,
            name,
            position
          )
        `
        )
        .eq('id', input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  // Update a route
  update: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().optional(),
        description: z.string().optional(),
        waypoints: z
          .array(
            z.object({
              latitude: z.number(),
              longitude: z.number(),
              name: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, name, description, waypoints } = input;

      // Update route metadata
      if (name || description) {
        const { error: updateError } = await supabase
          .from('routes')
          .update({
            name,
            description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;
      }

      // Update waypoints if provided
      if (waypoints) {
        // Delete existing waypoints
        const { error: deleteError } = await supabase
          .from('waypoints')
          .delete()
          .eq('route_id', id);

        if (deleteError) throw deleteError;

        // Insert new waypoints
        const waypointsData = waypoints.map((wp, index) => ({
          route_id: id,
          latitude: wp.latitude,
          longitude: wp.longitude,
          name: wp.name,
          position: index,
        }));

        const { error: insertError } = await supabase
          .from('waypoints')
          .insert(waypointsData);

        if (insertError) throw insertError;
      }

      return { success: true };
    }),

  // Delete a route
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Add a waypoint to an existing route
  addWaypoint: publicProcedure
    .input(
      z.object({
        routeId: z.string().uuid(),
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Get the highest position number
      const { data: maxPosition } = await supabase
        .from('waypoints')
        .select('position')
        .eq('route_id', input.routeId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (maxPosition?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from('waypoints')
        .insert({
          route_id: input.routeId,
          latitude: input.latitude,
          longitude: input.longitude,
          name: input.name,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }),

  // Remove a waypoint
  removeWaypoint: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const { error } = await supabase
        .from('waypoints')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),
});
```

### Phase 3: Update Frontend Hooks

#### 3.1 Create usePersistedWaypoints Hook

Create `/hooks/usePersistedWaypoints.ts`:
```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Waypoint } from '@/types/travel';
import { searchBoxReverseGeocode } from '@/lib/mapboxSearch';
import { api } from '@/lib/trpc/client'; // Assuming tRPC client exists

interface PersistenceOptions {
  routeId?: string; // If provided, operations sync to Supabase
  autoLoad?: boolean; // Auto-load route on mount
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
          // Convert Supabase waypoints to local format
          const localWaypoints: Waypoint[] = route.waypoints.map(
            (wp: any, index: number) => ({
              id: wp.id,
              lng: wp.longitude,
              lat: wp.latitude,
              name: wp.name,
            })
          );
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

      // Add waypoint immediately
      const newWaypoint: Waypoint = {
        id,
        lng,
        lat,
        name: '...',
      };
      setWaypoints((prev) => [...prev, newWaypoint]);

      // Fetch location name
      try {
        const locationName = await searchBoxReverseGeocode(lng, lat);
        setWaypoints((prev) =>
          prev.map((w) =>
            w.id === id ? { ...w, name: locationName } : w
          )
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
    setRouteId, // To load a different route
  };
}
```

#### 3.2 Update Existing useWaypoints Hook (Keep for Backward Compatibility)

Keep the existing `/hooks/useWaypoints.ts` unchanged for backward compatibility. It can be used for temporary in-memory waypoints.

### Phase 4: Update Components

#### 4.1 Create Route Save Dialog

Create `/components/SaveRouteDialog.tsx`:
```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface SaveRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description?: string) => Promise<void>;
  loading?: boolean;
}

export function SaveRouteDialog({
  open,
  onOpenChange,
  onSave,
  loading,
}: SaveRouteDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave(name, description || undefined);
      setName('');
      setDescription('');
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Route</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="route-name" className="text-sm font-medium">
              Route Name
            </label>
            <Input
              id="route-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Vacation Route"
            />
          </div>

          <div>
            <label htmlFor="route-desc" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="route-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this route..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving || loading}
          >
            {isSaving ? 'Saving...' : 'Save Route'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4.2 Create Routes Library Component

Create `/components/RoutesLibrary.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Trash2, Map } from 'lucide-react';

interface RoutesLibraryProps {
  onLoadRoute: (routeId: string) => void;
}

export function RoutesLibrary({ onLoadRoute }: RoutesLibraryProps) {
  const [routes, setRoutes] = useState<any[]>([]);
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
```

### Phase 5: Update Main Page (Optional)

Update `/app/page.tsx` to support saving and loading routes:

```typescript
'use client';

import { useState } from 'react';
import { TravelMap } from '@/components/Map/TravelMap';
import { ControlPanel } from '@/components/ControlPanel';
import { SearchPanel } from '@/components/SearchPanel';
import { SaveRouteDialog } from '@/components/SaveRouteDialog';
import { RoutesLibrary } from '@/components/RoutesLibrary';
import { useWaypoints } from '@/hooks/useWaypoints';
import { usePersistedWaypoints } from '@/hooks/usePersistedWaypoints';
import { useRoute } from '@/hooks/useRoute';
import { useCostSettings } from '@/hooks/useCostSettings';
import { SearchResult, searchBoxReverseGeocode } from '@/lib/mapboxSearch';

export default function Home() {
  const [usePeristence, setUsePersistence] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [mapCenter, setMapCenter] = useState<
    { lng: number; lat: number } | undefined
  >();

  // Use persisted hook if enabled, otherwise use in-memory hook
  const waypointHook = usePeristence
    ? usePersistedWaypoints({ autoLoad: false })
    : useWaypoints();

  const { route, loading } = useRoute(waypointHook.waypoints);
  const { settings, updateMpg, updatePrice } = useCostSettings();

  const handleUpdateWaypoint = async (
    id: string,
    lat: number,
    lng: number
  ) => {
    waypointHook.updateWaypoint(id, { lat, lng, name: '...' });

    try {
      const locationName = await searchBoxReverseGeocode(lng, lat);
      waypointHook.updateWaypoint(id, { name: locationName });
    } catch (error) {
      console.error('Failed to geocode location:', error);
      waypointHook.updateWaypoint(id, {
        name: `Location at ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      });
    }
  };

  const handleLocationSelect = async (result: SearchResult) => {
    const { longitude, latitude } = result.coordinates;
    await waypointHook.addWaypoint(longitude, latitude);
  };

  const handleLoadRoute = (routeId: string) => {
    setUsePeristence(true);
    waypointHook.setRouteId(routeId);
  };

  const handleSaveRoute = async (name: string, description?: string) => {
    try {
      await waypointHook.saveRoute(name, description);
      alert('Route saved successfully!');
    } catch (error) {
      alert('Failed to save route');
    }
  };

  return (
    <main className="h-screen w-screen relative">
      <TravelMap
        waypoints={waypointHook.waypoints}
        route={route}
        onMapClick={waypointHook.addWaypoint}
        onRemoveWaypoint={waypointHook.removeWaypoint}
        onUpdateWaypoint={handleUpdateWaypoint}
      />

      <div className="absolute top-4 left-4 z-40">
        <SearchPanel
          onLocationSelect={handleLocationSelect}
          proximityCenter={mapCenter}
        />
      </div>

      <ControlPanel
        route={route}
        settings={settings}
        waypoints={waypointHook.waypoints}
        onUpdateMpg={updateMpg}
        onUpdatePrice={updatePrice}
        onRemoveWaypoint={waypointHook.removeWaypoint}
        onClearWaypoints={waypointHook.clearWaypoints}
        onSaveRoute={() => setSaveDialogOpen(true)}
        onShowLibrary={() => setShowLibrary(true)}
      />

      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg">
          Calculating route...
        </div>
      )}

      {waypointHook.syncing && (
        <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg">
          Syncing...
        </div>
      )}

      <SaveRouteDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveRoute}
        loading={waypointHook.syncing}
      />

      {showLibrary && (
        <div className="absolute bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <RoutesLibrary onLoadRoute={handleLoadRoute} />
          <button
            onClick={() => setShowLibrary(false)}
            className="w-full p-2 text-sm text-gray-600 border-t"
          >
            Close
          </button>
        </div>
      )}
    </main>
  );
}
```

## Implementation Roadmap

### Step 1: Setup (1-2 hours)
- [ ] Create Supabase project
- [ ] Create database schema (routes, waypoints tables)
- [ ] Configure RLS policies
- [ ] Add environment variables to `.env.local`
- [ ] Install `@supabase/supabase-js`

### Step 2: Backend Integration (2-3 hours)
- [ ] Create Supabase client (`/lib/supabase/client.ts`)
- [ ] Implement tRPC procedures for route operations
- [ ] Test API endpoints with Postman or similar

### Step 3: Frontend Hooks (1-2 hours)
- [ ] Create `usePersistedWaypoints` hook
- [ ] Implement route save/load logic
- [ ] Add error handling and loading states

### Step 4: UI Components (1-2 hours)
- [ ] Create SaveRouteDialog component
- [ ] Create RoutesLibrary component
- [ ] Update ControlPanel to expose save/library buttons

### Step 5: Integration & Testing (1-2 hours)
- [ ] Update main page to support persistence
- [ ] Test complete save/load workflow
- [ ] Test concurrent operations
- [ ] Handle edge cases

## Data Flow Diagram

```
┌─────────────────┐
│  User Clicks    │
│  on Map         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  usePersistedWaypoints      │
│  addWaypoint()              │
└────────┬────────────────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ▼                                 ▼
┌──────────────────┐           ┌──────────────────────────┐
│ Reverse Geocode  │           │ tRPC: addWaypoint        │
│ (Mapbox)         │           │ Mutation                 │
└──────────────────┘           └────────┬─────────────────┘
                                        │
                                        ▼
                               ┌──────────────────────────┐
                               │ Supabase: Insert         │
                               │ INTO waypoints           │
                               │ WHERE route_id = ...     │
                               └──────────────────────────┘
```

## Security Considerations

1. **Row-Level Security (RLS)**
   - All operations filtered by user ID
   - Public routes readable by all users
   - Only route owners can modify/delete

2. **Input Validation**
   - Use Zod schemas for all inputs
   - Validate coordinates are within valid ranges
   - Sanitize text inputs

3. **Rate Limiting**
   - Implement rate limiting on tRPC procedures
   - Consider throttling real-time syncs

4. **Authentication**
   - Future: Integrate Supabase Auth
   - Currently: Use Supabase RLS with anonymous user ID

## Performance Optimization

1. **Query Optimization**
   - Index on `(user_id, created_at)` for route listing
   - Index on `(route_id, position)` for waypoint ordering
   - Use `select()` to fetch only needed fields

2. **Caching**
   - Cache user's routes in React Query
   - Invalidate cache on mutations
   - Consider SWR for live updates

3. **Batch Operations**
   - Insert/update multiple waypoints in single transaction
   - Use Supabase transactions for consistency

## Error Handling Strategy

1. **Network Errors**
   - Retry failed operations with exponential backoff
   - Queue operations for offline support (future)

2. **Validation Errors**
   - Show user-friendly error messages
   - Highlight problematic fields

3. **Sync Conflicts**
   - Last-write-wins strategy (simple)
   - Or: Merge with user confirmation (complex)

## Future Enhancements

1. **Collaboration**
   - Share routes with other users
   - Collaborative editing with WebSockets

2. **Offline Support**
   - Cache routes locally with IndexedDB
   - Sync when reconnected

3. **Advanced Features**
   - Route templates/presets
   - Branching routes (multiple paths)
   - Geofencing and notifications

4. **Analytics**
   - Track popular routes
   - User behavior analytics

5. **Export/Import**
   - Export routes as GPX files
   - Import from other route planning apps

## Testing Strategy

### Unit Tests
```typescript
// Test waypoint calculations
test('calculates correct waypoint positions', () => {
  // Verify position ordering after add/remove
});

// Test API schema validation
test('validates waypoint coordinates', () => {
  // Ensure invalid coords are rejected
});
```

### Integration Tests
```typescript
// Test full save/load flow
test('saves and loads route with all waypoints', async () => {
  const route = await api.routes.create.mutate({...});
  const loaded = await api.routes.get.query({...});
  expect(loaded.waypoints).toEqual(route.waypoints);
});
```

### E2E Tests
- Test user workflow: add waypoints → save → close → reload → view route
- Test concurrent users modifying different routes
- Test error scenarios (network failure, etc.)

## Related Documentation

- See `/docs/03-waypoint-system.md` for existing waypoint implementation
- See `/docs/04-routing-engine.md` for route calculation integration
- Future: Authentication documentation when Supabase Auth is integrated

## Conclusion

This implementation provides a solid foundation for persistent waypoint storage using Supabase. The modular design allows for incremental implementation and easy future enhancements. The use of tRPC ensures type safety and seamless integration with the existing Next.js application.

Start with Phase 1 (Supabase setup) and gradually progress through each phase, testing at each step. This approach minimizes risk and allows for course corrections.
