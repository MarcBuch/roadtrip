# Persistent Waypoints with Supabase - Implementation Guide

## Overview

This implementation adds persistent waypoint storage to the Travel application using Supabase as the backend database. Routes are stored, retrieved, and managed through a Supabase PostgreSQL database, allowing users to save and load their travel routes across sessions.

## What Was Implemented

### 1. Supabase Setup
- **Client Library**: Installed `@supabase/supabase-js` (v2+)
- **Configuration**: Created `/lib/supabase/client.ts` with Supabase client initialization
- **Environment Variables**: Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`

### 2. tRPC Backend Layer
- **tRPC Router**: Set up tRPC with Next.js integration
  - `/lib/trpc/init.ts` - tRPC initialization
  - `/lib/trpc/appRouter.ts` - Main app router
  - `/lib/trpc/routes.ts` - Routes CRUD operations
  - `/lib/trpc/client.ts` - Client-side tRPC setup
- **API Route**: Created `/app/api/trpc/[...trpc]/route.ts` for HTTP endpoint
- **Operations**:
  - `create` - Save a new route with waypoints
  - `list` - Get all routes
  - `get` - Load a specific route
  - `update` - Update route metadata or waypoints
  - `delete` - Delete a route
  - `addWaypoint` - Add waypoint to existing route
  - `removeWaypoint` - Remove waypoint from route

### 3. Frontend Components
- **SaveRouteDialog** (`/components/SaveRouteDialog.tsx`) - Dialog to save routes with name and description
- **RoutesLibrary** (`/components/RoutesLibrary.tsx`) - UI component to browse, load, and delete saved routes
- **Textarea** (`/components/ui/textarea.tsx`) - New UI component for textarea input

### 4. Custom Hook
- **usePersistedWaypoints** (`/hooks/usePersistedWaypoints.ts`) - React hook for managing persistent waypoints
  - Auto-load routes from Supabase
  - Sync waypoint operations (add, remove)
  - Save routes with metadata
  - Maintains local state while syncing with backend

### 5. Updated UI Components
- **ControlPanel** - Added "Save Route" and "Library" buttons
- **Main Page** - Integrated save and load functionality

## Database Schema Setup

You need to create these tables in your Supabase instance. See `/docs/supabase-setup.md` for complete SQL.

```sql
-- Routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Waypoints table
CREATE TABLE waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Getting Started

### 1. Create Supabase Project
- Go to https://supabase.com and create a new project
- Wait for the database to be initialized

### 2. Set Up Database
- Go to SQL Editor in Supabase dashboard
- Copy and run the SQL from `/docs/supabase-setup.md`

### 3. Configure Environment Variables
Update `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from Supabase Settings > API

### 4. Run Development Server
```bash
npm run dev
```

## Usage

### Saving a Route
1. Click waypoints on the map to create a route
2. Click "Save Route" button in the Control Panel
3. Enter route name and optional description
4. Route is saved to Supabase

### Loading Routes
1. Click "Library" button in the Control Panel
2. See all saved routes
3. Click the Map icon to load a route (coming in next phase)
4. Click Trash icon to delete a route

## File Structure

```
.
├── lib/
│   ├── supabase/
│   │   └── client.ts              # Supabase client
│   └── trpc/
│       ├── init.ts                # tRPC initialization
│       ├── routes.ts              # Routes procedures
│       ├── appRouter.ts           # Main router
│       └── client.ts              # Client setup
├── app/
│   ├── api/trpc/
│   │   └── [...trpc]/
│   │       └── route.ts           # API route
│   └── page.tsx                   # Updated with persistence
├── components/
│   ├── SaveRouteDialog.tsx        # Save dialog
│   ├── RoutesLibrary.tsx          # Routes browser
│   ├── ControlPanel.tsx           # Updated
│   └── ui/
│       └── textarea.tsx           # New textarea component
├── hooks/
│   └── usePersistedWaypoints.ts  # Persistence hook
└── docs/
    └── supabase-setup.md          # Database setup guide
```

## API Endpoints

All endpoints are accessed via `/api/trpc/routes.{operation}`

### Create Route
```typescript
api.routes.create.mutate({
  name: "My Route",
  description: "Optional description",
  waypoints: [
    { latitude: 40.7128, longitude: -74.0060, name: "NYC" },
    // ...
  ]
})
```

### List Routes
```typescript
api.routes.list.query()
```

### Get Route
```typescript
api.routes.get.query({ id: "uuid-here" })
```

### Add Waypoint
```typescript
api.routes.addWaypoint.mutate({
  routeId: "uuid-here",
  latitude: 40.7128,
  longitude: -74.0060,
  name: "Location Name"
})
```

### Delete Route
```typescript
api.routes.delete.mutate({ id: "uuid-here" })
```

## Features

✅ Save routes to Supabase  
✅ List all saved routes  
✅ Load specific routes  
✅ Add/remove waypoints to/from existing routes  
✅ Delete routes  
✅ Type-safe API with tRPC and Zod  
✅ Client-side UI for route management  

## Future Enhancements

- [ ] User authentication (Supabase Auth)
- [ ] Per-user route filtering
- [ ] Route sharing
- [ ] Collaborative editing
- [ ] Offline support with IndexedDB
- [ ] Route export (GPX format)
- [ ] Route import from other apps
- [ ] Advanced sharing with RLS policies

## Security Notes

- Currently `user_id` is NULL for all routes
- RLS policies are in supabase-setup.md for future authentication
- All inputs validated with Zod schemas
- Coordinates validated to be within valid ranges
- Use Supabase RLS for production multi-user support

## Troubleshooting

### Environment Variables Not Loading
- Ensure `.env.local` is in the project root
- Restart dev server after changes
- Check that NEXT_PUBLIC_ prefix is used for client-side variables

### Supabase Connection Errors
- Verify URL and anonymous key are correct
- Check that CORS is enabled in Supabase settings
- Ensure database tables are created

### Routes Not Appearing
- Check browser console for errors
- Verify Supabase tables exist and have data
- Check network tab in browser dev tools

## References

- Original documentation: `/docs/09-persistent-waypoints-supabase.md`
- Database setup: `/docs/supabase-setup.md`
- Supabase docs: https://supabase.com/docs
- tRPC docs: https://trpc.io/docs
