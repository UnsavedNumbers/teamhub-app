// @ts-nocheck
import { DEFAULT_TIER_KEYS } from './contracts'
import { fail, getColumns, getFunctions, resolveTables } from './helpers'
import type { Validator } from './types'

export const validateTierSystem: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const columns = await getColumns(context)
  const functions = await getFunctions(context)

  const orgs = resolved.get('orgs')
  const tiers = resolved.get('tiers')
  const tierFeatures = resolved.get('tier_features')
  const featureEntitlements = resolved.get('feature_entitlements')

  if (!orgs || !tiers || !tierFeatures || !featureEntitlements) {
    failures.push(fail('validateTierSystem', 'Cannot validate tier system because required tables are missing'))
    return failures
  }

  const requiredOrgColumns = ['current_tier_id', 'is_demo_org']
  for (const columnName of requiredOrgColumns) {
    const exists = columns.some(
      (column) =>
        column.table_schema === orgs.schema &&
        column.table_name === orgs.table &&
        column.column_name === columnName,
    )
    if (!exists) {
      failures.push(fail('validateTierSystem', `Missing tier/demo safety field: ${orgs.schema}.${orgs.table}.${columnName}`))
    }
  }

  const requiredTierFeatureColumns = ['included', 'role_admin', 'role_coach', 'role_parent']
  for (const columnName of requiredTierFeatureColumns) {
    const exists = columns.some(
      (column) =>
        column.table_schema === tierFeatures.schema &&
        column.table_name === tierFeatures.table &&
        column.column_name === columnName,
    )
    if (!exists) {
      failures.push(
        fail('validateTierSystem', `Missing feature-gating column: ${tierFeatures.schema}.${tierFeatures.table}.${columnName}`),
      )
    }
  }

  const requiredEntitlementColumns = ['feature_key', 'platform_admin_only', 'excluded_from_discovery']
  for (const columnName of requiredEntitlementColumns) {
    const exists = columns.some(
      (column) =>
        column.table_schema === featureEntitlements.schema &&
        column.table_name === featureEntitlements.table &&
        column.column_name === columnName,
    )
    if (!exists) {
      failures.push(
        fail('validateTierSystem', `Missing entitlement safety field: ${featureEntitlements.schema}.${featureEntitlements.table}.${columnName}`),
      )
    }
  }

  const { rows: tierRows } = await context.client.query<{ tier_key: string }>(
    `SELECT tier_key FROM ${tiers.schema}.${tiers.table} WHERE status = 'active'`,
  )
  const tierSet = new Set(tierRows.map((row) => row.tier_key))
  for (const tierKey of DEFAULT_TIER_KEYS) {
    if (!tierSet.has(tierKey)) {
      failures.push(fail('validateTierSystem', `Missing default tier key: ${tierKey}`))
    }
  }

  const hasFeatureGateRpc = functions.some(
    (fn) => fn.function_name === 'get_feature_gate' && fn.arg_types.startsWith('uuid, uuid, text'),
  )

  if (!hasFeatureGateRpc) {
    failures.push(fail('validateTierSystem', 'Missing feature gate RPC: get_feature_gate(uuid, uuid, text)'))
  }

  return failures
}


