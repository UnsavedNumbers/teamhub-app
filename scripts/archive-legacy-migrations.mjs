#!/usr/bin/env node
/**
 * List files in supabase/migrations (exclude 0000_baseline.sql);
 * create migrations_archive/legacy/; move files; write README.
 * Requires --yes or stdin confirmation.
 */
import { readdirSync, mkdirSync, renameSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const migrationsDir = join(projectRoot, 'supabase', 'migrations');
const archiveDir = join(projectRoot, 'supabase', 'migrations_archive', 'legacy');

const KEEP = ['0000_baseline.sql'];

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer?.trim().toLowerCase());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const forceYes = args.includes('--yes') || args.includes('-y');
  if (!existsSync(migrationsDir)) {
    console.error('supabase/migrations not found');
    process.exit(1);
  }
  const files = readdirSync(migrationsDir).filter(
    (f) => f.endsWith('.sql') && !KEEP.includes(f)
  );
  if (files.length === 0) {
    console.log('No legacy migration files to archive.');
    return;
  }
  console.log('Files to archive:', files.length);
  files.forEach((f) => console.log('  ', f));
  if (!forceYes) {
    const answer = await ask('Proceed? (yes/no): ');
    if (answer !== 'yes' && answer !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }
  for (const f of files) {
    const src = join(migrationsDir, f);
    const dest = join(archiveDir, f);
    renameSync(src, dest);
    console.log('Moved', f);
  }
  const readmePath = join(projectRoot, 'supabase', 'migrations_archive', 'README.md');
  const readme = `# Legacy migrations

These files were archived during migration cleanup. Do not run them.

Current schema is in \`supabase/migrations/0000_baseline.sql\`.
`;
  writeFileSync(readmePath, readme, 'utf-8');
  console.log('Wrote', readmePath);
  console.log('Archive complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
