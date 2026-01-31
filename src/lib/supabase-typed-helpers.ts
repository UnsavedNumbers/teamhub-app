import type { SupabaseExtended } from './supabase.extended.types'

type Tables = SupabaseExtended['public']['Tables']
type Functions = SupabaseExtended['public']['Functions']

export type TableName = keyof Tables
export type FunctionName = keyof Functions

export type TableRow<T extends TableName> = Tables[T]['Row']
export type TableInsert<T extends TableName> = Tables[T]['Insert']
export type TableUpdate<T extends TableName> = Tables[T]['Update']

export type FunctionArgs<T extends FunctionName> = Functions[T]['Args']
export type FunctionReturn<T extends FunctionName> = Functions[T]['Returns']

export type QueryResult<T> = { data: T | null; error: Error | null }
export type MutationResult = { error: Error | null }
export type MutationResultWithData<T> = { data: T | null; error: Error | null }

type PartialUpdate<T> = {
  [P in keyof T]?: T[P]
}

export function asTableRow<T extends TableName>(data: unknown): TableRow<T> {
  return data as TableRow<T>
}

export function asTableRows<T extends TableName>(data: unknown): TableRow<T>[] {
  return (data || []) as TableRow<T>[]
}

export function asUpdateData<T extends TableName>(data: PartialUpdate<TableUpdate<T>>): TableUpdate<T> {
  return data as TableUpdate<T>
}

export function asInsertData<T extends TableName>(data: Partial<TableInsert<T>>): TableInsert<T> {
  return data as TableInsert<T>
}

export function asFunctionArgs<T extends FunctionName>(args: Record<string, unknown>): FunctionArgs<T> {
  return args as FunctionArgs<T>
}
