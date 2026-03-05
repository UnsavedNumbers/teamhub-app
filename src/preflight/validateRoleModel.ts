// @ts-nocheck
import { ROLE_REQUIREMENTS } from './contracts'
import { fail, getEnums, resolveTables } from './helpers'
import type { Validator } from './types'

interface UniqueConstraintRow {
  schema_name: string
  table_name: string
  columns: string[]
}

export const validateRoleModel: Validator = async (context) => {
  const failures = []
  const resolved = await resolveTables(context)
  const enums = await getEnums(context)

  const enumMap = new Map<string, Set<string>>()
  for (const row of enums) {
    if (!enumMap.has(row.enum_name)) {
      enumMap.set(row.enum_name, new Set())
    }
    enumMap.get(row.enum_name)?.add(row.enum_value)
  }

  const orgMemberRole = enumMap.get('org_member_role') ?? new Set<string>()
  const userRole = enumMap.get('user_role') ?? new Set<string>()
  const platformRole = enumMap.get('platform_admin_role') ?? new Set<string>()

  const roleCoverage = new Map<string, boolean>()
  roleCoverage.set('platform_admin', userRole.has('platform_admin') || platformRole.size > 0)
  roleCoverage.set('org_admin', userRole.has('org_admin') || orgMemberRole.has('org_admin'))
  roleCoverage.set('coach', userRole.has('coach') || orgMemberRole.has('coach'))
  roleCoverage.set('staff', orgMemberRole.has('staff'))
  roleCoverage.set('guardian', userRole.has('parent') || userRole.has('guardian') || orgMemberRole.has('parent') || orgMemberRole.has('guardian'))
  roleCoverage.set('athlete', resolved.has('athletes'))
  roleCoverage.set('fan', userRole.has('fan') || resolved.has('fan_org_follows'))

  for (const role of ROLE_REQUIREMENTS) {
    if (!roleCoverage.get(role)) {
      failures.push(fail('validateRoleModel', `Missing role support: ${role}`))
    }
  }

  const orgMemberships = resolved.get('org_memberships')
  if (!orgMemberships) {
    failures.push(fail('validateRoleModel', 'Missing org memberships table for multi-role validation'))
    return failures
  }

  const { rows: uniqueConstraints } = await context.client.query<UniqueConstraintRow>(`
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      array_agg(a.attname ORDER BY u.ordinality)::text[] AS columns
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ordinality) ON TRUE
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = u.attnum
    WHERE con.contype = 'u'
      AND n.nspname = $1
      AND c.relname = $2
    GROUP BY n.nspname, c.relname, con.conname
  `, [orgMemberships.schema, orgMemberships.table])

  const singleRoleConstraint = uniqueConstraints.some(
    (constraint) => constraint.columns.length === 2 && constraint.columns[0] === 'org_id' && constraint.columns[1] === 'user_id',
  )

  if (singleRoleConstraint) {
    failures.push(
      fail(
        'validateRoleModel',
        `Org membership uniqueness prevents multi-role support: ${orgMemberships.schema}.${orgMemberships.table}(org_id, user_id)`,
      ),
    )
  }

  return failures
}


