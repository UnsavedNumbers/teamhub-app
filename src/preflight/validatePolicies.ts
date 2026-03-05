// @ts-nocheck
import { REQUIRED_POLICY_ROLE_PATTERNS, SENSITIVE_RLS_TABLE_KEYS } from './contracts'
import { fail, getPolicies, resolveTables } from './helpers'
import type { Validator } from './types'

function normalizePolicyText(policy: { policyname: string; qual: string | null; with_check: string | null; roles: string[] | null }): string {
  return [policy.policyname, policy.qual ?? '', policy.with_check ?? '', (policy.roles ?? []).join(' ')].join(' ').toLowerCase()
}

export const validatePolicies: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const policies = await getPolicies(context)

  for (const tableKey of SENSITIVE_RLS_TABLE_KEYS) {
    const table = resolved.get(tableKey)
    if (!table) continue

    const tablePolicies = policies.filter(
      (policy) => policy.schemaname === table.schema && policy.tablename === table.table,
    )

    if (tablePolicies.length === 0) {
      failures.push(fail('validatePolicies', `Missing policies: ${table.schema}.${table.table}`))
      continue
    }

    for (const policy of tablePolicies) {
      if (!policy.qual && !policy.with_check) {
        failures.push(
          fail(
            'validatePolicies',
            `Policy has empty boolean expression: ${policy.schemaname}.${policy.tablename}.${policy.policyname}`,
          ),
        )
      }
    }
  }

  const sensitivePolicies = policies.filter((policy) => policy.schemaname === 'public')
  for (const rolePattern of REQUIRED_POLICY_ROLE_PATTERNS) {
    const matched = sensitivePolicies.some((policy) => {
      const normalized = normalizePolicyText(policy)
      return rolePattern.patterns.some((pattern) => normalized.includes(pattern))
    })

    if (!matched) {
      failures.push(fail('validatePolicies', `Missing role-scoped policy pattern: ${rolePattern.role}`))
    }
  }

  return failures
}


