import { config } from 'dotenv';
config({ path: '.env.local' });
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_CONNECTION_STRING) {
  throw new Error('DATABASE_CONNECTION_STRING is not set');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_CONNECTION_STRING
  }
});
