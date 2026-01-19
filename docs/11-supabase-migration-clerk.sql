-- Supabase Database Schema with Clerk Authentication
-- This migration updates the routes and waypoints tables to integrate with Clerk authentication
-- Drop existing tables if they exist (for fresh setup)
-- DROP TABLE IF EXISTS waypoints CASCADE;
-- DROP TABLE IF EXISTS routes CASCADE;
-- 1. Routes Table with user_id for Clerk users
CREATE TABLE
    IF NOT EXISTS routes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id TEXT NOT NULL, -- Clerk user ID (string UUID format)
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT NOW (),
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT NOW ()
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS routes_user_id_idx ON routes (user_id);

CREATE INDEX IF NOT EXISTS routes_created_at_idx ON routes (created_at);

CREATE INDEX IF NOT EXISTS routes_user_id_created_at_idx ON routes (user_id, created_at DESC);

-- 2. Waypoints Table
CREATE TABLE
    IF NOT EXISTS waypoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        route_id UUID NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        name TEXT,
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT NOW (),
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT NOW ()
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS waypoints_route_id_idx ON waypoints (route_id);

CREATE INDEX IF NOT EXISTS waypoints_route_position_idx ON waypoints (route_id, position);

-- Enable Row Level Security (RLS) for multi-user security
-- ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;
-- Optional: RLS Policies for routes table
-- This ensures users can only see and modify their own routes
-- CREATE POLICY routes_select_policy ON routes
--   FOR SELECT USING (auth.uid()::text = user_id);
--
-- CREATE POLICY routes_insert_policy ON routes
--   FOR INSERT WITH CHECK (auth.uid()::text = user_id);
--
-- CREATE POLICY routes_update_policy ON routes
--   FOR UPDATE USING (auth.uid()::text = user_id);
--
-- CREATE POLICY routes_delete_policy ON routes
--   FOR DELETE USING (auth.uid()::text = user_id);
-- Optional: RLS Policies for waypoints table (through route ownership)
-- CREATE POLICY waypoints_select_policy ON waypoints
--   FOR SELECT USING (
--     route_id IN (SELECT id FROM routes WHERE auth.uid()::text = user_id)
--   );
--
-- CREATE POLICY waypoints_insert_policy ON waypoints
--   FOR INSERT WITH CHECK (
--     route_id IN (SELECT id FROM routes WHERE auth.uid()::text = user_id)
--   );
--
-- CREATE POLICY waypoints_update_policy ON waypoints
--   FOR UPDATE USING (
--     route_id IN (SELECT id FROM routes WHERE auth.uid()::text = user_id)
--   );
--
-- CREATE POLICY waypoints_delete_policy ON waypoints
--   FOR DELETE USING (
--     route_id IN (SELECT id FROM routes WHERE auth.uid()::text = user_id)
--   );