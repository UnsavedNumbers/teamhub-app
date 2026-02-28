// @ts-nocheck
import { TABLE_REQUIREMENTS } from './contracts'
import {
  anyTypeMatches,
  fail,
  findColumn,
  getColumns,
  normalizeActualType,
  isNullableMatch,
  resolveTables,
  tableLabel,
} from './helpers'
import type { Validator } from './types'

export const validateColumns: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const columns = await getColumns(context)

  for (const requirement of TABLE_REQUIREMENTS) {
    const table = resolved.get(requirement.key)

    if (!table) {
      if (requirement.required) {
        failures.push(fail('validateColumns', `Cannot validate columns because table is missing: ${requirement.schema}.{${requirement.candidates.join('|')}}`))
      }
      continue
    }

    for (const columnRequirement of requirement.requiredColumns) {
      const column = findColumn(columns, table, columnRequirement.name)
      if (!column) {
        failures.push(fail('validateColumns', `Missing column: ${tableLabel(requirement, resolved)}.${columnRequirement.name}`))
        continue
      }

      const actualType = normalizeActualType(column)
      if (!anyTypeMatches(actualType, columnRequirement.expectedTypes)) {
        failures.push(
          fail(
            'validateColumns',
            `Wrong type for ${tableLabel(requirement, resolved)}.${columnRequirement.name}: expected ${columnRequirement.expectedTypes?.join(' or ')}, found ${actualType}`,
          ),
        )
      }

      if (!isNullableMatch(column.is_nullable, columnRequirement.nullable)) {
        const expected = columnRequirement.nullable ? 'nullable' : 'not null'
        const actual = column.is_nullable === 'YES' ? 'nullable' : 'not null'
        failures.push(
          fail(
            'validateColumns',
            `Nullability mismatch for ${tableLabel(requirement, resolved)}.${columnRequirement.name}: expected ${expected}, found ${actual}`,
          ),
        )
      }
    }
  }

  return failures
}


