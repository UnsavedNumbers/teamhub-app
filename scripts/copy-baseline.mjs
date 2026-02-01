#!/usr/bin/env node
/**
 * Copy schema_snapshot.sql → supabase/migrations/0000_baseline.sql.
 * Ensures supabase/migrations exists.
 */
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const src = join(projectRoot, 'schema_snapshot.sql');
const migrationsDir = join(projectRoot, 'supabase', 'migrations');
const dest = join(migrationsDir, '0000_baseline.sql');

if (!existsSync(src)) {
  console.error('schema_snapshot.sql not found. Run npm run db:dump-schema first.');
  process.exit(1);
}
if (!existsSync(migrationsDir)) {
  mkdirSync(migrationsDir, { recursive: true });
}
copyFileSync(src, dest);
console.log('Copied schema_snapshot.sql → supabase/migrations/0000_baseline.sql');
