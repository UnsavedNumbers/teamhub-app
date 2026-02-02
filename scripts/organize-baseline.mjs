#!/usr/bin/env node
/**
 * Read 0000_baseline.sql; classify statements; rewrite in order:
 * extensions → types → tables → indexes → RLS → functions → triggers → other.
 * Adds section header comments. Does not split $$ bodies.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const baselinePath = join(projectRoot, 'supabase', 'migrations', '0000_baseline.sql');

const SECTIONS = [
  'extensions',
  'types',
  'tables',
  'indexes',
  'rls',
  'functions',
  'triggers',
  'other',
];

function classify(statement) {
  const t = statement.trim().toUpperCase();
  if (t.startsWith('CREATE EXTENSION')) return 'extensions';
  if (t.startsWith('CREATE TYPE') || t.startsWith('CREATE DOMAIN')) return 'types';
  if (t.startsWith('CREATE TABLE')) return 'tables';
  if (t.startsWith('CREATE UNIQUE INDEX') || t.startsWith('CREATE INDEX')) return 'indexes';
  if (t.startsWith('CREATE POLICY') || t.includes('ENABLE ROW LEVEL SECURITY') || t.includes('FORCE ROW LEVEL SECURITY')) return 'rls';
  if (t.startsWith('CREATE OR REPLACE FUNCTION') || t.startsWith('CREATE FUNCTION')) return 'functions';
  if (t.startsWith('CREATE TRIGGER')) return 'triggers';
  return 'other';
}

/** Split SQL into statements, respecting $$-delimited bodies. */
function splitStatements(sql) {
  const statements = [];
  let pos = 0;
  const len = sql.length;
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  while (pos < len) {
    if (inDollarQuote) {
      const idx = sql.indexOf(dollarTag, pos);
      if (idx === -1) {
        current += sql.slice(pos);
        pos = len;
        break;
      }
      current += sql.slice(pos, idx + dollarTag.length);
      pos = idx + dollarTag.length;
      inDollarQuote = false;
      continue;
    }
    const nextDollar = sql.indexOf('$$', pos);
    const nextSemi = sql.indexOf(';', pos);
    if (nextDollar !== -1 && (nextSemi === -1 || nextDollar < nextSemi)) {
      const match = sql.slice(nextDollar).match(/^\$\$([a-zA-Z0-9_]*)\$\$/);
      const tag = match ? '$$' + (match[1] || '') + '$$' : '$$';
      dollarTag = tag;
      current += sql.slice(pos, nextDollar + tag.length);
      pos = nextDollar + tag.length;
      inDollarQuote = true;
      continue;
    }
    if (nextSemi !== -1) {
      current += sql.slice(pos, nextSemi + 1);
      pos = nextSemi + 1;
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
      continue;
    }
    current += sql.slice(pos);
    pos = len;
  }
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }
  return statements;
}

if (!existsSync(baselinePath)) {
  console.error('supabase/migrations/0000_baseline.sql not found. Run npm run db:copy-baseline first.');
  process.exit(1);
}

const sql = readFileSync(baselinePath, 'utf-8');
const statements = splitStatements(sql);
const bySection = Object.fromEntries(SECTIONS.map((s) => [s, []]));

for (const stmt of statements) {
  const section = classify(stmt);
  bySection[section].push(stmt);
}

const out = [];
for (const section of SECTIONS) {
  const list = bySection[section];
  if (list.length === 0) continue;
  out.push('');
  out.push(`-- === ${section.charAt(0).toUpperCase() + section.slice(1)} ===`);
  out.push('');
  out.push(list.join('\n\n'));
  out.push('');
}

const result = out.join('\n').trim() + '\n';
writeFileSync(baselinePath, result, 'utf-8');
console.log('Organized 0000_baseline.sql into sections:', SECTIONS.join(' → '));
