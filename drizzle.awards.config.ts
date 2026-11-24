import { defineConfig } from 'drizzle-kit'

// Used by `npm run awards:generate` only, which reads the schema and writes SQL
// and needs no database. Applying migrations is src/lib/awards/db/migrate.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/awards/db/schema.ts',
  out: './src/lib/awards/db/migrations',
})
