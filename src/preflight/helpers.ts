// @ts-nocheck
import { TABLE_REQUIREMENTS } from './contracts'
import type { PreflightContext, PreflightFailure, TableRef, TableRequirement } from './types'

interface TableRow {
  table_schema: string
  table_name: string
}

interface ColumnRow {
  table_schema: string
  table_name: string
  column_name: string
  data_type: string
  udt_name: string
  is_nullable: 'YES' | 'NO'
}

interface FkRow {
  table_schema: string
  table_name: string
  column_name: string
  ref_schema: string
  ref_table: string
  ref_column: string
}

interface IndexRow {
  schema_name: string
  table_name: string
  index_name: string
  index_def: string
  columns: string[]
}

interface PolicyRow {
  schemaname: string
  tablename: string
  policyname: string
  qual: string | null
  with_check: string | null
  roles: string[] | null
}

interface FunctionRow {
  schema_name: string
  function_name: string
  arg_types: string
  result_type: string
}

interface EnumRow {
  enum_name: string
  enum_value: string
}

interface TriggerRow {
  schema_name: string
  table_name: string
  trigger_name: string
  trigger_function: string
  enabled: string
}

export function fail(module: string, message: string): PreflightFailure {
  return { module, message }
}

function key(schema: string, table: string): string {
  return `${schema}.${table}`
}

async function queryCached<T>(context: PreflightContext, cacheKey: string, loader: () => Promise<T>): Promise<T> {
  if (context.cache.has(cacheKey)) {
    return context.cache.get(cacheKey) as T
  }

  const value = await loader()
  context.cache.set(cacheKey, value)
  return value
}

export async function getTables(context: PreflightContext): Promise<TableRow[]> {
  return queryCached(context, 'tables', async () => {
    const { rows } = await context.client.query<TableRow>(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema IN ('public', 'storage', 'supabase_migrations')
    `)
    return rows
  })
}

export async function getColumns(context: PreflightContext): Promise<ColumnRow[]> {
  return queryCached(context, 'columns', async () => {
    const { rows } = await context.client.query<ColumnRow>(`
      SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'storage', 'supabase_migrations')
    `)
    return rows
  })
}

export async function getForeignKeys(context: PreflightContext): Promise<FkRow[]> {
  return queryCached(context, 'foreign_keys', async () => {
    const { rows } = await context.client.query<FkRow>(`
      SELECT
        ns.nspname AS table_schema,
        tbl.relname AS table_name,
        a.attname AS column_name,
        rns.nspname AS ref_schema,
        rel.relname AS ref_table,
        ra.attname AS ref_column
      FROM pg_constraint con
      JOIN pg_class tbl ON tbl.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      JOIN pg_class rel ON rel.oid = con.confrelid
      JOIN pg_namespace rns ON rns.oid = rel.relnamespace
      JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON TRUE
      JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
      JOIN pg_attribute a ON a.attrelid = tbl.oid AND a.attnum = ck.attnum
      JOIN pg_attribute ra ON ra.attrelid = rel.oid AND ra.attnum = fk.attnum
      WHERE con.contype = 'f'
        AND ns.nspname = 'public'
    `)

    return rows
  })
}

export async function getIndexes(context: PreflightContext): Promise<IndexRow[]> {
  return queryCached(context, 'indexes', async () => {
    const { rows } = await context.client.query<IndexRow>(`
      SELECT
        ns.nspname AS schema_name,
        tbl.relname AS table_name,
        idx.relname AS index_name,
        pg_get_indexdef(ix.indexrelid) AS index_def,
        array_remove(array_agg(att.attname ORDER BY ord.ordinality), NULL)::text[] AS columns
      FROM pg_index ix
      JOIN pg_class tbl ON tbl.oid = ix.indrelid
      JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
      JOIN pg_class idx ON idx.oid = ix.indexrelid
      LEFT JOIN unnest(ix.indkey) WITH ORDINALITY ord(attnum, ordinality) ON TRUE
      LEFT JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = ord.attnum
      WHERE ns.nspname = 'public'
      GROUP BY ns.nspname, tbl.relname, idx.relname, ix.indexrelid
    `)

    return rows
  })
}

export async function getPolicies(context: PreflightContext): Promise<PolicyRow[]> {
  return queryCached(context, 'policies', async () => {
    const { rows } = await context.client.query<PolicyRow>(`
      SELECT schemaname, tablename, policyname, qual, with_check, roles
      FROM pg_policies
      WHERE schemaname IN ('public', 'storage')
    `)

    return rows
  })
}

export async function getFunctions(context: PreflightContext): Promise<FunctionRow[]> {
  return queryCached(context, 'functions', async () => {
    const { rows } = await context.client.query<FunctionRow>(`
      SELECT
        n.nspname AS schema_name,
        p.proname AS function_name,
        pg_catalog.oidvectortypes(p.proargtypes) AS arg_types,
        pg_catalog.format_type(p.prorettype, NULL) AS result_type
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
    `)

    return rows
  })
}

export async function getEnums(context: PreflightContext): Promise<EnumRow[]> {
  return queryCached(context, 'enums', async () => {
    const { rows } = await context.client.query<EnumRow>(`
      SELECT t.typname AS enum_name, e.enumlabel AS enum_value
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `)

    return rows
  })
}

export async function getTriggers(context: PreflightContext): Promise<TriggerRow[]> {
  return queryCached(context, 'triggers', async () => {
    const { rows } = await context.client.query<TriggerRow>(`
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        tg.tgname AS trigger_name,
        p.proname AS trigger_function,
        tg.tgenabled AS enabled
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = tg.tgfoid
      WHERE NOT tg.tgisinternal
        AND n.nspname = 'public'
    `)

    return rows
  })
}

export async function resolveTables(context: PreflightContext): Promise<Map<string, TableRef>> {
  return queryCached(context, 'resolved_tables', async () => {
    const tables = await getTables(context)
    const available = new Set(tables.map((row) => key(row.table_schema, row.table_name)))

    const resolved = new Map<string, TableRef>()

    for (const requirement of TABLE_REQUIREMENTS) {
      const match = requirement.candidates.find((candidate) => available.has(key(requirement.schema, candidate)))
      if (match) {
        resolved.set(requirement.key, { schema: requirement.schema, table: match })
      }
    }

    return resolved
  })
}

export function findColumn(columns: ColumnRow[], table: TableRef, columnName: string): ColumnRow | undefined {
  return columns.find(
    (row) => row.table_schema === table.schema && row.table_name === table.table && row.column_name === columnName,
  )
}

export function normalizeActualType(column: ColumnRow): string {
  const dataType = column.data_type.toLowerCase()

  if (dataType === 'user-defined') {
    return `enum:${column.udt_name}`
  }

  if (dataType === 'array') {
    const inner = column.udt_name.startsWith('_') ? column.udt_name.slice(1) : column.udt_name
    return `array:${inner}`
  }

  if (dataType === 'timestamp with time zone') return 'timestamptz'
  if (dataType === 'timestamp without time zone') return 'timestamp'
  if (dataType === 'character varying') return 'varchar'
  if (dataType === 'double precision') return 'numeric'

  return dataType
}

export function typeMatches(actualType: string, expectedType: string): boolean {
  if (actualType === expectedType) return true

  if (expectedType === 'text') {
    return actualType === 'text' || actualType === 'varchar'
  }

  if (expectedType === 'numeric') {
    return actualType === 'numeric' || actualType === 'integer' || actualType === 'bigint' || actualType === 'real'
  }

  if (expectedType === 'date') {
    return actualType === 'date' || actualType === 'timestamp' || actualType === 'timestamptz'
  }

  return false
}

export function anyTypeMatches(actualType: string, expectedTypes: string[] | undefined): boolean {
  if (!expectedTypes || expectedTypes.length === 0) return true
  return expectedTypes.some((expected) => typeMatches(actualType, expected))
}

export function isNullableMatch(actualNullable: 'YES' | 'NO', expectedNullable: boolean | undefined): boolean {
  if (expectedNullable === undefined) return true
  const nullable = actualNullable === 'YES'
  return nullable === expectedNullable
}

export function getRequirement(keyName: string): TableRequirement {
  const requirement = TABLE_REQUIREMENTS.find((entry) => entry.key === keyName)
  if (!requirement) {
    throw new Error(`Missing table requirement: ${keyName}`)
  }

  return requirement
}

export function tableLabel(requirement: TableRequirement, resolved: Map<string, TableRef>): string {
  const table = resolved.get(requirement.key)
  if (!table) return `${requirement.schema}.${requirement.candidates[0]}`
  return `${table.schema}.${table.table}`
}


