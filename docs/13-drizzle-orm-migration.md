# Phase 13: Drizzle ORM Migration

## Goals

- Replace raw Supabase queries with Drizzle ORM for type-safe database interactions
- Improve code maintainability and developer experience with auto-generated types
- Create a migration path from current Supabase client approach to Drizzle ORM
- Establish schema-as-code for better version control and documentation
- Leverage Drizzle's query builder for complex operations

## Non-Goals

- Complete database redesign or migration (reuse existing schema)
- Moving from PostgreSQL to another database
- Implementing database migrations tooling (deferred for future)
- Real-time subscriptions via Drizzle (maintain Supabase realtime capability separately)
- GraphQL integration

## Assumptions

- PostgreSQL database is stable and already configured in Supabase
- Current Supabase RLS policies will remain in place
- Drizzle ORM is mature and stable for production use (v0.30+)
- Team is familiar with TypeScript and interested in type safety
- Next.js App Router will remain the primary framework

## Dependencies

### New npm packages

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

Package details:

- **drizzle-orm**: ^0.31.0 - Core ORM library
- **postgres**: ^3.3.0 - PostgreSQL driver (official Supabase recommendation)
- **drizzle-kit**: ^0.20.0 - CLI tooling for migrations and introspection

### Environment Variables

- No new environment variables needed (reuse existing Supabase credentials)
- Consider adding `DATABASE_URL` for consistency with Drizzle best practices

### Services & Infrastructure

- Existing Supabase PostgreSQL database
- No additional infrastructure required

## Current State Analysis

### Existing Implementation

**Current Database Layer** (`/lib/supabase/client.ts`):

- Using Supabase JavaScript client (`@supabase/supabase-js`)
- Raw SQL queries for complex operations
- No type safety beyond manual TypeScript interfaces
- Manual error handling for each query

**Current Data Models**:

```typescript
// From supabase-setup.md - Current schema:
interface Route {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Waypoint {
  id: string;
  route_id: string;
  position: number;
  latitude: number;
  longitude: number;
  name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

**Current Architecture**:

- Routes are stored in a `routes` table
- Waypoints are stored in a `waypoints` table with foreign key to routes
- RLS policies for multi-user support (user-specific access)
- Direct Supabase client calls from tRPC procedures in `/lib/trpc/routes.ts`

### Limitations of Current Approach

1. **No type safety**: TypeScript types don't sync with database schema
2. **Runtime errors**: Type mismatches only caught at runtime
3. **Query complexity**: Complex queries require raw SQL strings
4. **Refactoring friction**: Renaming columns requires manual updates across codebase
5. **No introspection**: Can't easily generate types from schema
6. **Boilerplate**: Each query operation requires error handling setup

## Implementation Strategy

### Phase 1: Setup & Schema Definition (1-2 days)

#### 1.1 Install Dependencies

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

#### 1.2 Create Drizzle Configuration

Create `/drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  migrations: {
    migrationsFolder: './drizzle/migrations',
  },
} satisfies Config;
```

Note: Use `postgresql` driver with `postgres` package as per official Drizzle ORM + Supabase documentation.

#### 1.3 Create Database Conne

**Option A: Basic Connection (Development)**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development',
});
```

**Option B: Connection Pooling (Production/Serverless) - Recommended**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Use Supabase Connection Pooler for serverless environments
// Disable prepared statements for "Transaction" pool mode
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
});

export const db = drizzle(client, {
  logger: process.env.NODE_ENV === 'development',
});
```

**Recommendation**: Use Option B for serverless/Next.js deployments. The `prepare: false` option is required when using Supabase's Connection Pooler in Transaction pool mode.
export const db = drizzle(pool, { logger: process.env.NODE_ENV === 'development' });

````

#### 1.4 Define Schema with Drizzle

Create `/lib/db/schema.ts`:
```typescript
import { pgTable, text, uuid, boolean, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Routes table
export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  is_public: boolean('is_public').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Waypoints table
export const waypoints = pgTable('waypoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  route_id: uuid('route_id').notNull().references(() => routes.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  name: text('name'),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Relations
export const routesRelations = relations(routes, ({ many }) => ({
  waypoints: many(waypoints),
}));

export const waypointsRelations = relations(waypoints, ({ one }) => ({
  route: one(routes, {

**For Development** (Direct Connection):
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
````

**For Production** (Supabase Connection Pooler - Recommended):

```env
DATABASE_URL="postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

**Connection String Options**:

- **Direct Connection**: Use when running on long-running servers (development, VPS)
  - Get from Supabase Dashboard → Settings → Database → Connection string → "Session"
- **Connection Pooler**: Use for serverless/Next.js deployments (recommended)
  - Get from Supabase Dashboard → Settings → Database → Connection string → "Transaction"
  - Requires `prepare: false` in postgres client config

**How to find in Supabase Dashboard**:

1. Navigate to Project Settings → Database
2. Find "Connection pooler" section
3. Copy the connection string with `.pooler.supabase.com` endpoint
4. Replace your DATABASE_URL with this pooler connection string
   // Export types
   export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
   export type Waypoint = typeof waypoints.$inferSelect;
export type NewWaypoint = typeof waypoints.$inferInsert;

````

#### 1.5 Update Environment Configuration

Add to `.env.local`:
```env
DATABASE_URL="postgresql://user:password@host:5432/travel"
````

Note: Drizzle works better with direct PostgreSQL connection. Configure this pointing to your Supabase PostgreSQL connection string.

### Phase 2: Create Database Layer (2-3 days)

#### 2.1 Create Repository/Service Layer

Create `/lib/db/repositories/routes.ts`:

```typescript
import { db } from '@/lib/db/connection';
import { routes, waypoints } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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
  return db.select().from(routes).where(eq(routes.user_id, userId));
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
  updateData: Partial<Route>
) {
  const [updated] = await db
    .update(routes)
    .set(updateData)
    .where(and(eq(routes.id, routeId), eq(routes.user_id, userId)))
    .returning();

  return updated;
}

export async function deleteRoute(routeId: string, userId: string) {
  await db
    .delete(routes)
    .where(and(eq(routes.id, routeId), eq(routes.user_id, userId)));
}
```

Create `/lib/db/repositories/waypoints.ts`:

```typescript
import { db } from '@/lib/db/connection';
import { waypoints } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NewWaypoint, Waypoint } from '@/lib/db/schema';

export async function createWaypoint(waypointData: NewWaypoint) {
  const [waypoint] = await db
    .insert(waypoints)
    .values(waypointData)
    .returning();

  return waypoint;
}

export async function createWaypoints(waypointsData: NewWaypoint[]) {
  return db.insert(waypoints).values(waypointsData).returning();
}

export async function getWaypointsByRouteId(routeId: string) {
  return db
    .select()
    .from(waypoints)
    .where(eq(waypoints.route_id, routeId))
    .orderBy(waypoints.position);
}

export async function updateWaypoint(
  waypointId: string,
  updateData: Partial<Waypoint>
) {
  const [updated] = await db
    .update(waypoints)
    .set(updateData)
    .where(eq(waypoints.id, waypointId))
    .returning();

  return updated;
}

export async function deleteWaypoint(waypointId: string) {
  await db.delete(waypoints).where(eq(waypoints.id, waypointId));
}

export async function deleteWaypointsByRouteId(routeId: string) {
  await db.delete(waypoints).where(eq(waypoints.route_id, routeId));
}
```

#### 2.2 Update tRPC Procedures

Update `/lib/trpc/routes.ts` to use repository layer instead of direct Supabase calls:

```typescript
import { z } from 'zod';
import { publicProcedure, router } from '@/lib/trpc/init';
import * as routeRepository from '@/lib/db/repositories/routes';
import * as waypointRepository from '@/lib/db/repositories/waypoints';
import { auth } from '@clerk/nextjs/server';

export const routesRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId } = await auth();
      if (!userId) throw new Error('Unauthorized');

      return routeRepository.createRoute(userId, {
        name: input.name,
        description: input.description,
        is_public: false,
      });
    }),

  list: publicProcedure.query(async () => {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    return routeRepository.getRoutesByUserId(userId);
  }),

  getWithWaypoints: publicProcedure
    .input(z.object({ routeId: z.string() }))
    .query(async ({ input }) => {
      const { userId } = await auth();
      if (!userId) throw new Error('Unauthorized');

      return routeRepository.getRouteWithWaypoints(input.routeId, userId);
    }),

  delete: publicProcedure
    .input(z.object({ routeId: z.string() }))
    .mutation(async ({ input }) => {
      const { userId } = await auth();
      if (!userId) throw new Error('Unauthorized');

      return routeRepository.deleteRoute(input.routeId, userId);
    }),

  addWaypoints: publicProcedure
    .input(
      z.object({
        routeId: z.string(),
        waypoints: z.array(
          z.object({
            position: z.number(),
            latitude: z.number(),
            longitude: z.number(),
            name: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { userId } = await auth();
      if (!userId) throw new Error('Unauthorized');

      // Verify ownership before adding waypoints
      const route = await routeRepository.getRouteWithWaypoints(
        input.routeId,
        userId
      );
      if (!route) throw new Error('Route not found or unauthorized');

      return waypointRepository.createWaypoints(
        input.waypoints.map((w) => ({
          route_id: input.routeId,
          position: w.position,
          latitude: w.latitude.toString(),
          longitude: w.longitude.toString(),
          name: w.name,
        }))
      );
    }),
});
```

### Phase 3: Integration & Testing (2-3 days)

#### 3.1 Update Client Hooks

Update `/hooks/usePersistedWaypoints.ts` to use new tRPC routes:

- Remove direct Supabase calls
- Use tRPC client to fetch routes and waypoints
- Maintain existing hook interface for backward compatibility

#### 3.2 Add Integration Tests

Create `/lib/db/repositories/__tests__/` directory:

- Test route CRUD operations
- Test waypoint CRUD operations
- Test relationship queries
- Test error handling and validation

#### 3.3 Verify Existing tRPC Procedures

Update all existing tRPC routes that touch the database:

- Review `/lib/trpc/routes.ts` for any remaining raw Supabase calls
- Replace with Drizzle ORM calls using repositories
- Ensure type safety is enforced

### Phase 4: Migration & Cleanup (1-2 days)

#### 4.1 Remove Supabase Client Calls

- Delete or deprecate `/lib/supabase/client.ts`
- Update any remaining references in components or hooks
- Maintain Supabase for RLS and real-time features if needed

#### 4.2 Documentation

- Update API documentation
- Document repository layer patterns
- Add examples for common queries
- Create migration guide for other developers

#### 4.3 Production Deployment

- Official documentation: https://orm.drizzle.team/docs/connect-supabase
- Use `postgres` driver package (not `pg` driver) for optimal Supabase compatibility
- For serverless environments, use Supabase Connection Pooler with `prepare: false`
- For development/long-running servers, use direct connection
- RLS policies continue to work unchanged with direct PostgreSQL access
- Real-time subscriptions can still use Supabase client separately if needed
- Connection pooling significantly improves serverless performance and reduces connection limits

## Technical Details

### Drizzle ORM Benefits for This Project

1. **Type Safety**: Auto-generated types from schema prevent runtime errors
2. **Query Builder**: Intuitive API for complex queries
3. **Relations**: Built-in support for table relationships (routes → waypoints)
4. **Migrations**: Track schema changes with version control
5. **IDE Support**: Full intellisense for all database operations

### Compatibility Considerations

**Supabase PostgreSQL + Drizzle ORM**:

- Drizzle works seamlessly with Supabase PostgreSQL
- Use direct PostgreSQL connection string instead of Supabase REST API
- RLS policies continue to work unchanged
- Real-time subscriptions use Supabase client separately

### Performance Implications

- Potentially faster than REST API calls (direct connection)
- Connection pooling should be configured for serverless functions
- No negative performance impact expected from type-safe queries

### Risk Mitigation

1. **Backward Compatibility**: Keep Supabase client available during transition
2. **Testing**: Comprehensive test coverage before removing old code
3. **Rollback Plan**: Can revert to Supabase queries if issues arise
4. **Gradual Adoption**: Migrate one feature at a time, not all-at-once

## Success Crit+ Supabase Official Guide](https://orm.drizzle.team/docs/connect-supabase) ⭐ **START HERE**

- [Supabase + Drizzle Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connecting-with-drizzle)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Relations](https://orm.drizzle.team/docs/relations)
- [Supabase Connection Pooler Guide](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
- [x] Full type safety for all queries
- [x] No runtime type errors related to database operations
- [x] Comprehensive test coverage for repository layer
- [x] Documentation updated with new patterns
- [x] Performance equivalent to or better than current implementation
- [x] Production deployment successful with zero data loss

## Timeline

- **Week 1**: Setup, schema definition, database connection
- **Week 2**: Repository layer implementation, tRPC integration
- **Week 3**: Testing, integration verification, cleanup
- **Week 4**: Documentation, deployment, monitoring

**Total Estimated Effort**: 2-3 weeks of development

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Drizzle Relations](https://orm.drizzle.team/docs/relations)
- [Current Supabase Setup](./supabase-setup.md)
- [Persistent Waypoints Implementation](./09-persistent-waypoints-supabase.md)
