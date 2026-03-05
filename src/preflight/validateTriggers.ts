// @ts-nocheck
import { TRIGGER_REQUIREMENTS } from './contracts'
import { fail, resolveTables, getTriggers } from './helpers'
import type { Validator } from './types'

export const validateTriggers: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const triggers = await getTriggers(context)

  for (const requirement of TRIGGER_REQUIREMENTS) {
    const table = resolved.get(requirement.tableKey)

    if (!table) {
      if (requirement.required) {
        failures.push(
          fail('validateTriggers', `Cannot validate trigger because table is missing: ${requirement.tableKey}`),
        )
      }
      continue
    }

    const trigger = triggers.find(
      (entry) =>
        entry.schema_name === table.schema &&
        entry.table_name === table.table &&
        entry.trigger_name === requirement.triggerName,
    )

    if (!trigger) {
      if (requirement.required) {
        failures.push(
          fail('validateTriggers', `Missing trigger: ${table.schema}.${table.table}.${requirement.triggerName}`),
        )
      }
      continue
    }

    if (requirement.functionName && trigger.trigger_function !== requirement.functionName) {
      failures.push(
        fail(
          'validateTriggers',
          `Trigger function mismatch: ${table.schema}.${table.table}.${requirement.triggerName} expected ${requirement.functionName}, found ${trigger.trigger_function}`,
        ),
      )
    }

    if (trigger.enabled === 'D') {
      failures.push(
        fail('validateTriggers', `Trigger disabled: ${table.schema}.${table.table}.${requirement.triggerName}`),
      )
    }
  }

  return failures
}


