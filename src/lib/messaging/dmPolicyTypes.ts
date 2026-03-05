export type ChannelMode = 'dm' | 'group'

export type MessagingRoleContext =
  | 'parent'
  | 'guardian'
  | 'coach'
  | 'assistant_coach'
  | 'team_manager'
  | 'staff'
  | 'org_admin'
  | 'system_admin'
  | 'athlete_minor'
  | 'athlete_adult'
  | 'fan'
  | 'unknown'

export type DmReasonCode =
  | 'ALLOWED'
  | 'ADULT_TO_NON_OWN_MINOR_DENIED'
  | 'MINOR_CROSS_TEAM_DENIED'
  | 'PARENT_TO_OTHER_MINOR_DENIED'
  | 'ATHLETE_DM_DISABLED_BY_ORG'
  | 'PARENT_TO_PARENT_DISABLED_BY_ORG'
  | 'BLOCKED_BY_USER'
  | 'RESTRICTED_BY_ADMIN'
  | 'ROLE_CONTEXT_INVALID'
  | 'SELF_DM_NOT_ALLOWED'

export type GuardianCopyMode = 'none' | 'recipient_guardians' | 'actor_guardians' | 'both'

export interface OrganizationMessagingSettings {
  org_id: string
  settings_version: number
  effective_from: string
  precedence_contract: {
    platform_floor: 'enforced'
    org_policy: 'authoritative'
    user_preference: 'allowed_when_safe'
  }
  enable_parent_to_parent_dms: boolean
  enable_minor_to_minor_dms: boolean
  require_parent_approval_for_minor_dm: boolean
  enable_admin_audit_access: boolean
  enable_minor_group_parent_visibility: boolean
  require_read_receipts_safety_critical: boolean
  retention_days: number
}

export interface DmPolicyBlockState {
  blocked_by_actor?: boolean
  blocked_by_recipient?: boolean
  actor_restricted?: boolean
  recipient_restricted?: boolean
}

export interface DmPolicyInput {
  actor_user_id: string
  recipient_user_id: string
  org_id: string
  channel_mode: ChannelMode
  acting_role_context: MessagingRoleContext
  recipient_role_context: MessagingRoleContext
  actor_guardian_user_ids?: string[]
  recipient_guardian_user_ids?: string[]
  subject_athlete_id?: string | null
  is_same_team?: boolean
  is_own_child?: boolean
  is_own_guardian?: boolean
  block_state?: DmPolicyBlockState
  org_settings: OrganizationMessagingSettings
}

export interface DmPolicyDecision {
  allowed: boolean
  decision_id: string
  rule_id: string
  reason_code: DmReasonCode
  policy_version: string
  effective_settings_hash: string
  final_recipients: string[]
  guardian_copy_targets: string[]
  visibility_mode: 'standard' | 'guardian_full_thread'
  requires_parental_copy_notice: boolean
}

export const POLICY_VERSION = 'dm-policy-v1'

export const DEFAULT_ORG_MESSAGING_SETTINGS: Omit<OrganizationMessagingSettings, 'org_id'> = {
  settings_version: 1,
  effective_from: new Date(0).toISOString(),
  precedence_contract: {
    platform_floor: 'enforced',
    org_policy: 'authoritative',
    user_preference: 'allowed_when_safe',
  },
  enable_parent_to_parent_dms: true,
  enable_minor_to_minor_dms: true,
  require_parent_approval_for_minor_dm: false,
  enable_admin_audit_access: true,
  enable_minor_group_parent_visibility: true,
  require_read_receipts_safety_critical: false,
  retention_days: 730,
}
