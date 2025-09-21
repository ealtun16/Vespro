import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with better connection management
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ client: pool, schema });

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