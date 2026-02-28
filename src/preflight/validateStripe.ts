// @ts-nocheck
/// <reference types="node" />

import fs from 'node:fs'
import path from 'node:path'

import { DEFAULT_TIER_KEYS, STRIPE_ENV_VARS } from './contracts'
import { fail, getColumns, resolveTables } from './helpers'
import type { Validator } from './types'

export const validateStripe: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const columns = await getColumns(context)

  const orgLicenses = resolved.get('org_licenses')
  const orgs = resolved.get('orgs')
  const tiers = resolved.get('tiers')
  const tierFeatures = resolved.get('tier_features')

  if (!orgLicenses || !orgs || !tiers || !tierFeatures) {
    failures.push(fail('validateStripe', 'Cannot validate Stripe wiring because required billing tables are missing'))
    return failures
  }

  const requiredColumns = [
    `${orgLicenses.schema}.${orgLicenses.table}.stripe_customer_id`,
    `${orgLicenses.schema}.${orgLicenses.table}.stripe_subscription_id`,
    `${orgs.schema}.${orgs.table}.current_tier_id`,
  ]

  for (const label of requiredColumns) {
    const [schema, table, column] = label.split('.')
    const exists = columns.some(
      (entry) => entry.table_schema === schema && entry.table_name === table && entry.column_name === column,
    )
    if (!exists) {
      failures.push(fail('validateStripe', `Missing Stripe-critical field: ${label}`))
    }
  }

  const { rows: tierRows } = await context.client.query<{ tier_key: string }>(
    `SELECT tier_key FROM ${tiers.schema}.${tiers.table} WHERE status = 'active'`,
  )
  const tierSet = new Set(tierRows.map((row) => row.tier_key))

  for (const tierKey of DEFAULT_TIER_KEYS) {
    if (!tierSet.has(tierKey)) {
      failures.push(fail('validateStripe', `Missing default tier row: ${tiers.schema}.${tiers.table}.tier_key='${tierKey}'`))
    }
  }

  const { rows: featureRows } = await context.client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${tierFeatures.schema}.${tierFeatures.table}`,
  )
  const assignmentCount = Number(featureRows[0]?.count ?? '0')
  if (!Number.isFinite(assignmentCount) || assignmentCount <= 0) {
    failures.push(fail('validateStripe', `Missing tier feature assignments in ${tierFeatures.schema}.${tierFeatures.table}`))
  }

  for (const envVar of STRIPE_ENV_VARS) {
    if (!process.env[envVar]) {
      failures.push(fail('validateStripe', `Missing environment variable: ${envVar}`))
    }
  }

  const webhookFunctionPath = path.join(context.repoRoot, 'supabase', 'functions', 'stripe-webhook', 'index.ts')
  if (!fs.existsSync(webhookFunctionPath)) {
    failures.push(fail('validateStripe', 'Stripe webhook function missing: supabase/functions/stripe-webhook/index.ts'))
  }

  return failures
}


