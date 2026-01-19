import { router, publicProcedure, protectedProcedure } from '@/lib/trpc/init';
import { z } from 'zod';
import * as routeRepository from '@/lib/db/repositories/routes';
import * as waypointRepository from '@/lib/db/repositories/waypoints';

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
      const route = await routeRepository.createRoute(ctx.userId, {
        name: input.name,
        description: input.description,
      });

      if (input.waypoints.length > 0) {
        const waypointsData = input.waypoints.map((wp, index) => ({
          route_id: route.id,
          latitude: wp.latitude.toString(),
          longitude: wp.longitude.toString(),
          name: wp.name,
          position: index,
        }));

        await waypointRepository.createWaypoints(waypointsData);
      }

      return route;
    }),

  // Get all routes (user's routes if authenticated, public if not)
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      return [];
    }

    const routes = await routeRepository.getRoutesByUserId(ctx.userId);

    // Fetch waypoints for each route
    const routesWithWaypoints = await Promise.all(
      routes.map(async (route) => {
        const waypoints = await waypointRepository.getWaypointsByRouteId(
          route.id
        );
        return { ...route, waypoints };
      })
    );

    return routesWithWaypoints;
  }),

  // Get a specific route
  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new Error('Unauthorized');
      }

      const route = await routeRepository.getRouteWithWaypoints(
        input.id,
        ctx.userId
      );

      if (!route) {
        throw new Error('Route not found');
      }

      return route;
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

      // Update route metadata
      if (name !== undefined || description !== undefined) {
        const updated = await routeRepository.updateRoute(id, ctx.userId, {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
        });

        if (!updated) {
          throw new Error('Unauthorized: You can only update your own routes');
        }
      }

      // Update waypoints if provided
      if (waypoints) {
        const waypointsData = waypoints.map((wp, index) => ({
          route_id: id,
          latitude: wp.latitude.toString(),
          longitude: wp.longitude.toString(),
          name: wp.name,
          position: index,
        }));

        await waypointRepository.replaceWaypoints(id, waypointsData);
      }

      return { success: true };
    }),

  // Delete a route
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const deleted = await routeRepository.deleteRoute(input.id, ctx.userId);

      if (!deleted) {
        throw new Error('Unauthorized: You can only delete your own routes');
      }

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
      const route = await routeRepository.getRouteWithWaypoints(
        input.routeId,
        ctx.userId
      );

      if (!route) {
        throw new Error(
          'Unauthorized: You can only add waypoints to your own routes'
        );
      }

      // Get current waypoints to determine next position
      const existingWaypoints = await waypointRepository.getWaypointsByRouteId(
        input.routeId
      );
      const nextPosition =
        existingWaypoints.length > 0
          ? Math.max(...existingWaypoints.map((w) => w.position)) + 1
          : 0;

      const waypoint = await waypointRepository.createWaypoint({
        route_id: input.routeId,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString(),
        name: input.name,
        position: nextPosition,
      });

      return waypoint;
    }),

  // Remove a waypoint
  removeWaypoint: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const deleted = await waypointRepository.deleteWaypoint(input.id);

      if (!deleted) {
        throw new Error('Waypoint not found');
      }

      return { success: true };
    }),
});
