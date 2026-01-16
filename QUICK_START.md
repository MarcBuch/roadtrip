# Quick Start: Persistent Waypoints with Supabase

## 5-Minute Setup

### Step 1: Create Supabase Project (2 min)
1. Go to https://supabase.com
2. Click "New Project"
3. Enter project name and password
4. Copy your **Project URL** and **Anon Key** from Settings > API

### Step 2: Set Up Database (1 min)
1. Go to SQL Editor in Supabase dashboard
2. Create a new query and paste the SQL below:

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

CREATE INDEX routes_user_id_idx ON routes(user_id);
CREATE INDEX routes_created_at_idx ON routes(created_at);

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

CREATE INDEX waypoints_route_id_idx ON waypoints(route_id);
CREATE INDEX waypoints_route_position_idx ON waypoints(route_id, position);
```

3. Click "RUN"

### Step 3: Configure Environment (1 min)
Update `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Start Using (1 min)
```bash
npm run dev
```

Then:
1. Click on the map to add waypoints
2. Click "Save Route" button
3. Enter route name and description
4. Click "Library" to see saved routes

## What You Can Do Now

✅ **Save Routes** - Click "Save Route" to persist your waypoints  
✅ **View Routes** - Click "Library" to see all saved routes  
✅ **Delete Routes** - Click trash icon in the library  
✅ **Sync to Database** - All operations automatically sync to Supabase  

## Troubleshooting

**"Missing Supabase environment variables"**
- Check `.env.local` file exists in project root
- Restart dev server: `npm run dev`
- Verify both URL and Key are present

**Can't save routes**
- Check browser console (F12) for errors
- Verify database tables were created in Supabase
- Check that CORS is enabled in Supabase settings

**Routes not appearing in library**
- Refresh the page
- Check Supabase dashboard to verify data was saved
- Check browser network tab for failed requests

## File Locations

- **Setup Guide**: `docs/PERSISTENT_WAYPOINTS_IMPLEMENTATION.md`
- **Database SQL**: `docs/supabase-setup.md`
- **Main Page**: `app/page.tsx`
- **Components**: `components/SaveRouteDialog.tsx`, `components/RoutesLibrary.tsx`
- **Backend**: `lib/trpc/routes.ts`

## Next: Add Route Loading

To implement loading saved routes, update `components/RoutesLibrary.tsx` to call `usePersistedWaypoints.setRouteId()` when loading a route.

See `docs/09-persistent-waypoints-supabase.md` for the complete implementation strategy.
