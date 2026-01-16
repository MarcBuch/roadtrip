import { router, publicProcedure } from '@/lib/trpc/init';
import { z } from 'zod';
import { supabaseServer as supabase } from '@/lib/supabase/server';

const WaypointSchema = z.object({
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().optional(),
  position: z.number(),
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
          user_id: null,
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
            ...(name && { name }),
            ...(description && { description }),
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
