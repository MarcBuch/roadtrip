import { db } from '@/lib/db/connection';
import { waypoints } from '@/lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { NewWaypoint, Waypoint } from '@/lib/db/schema';

export async function createWaypoint(waypointData: NewWaypoint) {
  const [waypoint] = await db
    .insert(waypoints)
    .values(waypointData)
    .returning();

  return waypoint;
}

export async function createWaypoints(waypointsData: NewWaypoint[]) {
  if (waypointsData.length === 0) return [];

  return db.insert(waypoints).values(waypointsData).returning();
}

export async function getWaypointsByRouteId(routeId: string) {
  return db
    .select()
    .from(waypoints)
    .where(eq(waypoints.route_id, routeId))
    .orderBy(asc(waypoints.position));
}

export async function updateWaypoint(
  waypointId: string,
  updateData: Partial<Omit<Waypoint, 'id' | 'route_id' | 'created_at'>>
) {
  const [updated] = await db
    .update(waypoints)
    .set({
      ...updateData,
      updated_at: new Date(),
    })
    .where(eq(waypoints.id, waypointId))
    .returning();

  return updated;
}

export async function deleteWaypoint(waypointId: string) {
  const [deleted] = await db
    .delete(waypoints)
    .where(eq(waypoints.id, waypointId))
    .returning();

  return deleted;
}

export async function deleteWaypointsByRouteId(routeId: string) {
  await db.delete(waypoints).where(eq(waypoints.route_id, routeId));
}

export async function replaceWaypoints(
  routeId: string,
  waypointsData: NewWaypoint[]
) {
  // Delete existing waypoints and insert new ones in a transaction
  await db.transaction(async (tx) => {
    await tx.delete(waypoints).where(eq(waypoints.route_id, routeId));

    if (waypointsData.length > 0) {
      await tx.insert(waypoints).values(waypointsData);
    }
  });
}
