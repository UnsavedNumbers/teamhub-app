// @ts-nocheck
/// <reference types="node" />

import type pg from 'pg'

export type PgClient = pg.Client

export interface PreflightFailure {
  module: string
  message: string
}

export interface PreflightContext {
  client: PgClient
  strict: boolean
  repoRoot: string
  migrationVersions: string[]
  cache: Map<string, unknown>
}

export type Validator = (context: PreflightContext) => Promise<PreflightFailure[]>

export interface ColumnRequirement {
  name: string
  expectedTypes?: string[]
  nullable?: boolean
}

export interface TableRequirement {
  key: string
  schema: string
  candidates: string[]
  required: boolean
  requiredColumns: ColumnRequirement[]
}

export interface ForeignKeyRequirement {
  fromTableKey: string
  fromColumn: string
  toTableKey: string
  toColumn: string
  required: boolean
}

export interface IndexRequirement {
  tableKey: string
  columns: string[]
  orderedPrefix?: boolean
  required: boolean
}

export interface RpcRequirement {
  name: string
  argTypes?: string[]
  returnTypes: string[]
  required: boolean
}

export interface EnumRequirement {
  enumCandidates: string[]
  requiredValueGroups: string[][]
  required: boolean
}

export interface TriggerRequirement {
  tableKey: string
  triggerName: string
  functionName?: string
  required: boolean
}

export interface BucketRequirement {
  logicalName: string
  candidates: string[]
  required: boolean
}

export interface TableRef {
  schema: string
  table: string
}


