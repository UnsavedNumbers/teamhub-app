#!/usr/bin/env node
/**
 * For each env (DATABASE_URL or .env.dev/.env.prod per --env), connect with pg;
 * ensure supabase_migrations.schema_migrations has baseline marked applied so
 * `supabase db push` does not run it. Use --reset to clear the table first.
 * Default: dev (DATABASE_URL). Optional: --env=dev|prod|all, --reset.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

/** Must match migration filename without .sql: 00000000000000000_baseline.sql */
const BASELINE_VERSION = '00000000000000000_baseline';
const SUPABASE_MIGRATIONS_TABLE = 'supabase_migrations.schema_migrations';

function loadEnv(fileName = '.env') {
  const envPath = join(projectRoot, fileName);
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

function getEnvFiles(args) {
  const envArg = args.find((a) => a.startsWith('--env='));
  const env = envArg ? envArg.slice(6) : 'dev';
  if (env === 'all') return ['.env', '.env.dev', '.env.prod'];
  if (env === 'prod') return ['.env.prod', '.env'];
  return ['.env'];
}

function getResetFlag(args) {
  return args.some((a) => a === '--reset');
}

async function getColumns(client, tableSchema, tableName) {
  const res = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [tableSchema, tableName]
  );
  return res.rows;
}

async function hasBaselineRow(client, fullTableName) {
  const [schema, table] = fullTableName.split('.');
  const cols = await getColumns(client, schema, table);
  const versionCol = cols.find((c) => c.column_name === 'version' || c.column_name === 'name');
  if (!versionCol) return false;
  const col = versionCol.column_name;
  const q = `SELECT 1 FROM ${fullTableName} WHERE ${col} = $1`;
  const res = await client.query(q, [BASELINE_VERSION]);
  return res.rows.length > 0;
}

async function insertBaseline(client, fullTableName) {
  const [schema, table] = fullTableName.split('.');
  const cols = await getColumns(client, schema, table);
  const colNames = cols.map((c) => c.column_name);
  if (colNames.includes('version') && colNames.includes('name') && colNames.includes('statements')) {
    await client.query(
      `INSERT INTO ${fullTableName} (version, name, statements) VALUES ($1, $2, $3)`,
      [BASELINE_VERSION, BASELINE_VERSION, '{}']
    );
    return;
  }
  if (colNames.includes('version')) {
    await client.query(`INSERT INTO ${fullTableName} (version) VALUES ($1)`, [BASELINE_VERSION]);
    return;
  }
  if (colNames.includes('name')) {
    await client.query(`INSERT INTO ${fullTableName} (name) VALUES ($1)`, [BASELINE_VERSION]);
    return;
  }
  console.warn('Unknown schema_migrations shape:', colNames);
  process.exit(1);
}

async function runForUrl(databaseUrl, label, reset) {
  if (!databaseUrl) return;
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const tableName = SUPABASE_MIGRATIONS_TABLE;
  const tableExists = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
    ['supabase_migrations', 'schema_migrations']
  );
  if (tableExists.rows.length === 0) {
    console.warn(label, 'Table', tableName, 'not found (run baseline migration first)');
    await client.end();
    return;
  }
  if (reset) {
    await client.query(`DELETE FROM ${tableName}`);
    console.log(label, 'Cleared', tableName);
  }
  const exists = await hasBaselineRow(client, tableName);
  if (exists) {
    console.log(label, 'Baseline already recorded, skip');
    await client.end();
    return;
  }
  await insertBaseline(client, tableName);
  console.log(label, 'Inserted', BASELINE_VERSION);
  await client.end();
}

async function main() {
  const args = process.argv.slice(2);
  const envFiles = getEnvFiles(args);
  const reset = getResetFlag(args);
  const seen = new Set();
  for (const ef of envFiles) {
    const env = loadEnv(ef);
    const url = env.DATABASE_URL;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const label = ef === '.env' ? 'dev' : ef.replace('.env.', '');
    await runForUrl(url, label, reset);
  }
  if (seen.size === 0) {
    console.error('No DATABASE_URL found in', envFiles.join(', '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
