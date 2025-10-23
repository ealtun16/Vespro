import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool for local PostgreSQL
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
  console.log('Closing database pool...');
  pool.end();
});

process.on('SIGINT', () => {
  console.log('Closing database pool...');
  pool.end();
});
