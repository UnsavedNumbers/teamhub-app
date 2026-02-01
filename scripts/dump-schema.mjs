#!/usr/bin/env node
/**
 * Dump current DB schema to schema_snapshot.sql (dev).
 * Tries Supabase CLI (uses Docker). On Windows if Docker fails, falls back to pg_dump from PATH.
 * Loads DATABASE_URL from .env or .env.dev; logs host (redacted).
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

function loadEnv() {
  const envPath = existsSync(join(projectRoot, '.env'))
    ? join(projectRoot, '.env')
    : join(projectRoot, '.env.dev');
  if (!existsSync(envPath)) {
    console.error('Missing .env or .env.dev at project root');
    process.exit(1);
  }
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    env[key] = val;
  }
  return env;
}

/** Percent-encode DATABASE_URL for --db-url (password may contain &, ?). */
function encodeDatabaseUrl(url) {
  const m = url.match(/^(.+:\/\/[^:]+):([^@]+)@(.+)$/);
  if (!m) return encodeURI(url);
  const [, prefix, password, rest] = m;
  return `${prefix}:${encodeURIComponent(password)}@${rest}`;
}

/** Redacted host for logging (e.g. db.xxx.supabase.co). */
function redactedHost(url) {
  try {
    const u = new URL(url.replace(/^postgresql:/, 'https:'));
    return u.hostname || '(redacted)';
  } catch {
    return '(redacted)';
  }
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}

const encoded = encodeDatabaseUrl(databaseUrl);
const host = redactedHost(databaseUrl);
console.log('Dumping schema from host:', host);

const outPath = join(projectRoot, 'schema_snapshot.sql');

// Try Supabase CLI first (uses Docker; can fail on Windows if Docker engine has issues).
const result = spawnSync(
  'npx',
  ['supabase', 'db', 'dump', '--db-url', encoded, '-f', outPath],
  { stdio: 'inherit', cwd: projectRoot, shell: true }
);

if (result.status === 0) {
  console.log('Schema written to', outPath);
  process.exit(0);
}

// Fallback on Windows (or when Docker fails): use pg_dump from PATH. No Docker required.
console.log('Supabase CLI failed; trying pg_dump from PATH (Windows-friendly, no Docker)...');
const pgResult = spawnSync('pg_dump', ['--schema-only', '--no-owner', '--no-acl', '-f', outPath, databaseUrl], {
  stdio: 'inherit',
  shell: false,
});

if (pgResult.status !== 0) {
  console.error('pg_dump failed. On Windows: install PostgreSQL (https://www.postgresql.org/download/windows/) and add bin to PATH.');
  process.exit(pgResult.status ?? 1);
}
console.log('Schema written to', outPath);
