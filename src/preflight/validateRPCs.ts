// @ts-nocheck
import { RPC_REQUIREMENTS } from './contracts'
import { fail, getFunctions } from './helpers'
import type { Validator } from './types'

function normalizeArgs(args: string): string[] {
  const normalized = args.trim()
  if (!normalized) return []
  return normalized.split(',').map((value) => value.trim().toLowerCase())
}

export const validateRPCs: Validator = async (context) => {
  const failures = []
  const functions = await getFunctions(context)

  for (const requirement of RPC_REQUIREMENTS) {
    const candidates = functions.filter((entry) => entry.function_name === requirement.name)

    if (candidates.length === 0) {
      if (requirement.required) {
        failures.push(fail('validateRPCs', `Missing RPC: ${requirement.name}`))
      }
      continue
    }

    let signatureMatched = false
    let returnMatched = false

    for (const candidate of candidates) {
      const candidateArgs = normalizeArgs(candidate.arg_types)
      const candidateReturn = candidate.result_type.toLowerCase()

      const argsOk = !requirement.argTypes || requirement.argTypes.every((arg, index) => candidateArgs[index] === arg)
      const returnOk = requirement.returnTypes.includes(candidateReturn)

      if (argsOk) signatureMatched = true
      if (returnOk) returnMatched = true

      if (argsOk && returnOk) {
        signatureMatched = true
        returnMatched = true
        break
      }
    }

    if (!signatureMatched && requirement.argTypes) {
      failures.push(
        fail(
          'validateRPCs',
          `RPC signature mismatch: ${requirement.name}(${requirement.argTypes.join(', ')})`,
        ),
      )
    }

    if (!returnMatched) {
      failures.push(
        fail(
          'validateRPCs',
          `RPC return type mismatch: ${requirement.name} expected ${requirement.returnTypes.join(' or ')}`,
        ),
      )
    }
  }

  return failures
}


