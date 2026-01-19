# Drizzle ORM Database Layer

This directory contains the database layer using Drizzle ORM for type-safe database interactions.

## Structure

```
lib/db/
├── connection.ts       # Database connection configuration
├── schema.ts          # Database schema definitions
├── index.ts           # Main exports
└── repositories/      # Data access layer
    ├── routes.ts      # Route operations
    └── waypoints.ts   # Waypoint operations
```

## Usage

### Import the database client

```typescript
import { db } from '@/lib/db/connection';
```

### Use repository functions

```typescript
import * as routeRepository from '@/lib/db/repositories/routes';
import * as waypointRepository from '@/lib/db/repositories/waypoints';

// Create a route
const route = await routeRepository.createRoute(userId, {
  name: 'My Trip',
  description: 'Summer vacation',
});

// Get routes with waypoints
const routes = await routeRepository.getRoutesByUserId(userId);
```

### Direct database queries

For complex queries not covered by repositories:

```typescript
import { db } from '@/lib/db/connection';
import { routes, waypoints } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const result = await db.select().from(routes).where(eq(routes.user_id, userId));
```

## Type Safety

All database operations are fully type-safe:

```typescript
import type { Route, NewRoute, Waypoint, NewWaypoint } from '@/lib/db/schema';

// TypeScript will catch any type errors
const newRoute: NewRoute = {
  name: 'Trip',
  user_id: 'user-id',
  // TypeScript error if required fields are missing
};
```

## Environment Setup

Required environment variable:

```env
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Get the connection string from Supabase:

- Dashboard → Settings → Database → Connection string → "Transaction" (for serverless)

## Migrations

To generate migrations from schema changes:

```bash
npx drizzle-kit generate
```

To push schema changes directly to database:

```bash
npx drizzle-kit push
```

To introspect existing database:

```bash
npx drizzle-kit introspect
```

## Best Practices

1. **Use repositories**: Prefer repository functions over direct queries for consistency
2. **Type safety**: Leverage TypeScript types for compile-time safety
3. **Transactions**: Use `db.transaction()` for operations that need atomicity
4. **Error handling**: Wrap database calls in try-catch blocks
5. **Connection pooling**: The connection is configured for serverless environments with `prepare: false`

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle + Supabase Guide](https://orm.drizzle.team/docs/connect-supabase)
- [Implementation Plan](../../docs/13-drizzle-orm-migration.md)
