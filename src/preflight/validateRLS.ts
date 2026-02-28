// @ts-nocheck
import { SENSITIVE_RLS_TABLE_KEYS } from './contracts'
import { fail, getRequirement, resolveTables, tableLabel } from './helpers'
import type { Validator } from './types'

interface RlsRow {
  schema_name: string
  table_name: string
  rls_enabled: boolean
}

export const validateRLS: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)

  const { rows } = await context.client.query<RlsRow>(`
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
  `)

  for (const tableKey of SENSITIVE_RLS_TABLE_KEYS) {
    const table = resolved.get(tableKey)
    if (!table) {
      const requirement = getRequirement(tableKey)
      failures.push(
        fail('validateRLS', `Cannot validate RLS because table is missing: ${tableLabel(requirement, resolved)}`),
      )
      continue
    }

    const row = rows.find((entry) => entry.schema_name === table.schema && entry.table_name === table.table)
    if (!row) {
      failures.push(fail('validateRLS', `Cannot validate RLS because table metadata is missing: ${table.schema}.${table.table}`))
      continue
    }

    if (!row.rls_enabled) {
      failures.push(fail('validateRLS', `RLS disabled: ${table.schema}.${table.table}`))
    }
  }

  return failures
}


