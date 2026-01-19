import { db } from '@/lib/db/connection';
import { routes, waypoints } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { NewRoute, Route } from '@/lib/db/schema';

export async function createRoute(
  userId: string,
  routeData: Omit<NewRoute, 'user_id'>
) {
  const [route] = await db
    .insert(routes)
    .values({
      ...routeData,
      user_id: userId,
    })
    .returning();

  return route;
}

export async function getRoutesByUserId(userId: string) {
  return db
    .select()
    .from(routes)
    .where(eq(routes.user_id, userId))
    .orderBy(desc(routes.created_at));
}

export async function getRouteWithWaypoints(routeId: string, userId: string) {
  const [route] = await db
    .select()
    .from(routes)
    .where(and(eq(routes.id, routeId), eq(routes.user_id, userId)));

  if (!route) return null;

  const routeWaypoints = await db
    .select()
    .from(waypoints)
    .where(eq(waypoints.route_id, routeId))
    .orderBy(waypoints.position);

  return { ...route, waypoints: routeWaypoints };
}

export async function updateRoute(
  routeId: string,
  userId: string,
  updateData: Partial<Omit<Route, 'id' | 'user_id' | 'created_at'>>
) {
  const [updated] = await db
    .update(routes)
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where(and(eq(routes.id, routeId), eq(routes.user_id, userId)))
    .returning();

  return updated;
}

export async function deleteRoute(routeId: string, userId: string) {
  const [deleted] = await db
    .delete(routes)
    .where(and(eq(routes.id, routeId), eq(routes.user_id, userId)))
    .returning();

  return deleted;
}
