#!/usr/bin/env node
/**
 * Print migration tracking table (schema.table_name) and its columns.
 * Uses DATABASE_URL from .env (dev). For Step 4 INSERT shape.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

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

const env = loadEnv();
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set in .env');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  const tablesRes = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name LIKE '%migration%'
    ORDER BY table_schema, table_name
  `);
  if (tablesRes.rows.length === 0) {
    console.log('No migration tables found.');
    await client.end();
    return;
  }
  for (const row of tablesRes.rows) {
    const { table_schema, table_name } = row;
    console.log('Migration table:', `${table_schema}.${table_name}`);
    const colsRes = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2
       ORDER BY ordinal_position`,
      [table_schema, table_name]
    );
    for (const c of colsRes.rows) {
      console.log('  ', c.column_name, c.data_type);
    }
  }
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
