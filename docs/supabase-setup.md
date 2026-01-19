# Supabase Database Setup

This document provides the SQL setup for the Supabase database required for persistent waypoints storage.

## Creating Tables

Execute these SQL commands in your Supabase SQL Editor to set up the database schema.

### 1. Routes Table

```sql
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
```

### 2. Waypoints Table

```sql
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

## Enabling RLS (Row-Level Security)

If you want to enable RLS in the future for multi-user support, use these policies:

### Routes Table Policies

```sql
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create routes"
  ON routes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can read their own routes"
  ON routes FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE OR user_id IS NULL);

CREATE POLICY "Users can update their own routes"
  ON routes FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own routes"
  ON routes FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);
```

### Waypoints Table Policies

```sql
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage waypoints in own routes"
  ON waypoints FOR ALL
  USING (
    route_id IN (
      SELECT id FROM routes
      WHERE auth.uid() = user_id OR user_id IS NULL
    )
  );
```

## Initial Configuration

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor
3. Copy and paste the table creation SQL above
4. Copy your project URL and anonymous key from Settings > API
5. Update `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

## Notes

- Currently, `user_id` is set to NULL for all routes since authentication is not yet implemented
- RLS policies are optional for now but recommended for future multi-user support
- Ensure CORS is enabled in Supabase Settings if accessing from your development domain
