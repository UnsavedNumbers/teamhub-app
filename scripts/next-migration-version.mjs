#!/usr/bin/env node
/**
 * Prints the next unique 14-digit migration version for supabase/migrations.
 * Scans existing migration filenames, takes max(14-digit prefix)+1 so multiple
 * runs in the same second never collide. Ensures Supabase migration uniqueness.
 * Use: node scripts/next-migration-version.mjs
 * Output: single line, e.g. 20260220100004 (YYYYMMDDHHmmss, at least 1 greater than max existing).
 */
import fs from "fs";
import path from "path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const PREFIX_REGEX = /^(\d{14})_/;

let maxPrefix = 0;
if (fs.existsSync(migrationsDir)) {
  const files = fs.readdirSync(migrationsDir);
  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    const m = file.match(PREFIX_REGEX);
    if (m) {
      const n = Number(m[1]);
      if (n > maxPrefix) maxPrefix = n;
    }
  }
}

const next = maxPrefix + 1;
const nextStr = String(next).padStart(14, "0");
console.log(nextStr);
