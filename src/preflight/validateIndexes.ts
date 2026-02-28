// @ts-nocheck
import { INDEX_REQUIREMENTS } from './contracts'
import { fail, getIndexes, getRequirement, resolveTables, tableLabel } from './helpers'
import type { Validator } from './types'

function matchesColumns(actualColumns: string[], requiredColumns: string[], orderedPrefix: boolean): boolean {
  if (requiredColumns.length === 0) return true

  if (orderedPrefix) {
    if (actualColumns.length < requiredColumns.length) return false
    return requiredColumns.every((column, index) => actualColumns[index] === column)
  }

  return requiredColumns.every((column) => actualColumns.includes(column))
}

export const validateIndexes: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const indexes = await getIndexes(context)

  for (const requirement of INDEX_REQUIREMENTS) {
    const table = resolved.get(requirement.tableKey)

    if (!table) {
      if (requirement.required) {
        const tableReq = getRequirement(requirement.tableKey)
        failures.push(
          fail(
            'validateIndexes',
            `Cannot validate index because table is missing: ${tableLabel(tableReq, resolved)}`,
          ),
        )
      }
      continue
    }

    const tableIndexes = indexes.filter((index) => index.schema_name === table.schema && index.table_name === table.table)
    const matched = tableIndexes.some((index) =>
      matchesColumns(index.columns, requirement.columns, requirement.orderedPrefix ?? false),
    )

    if (!matched && requirement.required) {
      failures.push(
        fail(
          'validateIndexes',
          `Missing index: ${table.schema}.${table.table}(${requirement.columns.join(', ')})`,
        ),
      )
    }
  }

  return failures
}


