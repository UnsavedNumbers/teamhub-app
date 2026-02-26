import { describe, it } from 'vitest'

import { seeded, clients } from '../setup'
import {
  expectSelectAllowed,
  expectSelectDenied,
  expectWriteAllowed,
  expectWriteDenied,
  getServiceClient,
} from '../helpers'

describe('messaging_policy_tables', () => {
  describe('organization_messaging_settings', () => {
    it('org_admin CAN upsert org messaging settings', async () => {
      const result = await clients.orgAdmin
        .from('organization_messaging_settings')
        .upsert({
          org_id: seeded.orgId,
          settings_version: 2,
          enable_parent_to_parent_dms: true,
          enable_minor_to_minor_dms: true,
          require_parent_approval_for_minor_dm: false,
          enable_admin_audit_access: true,
          enable_minor_group_parent_visibility: true,
          require_read_receipts_safety_critical: false,
          retention_days: 730,
        }, { onConflict: 'org_id' })
        .select()

      expectWriteAllowed(result)
    })

    it('parent CANNOT update org messaging settings', async () => {
      const result = await clients.parent
        .from('organization_messaging_settings')
        .upsert({
          org_id: seeded.orgId,
          settings_version: 99,
        }, { onConflict: 'org_id' })
        .select()

      expectWriteDenied(result, 'either')
    })
  })

  describe('dm_user_blocks', () => {
    it('parent CAN block coach within org', async () => {
      const result = await clients.parent
        .from('dm_user_blocks')
        .upsert({
          org_id: seeded.orgId,
          blocker_user_id: seeded.userIds.parent,
          blocked_user_id: seeded.userIds.coach,
          reason: 'contract-test',
          is_active: true,
        }, { onConflict: 'org_id,blocker_user_id,blocked_user_id' })
        .select()

      expectWriteAllowed(result)
    })

    it('parent CANNOT spoof another blocker_user_id', async () => {
      const result = await clients.parent
        .from('dm_user_blocks')
        .insert({
          org_id: seeded.orgId,
          blocker_user_id: seeded.userIds.coach,
          blocked_user_id: seeded.userIds.parent,
          reason: 'spoof-attempt',
          is_active: true,
        })
        .select()

      expectWriteDenied(result, 'either')
    })

    it('org_admin CAN read dm block rows in org', async () => {
      const result = await clients.orgAdmin
        .from('dm_user_blocks')
        .select('*')
        .eq('org_id', seeded.orgId)

      expectSelectAllowed(result)
    })

    it('fan CANNOT read dm block rows in org', async () => {
      const svc = getServiceClient()
      const { data: block } = await svc
        .from('dm_user_blocks')
        .upsert({
          org_id: seeded.orgId,
          blocker_user_id: seeded.userIds.parent,
          blocked_user_id: seeded.userIds.coach,
          reason: 'fan-deny-check',
          is_active: true,
        }, { onConflict: 'org_id,blocker_user_id,blocked_user_id' })
        .select('id')
        .single()

      if (!block?.id) {
        throw new Error('Failed to seed dm_user_blocks row for fan-deny test')
      }

      const result = await clients.fan
        .from('dm_user_blocks')
        .select('*')
        .eq('id', block.id)

      expectSelectDenied(result, [block.id], 'either')
    })
  })

  describe('athlete_messaging_preferences', () => {
    it('guardian parent CAN upsert preferences for linked athlete', async () => {
      const result = await clients.parent
        .from('athlete_messaging_preferences')
        .upsert({
          athlete_id: seeded.athleteId,
          maintain_parent_visibility_until_season_end: true,
        }, { onConflict: 'athlete_id' })
        .select()

      expectWriteAllowed(result)
    })

    it('fan CANNOT upsert preferences for org athlete', async () => {
      const result = await clients.fan
        .from('athlete_messaging_preferences')
        .upsert({
          athlete_id: seeded.athleteId,
          maintain_parent_visibility_until_season_end: false,
        }, { onConflict: 'athlete_id' })
        .select()

      expectWriteDenied(result, 'either')
    })
  })

  it('cleanup seeded messaging policy rows', async () => {
    const svc = getServiceClient()

    await svc
      .from('dm_user_blocks')
      .delete()
      .eq('org_id', seeded.orgId)

    await svc
      .from('athlete_messaging_preferences')
      .delete()
      .eq('athlete_id', seeded.athleteId)
  })
})
