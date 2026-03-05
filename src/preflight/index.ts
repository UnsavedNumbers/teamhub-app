// @ts-nocheck
/// <reference types="node" />

import fs from 'node:fs'
import path from 'node:path'

import pg from 'pg'

import { fail } from './helpers'
import type { PreflightContext, PreflightFailure, Validator } from './types'
import { validateColumns } from './validateColumns'
import { validateEnums } from './validateEnums'
import { validateForeignKeys } from './validateForeignKeys'
import { validateIndexes } from './validateIndexes'
import { validateNotificationWiring } from './validateNotificationWiring'
import { validatePolicies } from './validatePolicies'
import { validateRLS } from './validateRLS'
import { validateRoleModel } from './validateRoleModel'
import { validateRPCs } from './validateRPCs'
import { validateStorage } from './validateStorage'
import { validateStripe } from './validateStripe'
import { validateTables } from './validateTables'
import { validateTierSystem } from './validateTierSystem'
import { validateTriggers } from './validateTriggers'

const { Client } = pg

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
  return undefined
}

function isStrictMode(): boolean {
  const envValue = parseBoolean(process.env.PREFLIGHT_STRICT)
  if (envValue !== undefined) return envValue

  return process.env.NODE_ENV === 'production'
}

function getDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.SUPABASE_DB_URL,
    process.env.POSTGRES_URL,
    process.env.PGURL,
    process.env.PG_URI,
  ]

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) return candidate
  }

  return 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
}

function getMigrationVersions(repoRoot: string): string[] {
  const migrationsDir = path.join(repoRoot, 'supabase', 'migrations')
  if (!fs.existsSync(migrationsDir)) return []

  const files = fs.readdirSync(migrationsDir)
  const versions = files
    .filter((name) => /^\d{14}.*\.sql$/i.test(name))
    .map((name) => name.slice(0, 14))

  return Array.from(new Set(versions)).sort()
}

async function validateMigrationState(context: PreflightContext): Promise<PreflightFailure[]> {
  const failures: PreflightFailure[] = []

  const tableExistsResult = await context.client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'supabase_migrations'
        AND table_name = 'schema_migrations'
    ) AS exists
  `)

  if (!tableExistsResult.rows[0]?.exists) {
    failures.push(fail('validateMigrations', 'Missing migration tracking table: supabase_migrations.schema_migrations'))
    return failures
  }

  const { rows } = await context.client.query<{ version: string }>(
    'SELECT version::text FROM supabase_migrations.schema_migrations',
  )
  const dbVersions = new Set(rows.map((row) => row.version))

  const missingFromDb = context.migrationVersions.filter((version) => !dbVersions.has(version))
  const extraInDb = [...dbVersions].filter((version) => !context.migrationVersions.includes(version))

  for (const version of missingFromDb) {
    failures.push(fail('validateMigrations', `Missing migration in DB: ${version}`))
  }

  for (const version of extraInDb) {
    failures.push(fail('validateMigrations', `Unknown migration in DB (not in repo): ${version}`))
  }

  return failures
}

export async function runPreflight(): Promise<void> {
  const strict = isStrictMode()
  const repoRoot = process.cwd()
  const migrationVersions = getMigrationVersions(repoRoot)

  if (migrationVersions.length === 0) {
    throw new Error('PRECHECK FAILED:\n- Missing local migrations under supabase/migrations')
  }

  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    throw new Error('PRECHECK FAILED:\n- Missing database URL configuration')
  }

  const client = new Client({ connectionString: databaseUrl })

  try {
    await client.connect()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (strict) {
      throw new Error(`PRECHECK FAILED:\n- Unable to connect to database: ${message}`)
    }

    console.warn(`[schema_preflight_contract] skipped (non-strict): unable to connect to database: ${message}`)
    return
  }

  const context: PreflightContext = {
    client,
    strict,
    repoRoot,
    migrationVersions,
    cache: new Map(),
  }

  const validators: Validator[] = [
    validateTables,
    validateColumns,
    validateForeignKeys,
    validateIndexes,
    validateRLS,
    validatePolicies,
    validateRPCs,
    validateEnums,
    validateTriggers,
    validateStorage,
    validateStripe,
    validateNotificationWiring,
    validateTierSystem,
    validateRoleModel,
  ]

  const failures: PreflightFailure[] = []
  try {
    failures.push(...(await validateMigrationState(context)))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failures.push(fail('validateMigrations', `Migration validation crashed: ${message}`))
  }

  for (const validator of validators) {
    try {
      failures.push(...(await validator(context)))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      failures.push(fail(validator.name || 'validator', `Validator crashed: ${message}`))
    }
  }

  await client.end()

  if (failures.length > 0) {
    const lines = failures.map((entry) => `- ${entry.message}`)
    throw new Error(`PRECHECK FAILED:\n${lines.join('\n')}`)
  }

  console.log('PRECHECK PASSED')
}

const modulePath = process.platform === 'win32'
  ? new URL(import.meta.url).pathname.replace(/^\/+/, '')
  : new URL(import.meta.url).pathname

const entryArg = process.argv[1] ?? ''
const isEntryPoint = entryArg.endsWith('src/preflight/index.ts') || entryArg.endsWith('src\\preflight\\index.ts') || entryArg === modulePath

if (isEntryPoint) {
  runPreflight().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  })
}


