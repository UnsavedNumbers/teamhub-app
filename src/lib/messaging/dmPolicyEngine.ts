import {
  DEFAULT_ORG_MESSAGING_SETTINGS,
  POLICY_VERSION,
  type DmPolicyDecision,
  type DmPolicyInput,
  type DmReasonCode,
  type MessagingRoleContext,
} from './dmPolicyTypes'

const RULE_IDS = {
  blocked: 'DM-000-BLOCKED',
  restricted: 'DM-000-RESTRICTED',
  selfDm: 'DM-000-SELF',
  parentToParentAllowed: 'DM-101-PARENT-PARENT-ALLOW',
  parentToParentDisabled: 'DM-102-PARENT-PARENT-DISABLED',
  parentToCoach: 'DM-110-PARENT-COACH-ALLOW',
  parentToOtherMinorDenied: 'DM-120-PARENT-OTHER-MINOR-DENY',
  parentToOwnMinor: 'DM-121-PARENT-OWN-MINOR-ALLOW',
  coachToParent: 'DM-130-COACH-PARENT-ALLOW',
  coachToMinor: 'DM-131-ADULT-MINOR-GUARDIAN-COPY',
  coachToAdultAthlete: 'DM-132-COACH-ADULT-ALLOW',
  orgAdminToAny: 'DM-140-ORG-ADMIN-ALLOW',
  orgAdminToMinor: 'DM-141-ORG-ADMIN-MINOR-GUARDIAN-COPY',
  minorToCoach: 'DM-150-MINOR-COACH-GUARDIAN-COPY',
  minorToMinorSameTeam: 'DM-151-MINOR-MINOR-SAME-TEAM-ALLOW',
  minorToMinorDisabled: 'DM-152-MINOR-MINOR-DISABLED',
  minorCrossTeamDenied: 'DM-153-MINOR-MINOR-CROSS-TEAM-DENY',
  minorToOwnParent: 'DM-154-MINOR-OWN-GUARDIAN-ALLOW',
  adultToMinorDenied: 'DM-160-ADULT-TO-MINOR-DENY',
  adultAthleteToAdultAthlete: 'DM-161-ADULT-ATHLETE-ALLOW',
  fallbackDenied: 'DM-999-DENY',
} as const

function createDecisionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `decision-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function stableHash(value: unknown): string {
  const json = JSON.stringify(value)
  let hash = 0

  for (let i = 0; i < json.length; i += 1) {
    hash = (hash << 5) - hash + json.charCodeAt(i)
    hash |= 0
  }

  return `h${Math.abs(hash)}`
}

function uniqueUsers(values: Array<string | null | undefined> | undefined): string[] {
  return Array.from(new Set((values ?? []).filter((value): value is string => !!value && value.length > 0)))
}

function buildDecision(
  input: DmPolicyInput,
  params: {
    allowed: boolean
    ruleId: string
    reasonCode: DmReasonCode
    guardianTargets?: string[]
  },
): DmPolicyDecision {
  const guardianTargets = uniqueUsers(params.guardianTargets ?? [])
  const baseRecipients = uniqueUsers([input.actor_user_id, input.recipient_user_id])
  const finalRecipients = uniqueUsers([...baseRecipients, ...guardianTargets])
  const visibilityMode = guardianTargets.length > 0 ? 'guardian_full_thread' : 'standard'

  const settingsToHash = {
    ...DEFAULT_ORG_MESSAGING_SETTINGS,
    ...input.org_settings,
  }

  return {
    allowed: params.allowed,
    decision_id: createDecisionId(),
    rule_id: params.ruleId,
    reason_code: params.reasonCode,
    policy_version: POLICY_VERSION,
    effective_settings_hash: stableHash(settingsToHash),
    final_recipients: params.allowed ? finalRecipients : baseRecipients,
    guardian_copy_targets: params.allowed ? guardianTargets : [],
    visibility_mode: visibilityMode,
    requires_parental_copy_notice: params.allowed && guardianTargets.length > 0,
  }
}

const ADULT_STAFF_ROLES: MessagingRoleContext[] = [
  'coach',
  'assistant_coach',
  'team_manager',
  'staff',
  'org_admin',
  'system_admin',
]

function isParentLike(role: MessagingRoleContext): boolean {
  return role === 'parent' || role === 'guardian'
}

function isMinorAthlete(role: MessagingRoleContext): boolean {
  return role === 'athlete_minor'
}

function isAdultAthlete(role: MessagingRoleContext): boolean {
  return role === 'athlete_adult'
}

export function evaluateDmAttempt(input: DmPolicyInput): DmPolicyDecision {
  if (input.actor_user_id === input.recipient_user_id) {
    return buildDecision(input, {
      allowed: false,
      ruleId: RULE_IDS.selfDm,
      reasonCode: 'SELF_DM_NOT_ALLOWED',
    })
  }

  if (input.block_state?.blocked_by_actor || input.block_state?.blocked_by_recipient) {
    return buildDecision(input, {
      allowed: false,
      ruleId: RULE_IDS.blocked,
      reasonCode: 'BLOCKED_BY_USER',
    })
  }

  if (input.block_state?.actor_restricted || input.block_state?.recipient_restricted) {
    return buildDecision(input, {
      allowed: false,
      ruleId: RULE_IDS.restricted,
      reasonCode: 'RESTRICTED_BY_ADMIN',
    })
  }

  const actorRole = input.acting_role_context
  const recipientRole = input.recipient_role_context

  const actorGuardians = uniqueUsers(input.actor_guardian_user_ids)
  const recipientGuardians = uniqueUsers(input.recipient_guardian_user_ids)

  if (actorRole === 'unknown' || recipientRole === 'unknown') {
    return buildDecision(input, {
      allowed: false,
      ruleId: RULE_IDS.fallbackDenied,
      reasonCode: 'ROLE_CONTEXT_INVALID',
    })
  }

  if (ADULT_STAFF_ROLES.includes(actorRole) && ADULT_STAFF_ROLES.includes(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.orgAdminToAny,
      reasonCode: 'ALLOWED',
    })
  }

  if ((actorRole === 'org_admin' || actorRole === 'system_admin') && isMinorAthlete(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.orgAdminToMinor,
      reasonCode: 'ALLOWED',
      guardianTargets: recipientGuardians,
    })
  }

  if (ADULT_STAFF_ROLES.includes(actorRole) && isParentLike(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.coachToParent,
      reasonCode: 'ALLOWED',
    })
  }

  if (isParentLike(actorRole) && ADULT_STAFF_ROLES.includes(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.parentToCoach,
      reasonCode: 'ALLOWED',
    })
  }

  if (isParentLike(actorRole) && isParentLike(recipientRole)) {
    if (!input.org_settings.enable_parent_to_parent_dms) {
      return buildDecision(input, {
        allowed: false,
        ruleId: RULE_IDS.parentToParentDisabled,
        reasonCode: 'PARENT_TO_PARENT_DISABLED_BY_ORG',
      })
    }

    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.parentToParentAllowed,
      reasonCode: 'ALLOWED',
    })
  }

  if (isParentLike(actorRole) && isMinorAthlete(recipientRole)) {
    if (!input.is_own_child) {
      return buildDecision(input, {
        allowed: false,
        ruleId: RULE_IDS.parentToOtherMinorDenied,
        reasonCode: 'PARENT_TO_OTHER_MINOR_DENIED',
      })
    }

    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.parentToOwnMinor,
      reasonCode: 'ALLOWED',
    })
  }

  if (ADULT_STAFF_ROLES.includes(actorRole) && isMinorAthlete(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.coachToMinor,
      reasonCode: 'ALLOWED',
      guardianTargets: recipientGuardians,
    })
  }

  if (ADULT_STAFF_ROLES.includes(actorRole) && isAdultAthlete(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.coachToAdultAthlete,
      reasonCode: 'ALLOWED',
    })
  }

  if (isMinorAthlete(actorRole) && ADULT_STAFF_ROLES.includes(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.minorToCoach,
      reasonCode: 'ALLOWED',
      guardianTargets: actorGuardians,
    })
  }

  if (isMinorAthlete(actorRole) && isMinorAthlete(recipientRole)) {
    if (!input.org_settings.enable_minor_to_minor_dms) {
      return buildDecision(input, {
        allowed: false,
        ruleId: RULE_IDS.minorToMinorDisabled,
        reasonCode: 'ATHLETE_DM_DISABLED_BY_ORG',
      })
    }

    if (!input.is_same_team) {
      return buildDecision(input, {
        allowed: false,
        ruleId: RULE_IDS.minorCrossTeamDenied,
        reasonCode: 'MINOR_CROSS_TEAM_DENIED',
      })
    }

    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.minorToMinorSameTeam,
      reasonCode: 'ALLOWED',
    })
  }

  if (isMinorAthlete(actorRole) && isParentLike(recipientRole) && input.is_own_guardian) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.minorToOwnParent,
      reasonCode: 'ALLOWED',
    })
  }

  if (isAdultAthlete(actorRole) && isMinorAthlete(recipientRole)) {
    return buildDecision(input, {
      allowed: false,
      ruleId: RULE_IDS.adultToMinorDenied,
      reasonCode: 'ADULT_TO_NON_OWN_MINOR_DENIED',
    })
  }

  if (isAdultAthlete(actorRole) && isAdultAthlete(recipientRole)) {
    return buildDecision(input, {
      allowed: true,
      ruleId: RULE_IDS.adultAthleteToAdultAthlete,
      reasonCode: 'ALLOWED',
    })
  }

  return buildDecision(input, {
    allowed: false,
    ruleId: RULE_IDS.fallbackDenied,
    reasonCode: 'ROLE_CONTEXT_INVALID',
  })
}
