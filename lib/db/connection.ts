import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Use Supabase Connection Pooler for serverless environments
// Disable prepared statements for "Transaction" pool mode
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
});

export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development',
});
