#!/usr/bin/env node
/**
 * For each env (DATABASE_URL or .env.dev/.env.prod per --env), connect with pg;
 * detect schema_migrations columns; if version '0000_baseline' exists, skip; else INSERT.
 * Default: dev (DATABASE_URL). Optional: --env=dev|prod|all.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const BASELINE_VERSION = '0000_baseline';

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

async function getMigrationTable(client) {
  const res = await client.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name LIKE '%migration%'
    ORDER BY table_schema, table_name
    LIMIT 1
  `);
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return `${r.table_schema}.${r.table_name}`;
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

async function runForUrl(databaseUrl, label) {
  if (!databaseUrl) return;
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const tableName = await getMigrationTable(client);
  if (!tableName) {
    console.warn(label, 'No migration table found');
    await client.end();
    return;
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
  const envFiles = getEnvFiles(process.argv.slice(2));
  const seen = new Set();
  for (const ef of envFiles) {
    const env = loadEnv(ef);
    const url = env.DATABASE_URL;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const label = ef === '.env' ? 'dev' : ef.replace('.env.', '');
    await runForUrl(url, label);
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
