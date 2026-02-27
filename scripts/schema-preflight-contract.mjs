#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const migrationsDir = path.join(repoRoot, 'supabase', 'migrations')

const requiredFunctionNames = [
  'get_unified_athlete_profile_v2',
  'get_unified_athlete_schedule_v2',
  'get_unified_athlete_documents_v2',
  'upsert_sport_filter_preference_v2',
  'resolve_athlete_identity_link_v2',
  'list_identity_merge_inbox_v2',
  'create_identity_link_v2',
  'get_athlete_profile_v2_fan',
  'enqueue_v2_write_outbox_event',
  'run_v2_write_outbox_reconciliation',
]

const requiredTableNames = [
  'v2_write_outbox',
  'athlete_identity_links_v2',
  'athlete_identity_merge_inbox_v2',
  'athlete_sport_filter_preferences_v2',
]

if (!fs.existsSync(migrationsDir)) {
  console.error(`[schema_preflight_contract] Missing migrations directory: ${migrationsDir}`)
  process.exit(1)
}

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

if (migrationFiles.length === 0) {
  console.error('[schema_preflight_contract] No SQL migrations found.')
  process.exit(1)
}

const migrationSources = migrationFiles.map((name) => ({
  name,
  content: fs.readFileSync(path.join(migrationsDir, name), 'utf8'),
}))

const functionHits = new Map()
for (const functionName of requiredFunctionNames) {
  const regex = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${functionName}\\s*\\(`, 'i')
  const hit = migrationSources.find((entry) => regex.test(entry.content))
  if (hit) functionHits.set(functionName, hit.name)
}

const missingFunctions = requiredFunctionNames.filter((name) => !functionHits.has(name))

const tableHits = new Map()
for (const tableName of requiredTableNames) {
  const regex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?public\\.${tableName}\\s*\\(`, 'i')
  const hit = migrationSources.find((entry) => regex.test(entry.content))
  if (hit) tableHits.set(tableName, hit.name)
}

const missingTables = requiredTableNames.filter((name) => !tableHits.has(name))

if (missingFunctions.length > 0 || missingTables.length > 0) {
  if (missingFunctions.length > 0) {
    console.error('[schema_preflight_contract] Missing required functions:')
    for (const fn of missingFunctions) {
      console.error(`  - ${fn}`)
    }
  }

  if (missingTables.length > 0) {
    console.error('[schema_preflight_contract] Missing required tables:')
    for (const table of missingTables) {
      console.error(`  - ${table}`)
    }
  }

  process.exit(1)
}

console.log('[schema_preflight_contract] PASS')
for (const functionName of requiredFunctionNames) {
  console.log(`  function ${functionName} -> ${functionHits.get(functionName)}`)
}
for (const tableName of requiredTableNames) {
  console.log(`  table ${tableName} -> ${tableHits.get(tableName)}`)
}
