import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/init';
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
  create: protectedProcedure
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
    .mutation(async ({ input, ctx }) => {
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: input.name,
          description: input.description,
          user_id: ctx.userId,
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

  // Get all routes (user's routes if authenticated, public if not)
  list: publicProcedure.query(async ({ ctx }) => {
    let query = supabase.from('routes').select(
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
    );

    // If user is signed in, get their routes; otherwise get public routes
    if (ctx.userId) {
      query = query.eq('user_id', ctx.userId);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) throw error;
    return data;
  }),

  // Get a specific route
  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      let query = supabase
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
        .eq('id', input.id);

      // If user is signed in, restrict to their routes; otherwise allow public
      if (ctx.userId) {
        query = query.eq('user_id', ctx.userId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data;
    }),

  // Update a route
  update: protectedProcedure
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
    .mutation(async ({ input, ctx }) => {
      const { id, name, description, waypoints } = input;

      // Verify ownership of the route
      const { data: existingRoute } = await supabase
        .from('routes')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!existingRoute || existingRoute.user_id !== ctx.userId) {
        throw new Error('Unauthorized: You can only update your own routes');
      }

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
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership of the route
      const { data: existingRoute } = await supabase
        .from('routes')
        .select('user_id')
        .eq('id', id)
        .single();

      if (!existingRoute || existingRoute.user_id !== ctx.userId) {
        throw new Error('Unauthorized: You can only delete your own routes');
      }

      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),

  // Add a waypoint to an existing route
  addWaypoint: protectedProcedure
    .input(
      z.object({
        routeId: z.string().uuid(),
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership of the route
      const { data: existingRoute } = await supabase
        .from('routes')
        .select('user_id')
        .eq('id', input.routeId)
        .single();

      if (!existingRoute || existingRoute.user_id !== ctx.userId) {
        throw new Error(
          'Unauthorized: You can only add waypoints to your own routes'
        );
      }

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
  removeWaypoint: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership: get the waypoint's route and check user_id
      const { data: waypoint } = await supabase
        .from('waypoints')
        .select('route_id')
        .eq('id', input.id)
        .single();

      if (waypoint) {
        const { data: route } = await supabase
          .from('routes')
          .select('user_id')
          .eq('id', waypoint.route_id)
          .single();

        if (!route || route.user_id !== ctx.userId) {
          throw new Error(
            'Unauthorized: You can only remove waypoints from your own routes'
          );
        }
      }

      const { error } = await supabase
        .from('waypoints')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return { success: true };
    }),
});
