import { describe, it, expect } from 'vitest'
import { seeded, clients } from '../setup'

describe('dashboard aggregate RPCs', () => {
  it('org_admin CAN call get_org_dashboard_kpis', async () => {
    const result = await clients.orgAdmin.rpc('get_org_dashboard_kpis', {
      org_id: seeded.orgId,
    })
    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
  })

  it('fan CANNOT call get_org_dashboard_kpis', async () => {
    const result = await clients.fan.rpc('get_org_dashboard_kpis', {
      org_id: seeded.orgId,
    })
    expect(result.error).not.toBeNull()
  })

  it('coach CAN call get_coach_team_kpis for self', async () => {
    const result = await clients.coach.rpc('get_coach_team_kpis', {
      org_id: seeded.orgId,
      coach_user_id: seeded.userIds.coach,
    })
    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
  })

  it('coach CAN call get_attendance_summary for own org team scope', async () => {
    const result = await clients.coach.rpc('get_attendance_summary', {
      org_id: seeded.orgId,
      team_ids: [seeded.teamId],
      date_range: {
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      },
    })
    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
  })

  it('org_admin CAN call get_ticketing_summary', async () => {
    const result = await clients.orgAdmin.rpc('get_ticketing_summary', {
      org_id: seeded.orgId,
      date_range: {
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      },
    })
    expect(result.error).toBeNull()
    expect(result.data).toBeTruthy()
  })

  it('fan CANNOT call get_ticketing_summary', async () => {
    const result = await clients.fan.rpc('get_ticketing_summary', {
      org_id: seeded.orgId,
      date_range: {
        start: '2026-01-01T00:00:00Z',
        end: '2026-12-31T23:59:59Z',
      },
    })
    expect(result.error).not.toBeNull()
  })
})
