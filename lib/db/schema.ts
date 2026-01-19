import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  integer,
  decimal,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Routes table
export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  is_public: boolean('is_public').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Waypoints table
export const waypoints = pgTable('waypoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  route_id: uuid('route_id')
    .notNull()
    .references(() => routes.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  name: text('name'),
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Relations
export const routesRelations = relations(routes, ({ many }) => ({
  waypoints: many(waypoints),
}));

export const waypointsRelations = relations(waypoints, ({ one }) => ({
  route: one(routes, {
    fields: [waypoints.route_id],
    references: [routes.id],
  }),
}));

// Export types
export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
export type Waypoint = typeof waypoints.$inferSelect;
export type NewWaypoint = typeof waypoints.$inferInsert;
