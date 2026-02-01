#!/usr/bin/env node
/**
 * Apply baseline to TEST_DATABASE_URL or ephemeral Postgres via Docker;
 * run verification (extensions, RLS); exit non-zero on failure.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const envPath = join(projectRoot, '.env');
const baselinePath = join(projectRoot, 'supabase', 'migrations', '0000_baseline.sql');

function loadEnv() {
  if (!existsSync(envPath)) return {};
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

function getTestUrl() {
  const env = loadEnv();
  return process.env.TEST_DATABASE_URL || env.TEST_DATABASE_URL || env.DATABASE_URL;
}

async function applyBaseline(client, sql) {
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));
  for (const stmt of statements) {
    try {
      await client.query(stmt);
    } catch (err) {
      if (!stmt.toUpperCase().startsWith('CREATE EXTENSION') || !err.message.includes('already exists')) {
        throw err;
      }
    }
  }
}

async function verify(client) {
  const extRes = await client.query(`SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql')`);
  console.log('Extensions:', extRes.rows.length, extRes.rows.map((r) => r.extname).join(', ') || '(none)');
  const rlsRes = await client.query(`SELECT count(*) AS n FROM pg_policies WHERE schemaname = 'public'`);
  console.log('RLS policies (public):', rlsRes.rows[0].n);
}

async function main() {
  if (!existsSync(baselinePath)) {
    console.error('0000_baseline.sql not found. Run db:copy-baseline and db:organize-baseline first.');
    process.exit(1);
  }
  const sql = readFileSync(baselinePath, 'utf-8');
  let connectionUrl = getTestUrl();
  let cleanupContainer = null;
  if (!connectionUrl) {
    console.log('TEST_DATABASE_URL not set; starting ephemeral Postgres via Docker...');
    const container = 'verify-baseline-' + Date.now();
    const run = spawnSync('docker', [
      'run',
      '-d',
      '--name',
      container,
      '-e',
      'POSTGRES_PASSWORD=postgres',
      '-p',
      '5433:5432',
      'postgres:17',
    ], { stdio: 'inherit', shell: true });
    if (run.status !== 0) {
      console.error('Docker not available or failed to start Postgres. Set TEST_DATABASE_URL.');
      process.exit(1);
    }
    cleanupContainer = container;
    await new Promise((r) => setTimeout(r, 3000));
    connectionUrl = 'postgresql://postgres:postgres@localhost:5433/postgres';
  }
  const client = new pg.Client({ connectionString: connectionUrl });
  try {
    await client.connect();
    await applyBaseline(client, sql);
    await verify(client);
    console.log('Verification passed.');
  } catch (err) {
    console.error('Verification failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    if (cleanupContainer) {
      spawnSync('docker', ['rm', '-f', cleanupContainer], { stdio: 'ignore', shell: true });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
