#!/usr/bin/env node
/**
 * Prints the next unique 14-digit migration version prefix for supabase/migrations.
 * Use: node scripts/next-migration-version.mjs
 * Output: single line, e.g. 20260216120001
 * Ensures no two migration files share the same version prefix.
 */
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const migrationsDir = join(projectRoot, 'supabase', 'migrations');

const prefixRe = /^(\d{14})_/;
let maxVersion = 0;

try {
  const files = readdirSync(migrationsDir);
  for (const name of files) {
    if (!name.endsWith('.sql') || name.startsWith('_TEMPLATE')) continue;
    const m = name.match(prefixRe);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v > maxVersion) maxVersion = v;
    }
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    // No migrations yet; use a base from current date
    const now = new Date();
    const y = now.getUTCFullYear();
    const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const h = String(now.getUTCHours()).padStart(2, '0');
    const mi = String(now.getUTCMinutes()).padStart(2, '0');
    const s = String(now.getUTCSeconds()).padStart(2, '0');
    console.log(`${y}${mo}${d}${h}${mi}${s}01`);
    process.exit(0);
  }
  console.error(err.message);
  process.exit(1);
}

const nextVersion = maxVersion + 1;
const padded = String(nextVersion).padStart(14, '0');
console.log(padded);
