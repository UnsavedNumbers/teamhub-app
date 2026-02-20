#!/usr/bin/env node
/**
 * Prints the current timestamp as a 14-digit migration version prefix for supabase/migrations.
 * Use: node scripts/next-migration-version.mjs
 * Output: single line, e.g. 20260219143052 (YYYYMMDDHHmmss UTC)
 * Matches the Supabase migrations rule: "Generate timestamp at time of creation".
 */
const now = new Date();
const y = now.getUTCFullYear();
const mo = String(now.getUTCMonth() + 1).padStart(2, '0');
const d = String(now.getUTCDate()).padStart(2, '0');
const h = String(now.getUTCHours()).padStart(2, '0');
const mi = String(now.getUTCMinutes()).padStart(2, '0');
const s = String(now.getUTCSeconds()).padStart(2, '0');
console.log(`${y}${mo}${d}${h}${mi}${s}`);
