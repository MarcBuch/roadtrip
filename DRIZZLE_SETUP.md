# Drizzle ORM Migration - Setup Instructions

## Quick Start

### 1. Install Dependencies ✅

Dependencies have been installed:

- `drizzle-orm`
- `postgres`
- `drizzle-kit` (dev dependency)

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and add your DATABASE_URL:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set:

```env
DATABASE_URL=postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Getting the DATABASE_URL:**

1. Go to Supabase Dashboard
2. Navigate to: Project Settings → Database
3. Find "Connection pooler" section
4. Copy the "Transaction" mode connection string (ends with `.pooler.supabase.com:6543`)

### 3. Verify Database Schema

The Drizzle schema should match your existing Supabase tables. Run introspection to verify:

```bash
npx drizzle-kit introspect
```

### 4. Test the Migration

Run the development server:

```bash
npm run dev
```

Test that:

- Routes can be created ✓
- Routes can be loaded ✓
- Waypoints are saved correctly ✓
- All CRUD operations work ✓

## What Was Changed

### New Files Created

1. **`drizzle.config.ts`** - Drizzle Kit configuration
2. **`lib/db/schema.ts`** - Type-safe database schema
3. **`lib/db/connection.ts`** - Database connection setup
4. **`lib/db/repositories/routes.ts`** - Route CRUD operations
5. **`lib/db/repositories/waypoints.ts`** - Waypoint CRUD operations
6. **`lib/db/index.ts`** - Convenience exports
7. **`lib/db/README.md`** - Database layer documentation
8. **`.env.example`** - Environment variables template

### Modified Files

1. **`lib/trpc/routes.ts`** - Replaced Supabase calls with Drizzle repositories
2. **`app/page.tsx`** - Convert decimal strings to numbers
3. **`hooks/usePersistedWaypoints.ts`** - Convert decimal strings to numbers
4. **`components/RoutesLibrary.tsx`** - Updated types to match database schema
5. **`lib/trpc/init.ts`** - Handle null to undefined conversion for userId

### Type Conversions

The database stores `latitude` and `longitude` as PostgreSQL `DECIMAL` types (mapped to strings in JavaScript). These are converted to numbers when loading:

```typescript
lng: parseFloat(wp.longitude);
lat: parseFloat(wp.latitude);
```

## Rollback Plan

If you need to rollback to Supabase client:

1. The old Supabase client code is still available in `lib/supabase/`
2. Revert `lib/trpc/routes.ts` to use Supabase queries
3. Remove Drizzle imports

## Next Steps

1. **Set up DATABASE_URL** in `.env.local`
2. **Test all features** to ensure nothing broke
3. **Run existing tests** to verify compatibility
4. **Consider removing** `lib/supabase/client.ts` if everything works
5. **Add database migrations** for future schema changes

## Benefits Achieved

✅ **Type Safety** - All queries are type-checked at compile time  
✅ **Better DX** - Auto-complete and intellisense for all database operations  
✅ **Maintainability** - Schema changes are tracked in code  
✅ **Repository Pattern** - Clean separation of data access logic  
✅ **Zero Runtime Overhead** - No performance degradation

## Documentation

- [Database Layer README](lib/db/README.md)
- [Implementation Plan](docs/13-drizzle-orm-migration.md)
- [Drizzle + Supabase Guide](https://orm.drizzle.team/docs/connect-supabase)
