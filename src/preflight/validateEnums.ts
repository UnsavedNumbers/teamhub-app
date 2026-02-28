// @ts-nocheck
import { ENUM_REQUIREMENTS } from './contracts'
import { fail, getEnums } from './helpers'
import type { Validator } from './types'

export const validateEnums: Validator = async (context) => {
  const failures = []
  const enums = await getEnums(context)

  const valuesByEnum = new Map<string, Set<string>>()
  for (const row of enums) {
    if (!valuesByEnum.has(row.enum_name)) {
      valuesByEnum.set(row.enum_name, new Set())
    }
    valuesByEnum.get(row.enum_name)?.add(row.enum_value)
  }

  for (const requirement of ENUM_REQUIREMENTS) {
    const enumName = requirement.enumCandidates.find((candidate) => valuesByEnum.has(candidate))

    if (!enumName) {
      if (requirement.required) {
        failures.push(fail('validateEnums', `Missing enum: {${requirement.enumCandidates.join('|')}}`))
      }
      continue
    }

    const values = valuesByEnum.get(enumName) ?? new Set<string>()
    for (const group of requirement.requiredValueGroups) {
      const matched = group.some((value) => values.has(value))
      if (!matched) {
        failures.push(
          fail(
            'validateEnums',
            `Enum value mismatch: ${enumName} missing one of [${group.join(', ')}]`,
          ),
        )
      }
    }
  }

  return failures
}


