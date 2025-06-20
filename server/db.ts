import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Development fallback handling
let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("Database connected successfully");
  } else if (process.env.NODE_ENV === "development") {
    console.log("Development mode: DATABASE_URL not configured, using fallbacks");
  } else {
    throw new Error("DATABASE_URL must be set in production");
  }
} catch (error) {
  if (process.env.NODE_ENV === "development") {
    console.log("Development mode: Database connection failed, using fallbacks");
  } else {
    throw error;
  }
}

export { pool, db };

export function getDb() {
  return db;
}