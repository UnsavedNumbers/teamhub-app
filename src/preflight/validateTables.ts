// @ts-nocheck
import { TABLE_REQUIREMENTS } from './contracts'
import { fail, resolveTables } from './helpers'
import type { Validator } from './types'

export const validateTables: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)

  for (const requirement of TABLE_REQUIREMENTS) {
    if (!resolved.has(requirement.key) && requirement.required) {
      failures.push(
        fail('validateTables', `Missing table: ${requirement.schema}.{${requirement.candidates.join('|')}}`),
      )
    }
  }

  return failures
}


