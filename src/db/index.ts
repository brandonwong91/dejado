import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_CONNECTION_STRING) {
  throw new Error('DATABASE_CONNECTION_STRING is not set');
}

const sql = neon(process.env.DATABASE_CONNECTION_STRING);
export const db = drizzle(sql, { schema });
