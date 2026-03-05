// @ts-nocheck
import { FOREIGN_KEY_REQUIREMENTS } from './contracts'
import { fail, getForeignKeys, getRequirement, resolveTables, tableLabel } from './helpers'
import type { Validator } from './types'

export const validateForeignKeys: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const foreignKeys = await getForeignKeys(context)

  for (const requirement of FOREIGN_KEY_REQUIREMENTS) {
    const source = resolved.get(requirement.fromTableKey)
    const target = resolved.get(requirement.toTableKey)

    if (!source || !target) {
      if (requirement.required) {
        const sourceReq = getRequirement(requirement.fromTableKey)
        const targetReq = getRequirement(requirement.toTableKey)
        failures.push(
          fail(
            'validateForeignKeys',
            `Cannot validate FK ${tableLabel(sourceReq, resolved)}.${requirement.fromColumn} -> ${tableLabel(targetReq, resolved)}.${requirement.toColumn} because referenced table is missing`,
          ),
        )
      }
      continue
    }

    const matched = foreignKeys.some(
      (fk) =>
        fk.table_schema === source.schema &&
        fk.table_name === source.table &&
        fk.column_name === requirement.fromColumn &&
        fk.ref_schema === target.schema &&
        fk.ref_table === target.table &&
        fk.ref_column === requirement.toColumn,
    )

    if (!matched && requirement.required) {
      failures.push(
        fail(
          'validateForeignKeys',
          `Missing foreign key: ${source.schema}.${source.table}.${requirement.fromColumn} -> ${target.schema}.${target.table}.${requirement.toColumn}`,
        ),
      )
    }
  }

  return failures
}


