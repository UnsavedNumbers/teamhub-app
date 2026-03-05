import { describe, expect, it } from 'vitest'

import { evaluateDmAttempt } from './dmPolicyEngine'
import { DEFAULT_ORG_MESSAGING_SETTINGS, type DmPolicyInput } from './dmPolicyTypes'

function createInput(overrides: Partial<DmPolicyInput> = {}): DmPolicyInput {
  return {
    actor_user_id: 'actor-user',
    recipient_user_id: 'recipient-user',
    org_id: 'org-1',
    channel_mode: 'dm',
    acting_role_context: 'coach',
    recipient_role_context: 'parent',
    org_settings: {
      org_id: 'org-1',
      ...DEFAULT_ORG_MESSAGING_SETTINGS,
    },
    ...overrides,
  }
}

describe('evaluateDmAttempt', () => {
  it('allows coach to parent direct messages', () => {
    const result = evaluateDmAttempt(createInput())

    expect(result.allowed).toBe(true)
    expect(result.reason_code).toBe('ALLOWED')
    expect(result.requires_parental_copy_notice).toBe(false)
  })

  it('allows coach to minor athlete and copies guardians', () => {
    const result = evaluateDmAttempt(createInput({
      recipient_role_context: 'athlete_minor',
      recipient_guardian_user_ids: ['guardian-1', 'guardian-2'],
    }))

    expect(result.allowed).toBe(true)
    expect(result.guardian_copy_targets).toEqual(['guardian-1', 'guardian-2'])
    expect(result.requires_parental_copy_notice).toBe(true)
  })

  it('denies parent to non-own minor athlete', () => {
    const result = evaluateDmAttempt(createInput({
      acting_role_context: 'parent',
      recipient_role_context: 'athlete_minor',
      is_own_child: false,
    }))

    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('PARENT_TO_OTHER_MINOR_DENIED')
  })

  it('allows minor athlete to coach and copies actor guardians', () => {
    const result = evaluateDmAttempt(createInput({
      acting_role_context: 'athlete_minor',
      recipient_role_context: 'coach',
      actor_guardian_user_ids: ['guardian-actor'],
    }))

    expect(result.allowed).toBe(true)
    expect(result.guardian_copy_targets).toEqual(['guardian-actor'])
    expect(result.requires_parental_copy_notice).toBe(true)
  })

  it('denies minor to minor cross-team direct messages', () => {
    const result = evaluateDmAttempt(createInput({
      acting_role_context: 'athlete_minor',
      recipient_role_context: 'athlete_minor',
      is_same_team: false,
    }))

    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('MINOR_CROSS_TEAM_DENIED')
  })

  it('denies minor to minor messages when disabled by org settings', () => {
    const result = evaluateDmAttempt(createInput({
      acting_role_context: 'athlete_minor',
      recipient_role_context: 'athlete_minor',
      is_same_team: true,
      org_settings: {
        org_id: 'org-1',
        ...DEFAULT_ORG_MESSAGING_SETTINGS,
        enable_minor_to_minor_dms: false,
      },
    }))

    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('ATHLETE_DM_DISABLED_BY_ORG')
  })

  it('denies adult athlete to minor athlete', () => {
    const result = evaluateDmAttempt(createInput({
      acting_role_context: 'athlete_adult',
      recipient_role_context: 'athlete_minor',
    }))

    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('ADULT_TO_NON_OWN_MINOR_DENIED')
  })

  it('allows adult athlete to adult athlete', () => {
    const result = evaluateDmAttempt(createInput({
      acting_role_context: 'athlete_adult',
      recipient_role_context: 'athlete_adult',
    }))

    expect(result.allowed).toBe(true)
    expect(result.reason_code).toBe('ALLOWED')
  })

  it('denies self direct message attempts', () => {
    const result = evaluateDmAttempt(createInput({
      actor_user_id: 'same-user',
      recipient_user_id: 'same-user',
    }))

    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('SELF_DM_NOT_ALLOWED')
  })

  it('denies if either participant has blocked the other', () => {
    const result = evaluateDmAttempt(createInput({
      block_state: {
        blocked_by_actor: true,
      },
    }))

    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('BLOCKED_BY_USER')
  })

  it('denies parent to parent when org disables it', () => {
    const result = evaluateDmAttempt(createInput({
      acting_role_context: 'parent',
      recipient_role_context: 'parent',
      org_settings: {
        org_id: 'org-1',
        ...DEFAULT_ORG_MESSAGING_SETTINGS,
        enable_parent_to_parent_dms: false,
      },
    }))

    expect(result.allowed).toBe(false)
    expect(result.reason_code).toBe('PARENT_TO_PARENT_DISABLED_BY_ORG')
  })
})
