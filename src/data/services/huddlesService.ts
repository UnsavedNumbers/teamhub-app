/**
 * Huddles Service
 * 
 * Business logic for Stream Chat integration with Supabase data.
 * Handles channel creation, membership management, and permission checks.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { UserContext } from '../fake/userContext'
import {
  DEFAULT_ORG_MESSAGING_SETTINGS,
  evaluateDmAttempt,
  type DmPolicyDecision,
  type MessagingRoleContext,
  type OrganizationMessagingSettings,
} from '../../lib/messaging'

const supabaseAny = supabase as any
const SETTINGS_CACHE_TTL_MS = 60_000
const messagingSettingsCache = new Map<string, { settings: OrganizationMessagingSettings; fetchedAt: number }>()

/**
 * Channel type enumeration
 */
export type ChannelType = 'team' | 'org' | 'dm'

/**
 * Stream channel metadata from Supabase
 */
export interface StreamChannelRecord {
  id: string
  stream_channel_id: string
  org_id: string
  team_id: string | null
  channel_type: ChannelType
  user_id_1: string | null
  user_id_2: string | null
  created_at: string
  updated_at: string
  metadata?: {
    name?: string
    description?: string
    avatar_url?: string
    last_activity_at?: string
    pinned_message_ids?: string[]
    event_id?: string
    policy_version?: string
    rule_id_at_creation?: string | null
    subject_athlete_user_id?: string | null
    guardian_copy_mode?: string | null
    created_by_role_context?: string | null
    requires_parental_copy_notice?: boolean
    effective_settings_hash?: string | null
  }
}

/**
 * Notification preferences for a channel
 */
export interface NotificationPreferences {
  id: string
  user_id: string
  channel_id: string
  muted: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  digest_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
}

/**
 * Message report
 */
export interface MessageReport {
  id: string
  reported_by_user_id: string
  stream_message_id: string
  stream_channel_id: string
  reason: string | null
  status: 'pending' | 'reviewed' | 'dismissed'
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  admin_notes: string | null
  created_at: string
}

export interface StartDirectMessageInput {
  actor_user_id: string
  recipient_user_id: string
  org_id: string
  acting_role_context: MessagingRoleContext
  recipient_role_context?: MessagingRoleContext
  subject_athlete_id?: string | null
  channel_mode?: 'dm' | 'group'
  idempotency_key?: string
  is_same_team?: boolean
  is_own_child?: boolean
  is_own_guardian?: boolean
  actor_guardian_user_ids?: string[]
  recipient_guardian_user_ids?: string[]
  force_refresh_settings?: boolean
}

export interface StartDirectMessageResult {
  channel: StreamChannelRecord
  decision: DmPolicyDecision
  settings: OrganizationMessagingSettings
}

interface UserRoleSnapshot {
  primaryRole: MessagingRoleContext
  orgRoles: string[]
  guardianAthleteIds: string[]
}

function normalizeRoleContext(role: string | null | undefined): MessagingRoleContext {
  switch (role) {
    case 'parent':
    case 'guardian':
      return 'parent'
    case 'coach':
      return 'coach'
    case 'assistant_coach':
      return 'assistant_coach'
    case 'team_manager':
      return 'team_manager'
    case 'staff':
      return 'staff'
    case 'org_admin':
      return 'org_admin'
    case 'system_admin':
      return 'system_admin'
    case 'athlete_minor':
    case 'athlete_adult':
      return role
    case 'fan':
      return 'fan'
    default:
      return 'unknown'
  }
}

function buildDmKey(userId1: string, userId2: string, subjectAthleteId?: string | null): string {
  const [user1, user2] = [userId1, userId2].sort()
  return subjectAthleteId
    ? `dm:${user1}:${user2}:athlete:${subjectAthleteId}`
    : `dm:${user1}:${user2}`
}

function toMessagingSettings(orgId: string, row?: Record<string, any> | null): OrganizationMessagingSettings {
  if (!row) {
    return {
      org_id: orgId,
      ...DEFAULT_ORG_MESSAGING_SETTINGS,
    }
  }

  return {
    org_id: orgId,
    settings_version: row.settings_version ?? DEFAULT_ORG_MESSAGING_SETTINGS.settings_version,
    effective_from: row.effective_from ?? DEFAULT_ORG_MESSAGING_SETTINGS.effective_from,
    precedence_contract: row.precedence_contract ?? DEFAULT_ORG_MESSAGING_SETTINGS.precedence_contract,
    enable_parent_to_parent_dms: row.enable_parent_to_parent_dms ?? DEFAULT_ORG_MESSAGING_SETTINGS.enable_parent_to_parent_dms,
    enable_minor_to_minor_dms: row.enable_minor_to_minor_dms ?? DEFAULT_ORG_MESSAGING_SETTINGS.enable_minor_to_minor_dms,
    require_parent_approval_for_minor_dm: row.require_parent_approval_for_minor_dm ?? DEFAULT_ORG_MESSAGING_SETTINGS.require_parent_approval_for_minor_dm,
    enable_admin_audit_access: row.enable_admin_audit_access ?? DEFAULT_ORG_MESSAGING_SETTINGS.enable_admin_audit_access,
    enable_minor_group_parent_visibility: row.enable_minor_group_parent_visibility ?? DEFAULT_ORG_MESSAGING_SETTINGS.enable_minor_group_parent_visibility,
    require_read_receipts_safety_critical: row.require_read_receipts_safety_critical ?? DEFAULT_ORG_MESSAGING_SETTINGS.require_read_receipts_safety_critical,
    retention_days: row.retention_days ?? DEFAULT_ORG_MESSAGING_SETTINGS.retention_days,
  }
}

async function getOrganizationMessagingSettings(
  orgId: string,
  forceRefresh = false,
): Promise<OrganizationMessagingSettings> {
  const now = Date.now()
  const cached = messagingSettingsCache.get(orgId)
  if (!forceRefresh && cached && now - cached.fetchedAt < SETTINGS_CACHE_TTL_MS) {
    return cached.settings
  }

  const { data, error } = await supabaseAny
    .from('organization_messaging_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    debug.error('HuddlesService.getOrganizationMessagingSettings', 'Failed to fetch org messaging settings, using defaults', { orgId, error })
    const fallback = toMessagingSettings(orgId)
    messagingSettingsCache.set(orgId, { settings: fallback, fetchedAt: now })
    return fallback
  }

  const settings = toMessagingSettings(orgId, data)
  messagingSettingsCache.set(orgId, { settings, fetchedAt: now })
  return settings
}

async function getUserRoleSnapshot(orgId: string, userId: string): Promise<UserRoleSnapshot> {
  const [{ data: rolesData }, { data: guardianLinks }] = await Promise.all([
    supabaseAny
      .from('organization_members')
      .select('role, is_active')
      .eq('org_id', orgId)
      .eq('user_id', userId),
    supabaseAny
      .from('athlete_guardians')
      .select('athlete_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])

  const orgRoles = Array.isArray(rolesData)
    ? rolesData
      .filter((row: { is_active?: boolean | null }) => row.is_active !== false)
      .map((row: { role?: string }) => row.role)
      .filter((role: string | undefined): role is string => !!role)
    : []
  const guardianAthleteIds = Array.isArray(guardianLinks)
    ? guardianLinks.map((row: { athlete_id?: string }) => row.athlete_id).filter((id: string | undefined): id is string => !!id)
    : []

  let primaryRole: MessagingRoleContext = 'unknown'
  if (orgRoles.includes('org_admin')) {
    primaryRole = 'org_admin'
  } else if (orgRoles.includes('coach')) {
    primaryRole = 'coach'
  } else if (orgRoles.includes('staff')) {
    primaryRole = 'staff'
  } else if (orgRoles.includes('parent') || guardianAthleteIds.length > 0) {
    primaryRole = 'parent'
  }

  return {
    primaryRole,
    orgRoles,
    guardianAthleteIds,
  }
}

async function getGuardianUserIdsForAthlete(orgId: string, athleteId: string | null | undefined): Promise<string[]> {
  if (!athleteId) return []

  const { data, error } = await supabaseAny
    .from('athlete_guardians')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('athlete_id', athleteId)
    .eq('status', 'active')

  if (error || !Array.isArray(data)) return []

  return Array.from(
    new Set(
      data
        .map((row: { user_id?: string }) => row.user_id)
        .filter((value: string | undefined): value is string => !!value),
    ),
  )
}

async function getUserTeamIdsForMessaging(orgId: string, userId: string): Promise<string[]> {
  const teamIds = new Set<string>()
  const [{ data: coachedTeams }, { data: guardianAthletes }] = await Promise.all([
    supabaseAny
      .from('team_coaches')
      .select('team_id')
      .eq('org_id', orgId)
      .eq('coach_user_id', userId)
      .eq('status', 'active'),
    supabaseAny
      .from('athlete_guardians')
      .select('athlete_id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])

  if (Array.isArray(coachedTeams)) {
    coachedTeams.forEach((row: { team_id?: string }) => {
      if (row.team_id) teamIds.add(row.team_id)
    })
  }

  const athleteIds = Array.isArray(guardianAthletes)
    ? guardianAthletes
      .map((row: { athlete_id?: string }) => row.athlete_id)
      .filter((athleteId: string | undefined): athleteId is string => !!athleteId)
    : []

  if (athleteIds.length > 0) {
    const { data: memberships } = await supabaseAny
      .from('team_memberships')
      .select('team_id')
      .in('athlete_id', athleteIds)
      .is('deleted_at', null)

    if (Array.isArray(memberships)) {
      memberships.forEach((row: { team_id?: string }) => {
        if (row.team_id) teamIds.add(row.team_id)
      })
    }
  }

  return Array.from(teamIds)
}

async function getDmBlockState(orgId: string, actorUserId: string, recipientUserId: string): Promise<{
  blocked_by_actor: boolean
  blocked_by_recipient: boolean
}> {
  const { data, error } = await supabaseAny
    .from('dm_user_blocks')
    .select('blocker_user_id, blocked_user_id')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .or(`and(blocker_user_id.eq.${actorUserId},blocked_user_id.eq.${recipientUserId}),and(blocker_user_id.eq.${recipientUserId},blocked_user_id.eq.${actorUserId})`)

  if (error || !Array.isArray(data)) {
    return {
      blocked_by_actor: false,
      blocked_by_recipient: false,
    }
  }

  return {
    blocked_by_actor: data.some((row: { blocker_user_id?: string; blocked_user_id?: string }) => row.blocker_user_id === actorUserId && row.blocked_user_id === recipientUserId),
    blocked_by_recipient: data.some((row: { blocker_user_id?: string; blocked_user_id?: string }) => row.blocker_user_id === recipientUserId && row.blocked_user_id === actorUserId),
  }
}

/**
 * Get Stream Chat token for current user
 */
export async function getStreamToken(): Promise<{ token: string; user: any } | { error: Error }> {
  debug.flow('HuddlesService.getStreamToken', 'Getting Stream token')
  debug.perf.start('huddlesService.getStreamToken')

  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { error: new Error('Not authenticated') }
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: session.user.id }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Stream token error response:', errorData)
      return { error: new Error(errorData.error || `Failed to get Stream token (${response.status})`) }
    }

    const data = await response.json()
    debug.perf.end('huddlesService.getStreamToken')
    debug.flow('HuddlesService.getStreamToken', 'Stream token retrieved successfully')
    return { token: data.token, user: data.user }
  } catch (error) {
    debug.perf.end('huddlesService.getStreamToken')
    debug.error('HuddlesService.getStreamToken', 'Failed to get Stream token', { error })
    console.error('Error getting Stream token:', error)
    return { error: error as Error }
  }
}

/**
 * Get all channels for current user's context
 */
export async function getUserChannels(context: UserContext): Promise<{ data: StreamChannelRecord[] } | { error: Error }> {
  console.groupCollapsed(`%cgetUserChannels: ${context.userId}`, 'color: #666; font-weight: bold;');
  debug.data('HuddlesService.getUserChannels', 'Request', { userId: context.userId, orgId: context.orgId })
  debug.perf.start('huddlesService.getUserChannels')

  try {
    if (!context.userId || !context.orgId) {
      debug.perf.end('huddlesService.getUserChannels')
      debug.error('HuddlesService.getUserChannels', 'User context not ready', { userId: context.userId, orgId: context.orgId })
      console.groupEnd()
      return { error: new Error('User context not ready') }
    }

    const orgIds = (context as any).orgIds ?? (context.orgId ? [context.orgId] : [])
    const teamIds = (context as any).teamIds ?? []

    const { data, error } = await supabaseAny
      .from('stream_channels')
      .select(`
        *,
        metadata:stream_channel_metadata(*)
      `)
      .or(`
        org_id.in.(${orgIds.join(',')}),
        team_id.in.(${teamIds.join(',')}),
        user_id_1.eq.${context.userId},
        user_id_2.eq.${context.userId}
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      debug.perf.end('huddlesService.getUserChannels')
      debug.error('HuddlesService.getUserChannels', 'Failed to fetch channels', { error, userId: context.userId })
      console.groupEnd()
      console.error('Error fetching user channels:', error)
      return { error }
    }

    debug.perf.end('huddlesService.getUserChannels')
    debug.data('HuddlesService.getUserChannels', 'Response', { userId: context.userId, channelCount: data?.length || 0 })
    console.groupEnd()
    return { data: data || [] }
  } catch (error) {
    debug.perf.end('huddlesService.getUserChannels')
    debug.error('HuddlesService.getUserChannels', 'Exception fetching channels', { error, userId: context.userId })
    console.groupEnd()
    console.error('Error in getUserChannels:', error)
    return { error: error as Error }
  }
}

/**
 * Get team channels for user
 */
export async function getTeamChannels(teamIds: string[]): Promise<{ data: StreamChannelRecord[] } | { error: Error }> {
  console.groupCollapsed(`%cgetTeamChannels: ${teamIds.length} teams`, 'color: #666; font-weight: bold;');
  debug.data('HuddlesService.getTeamChannels', 'Request', { teamIds })
  debug.perf.start('huddlesService.getTeamChannels')

  if (teamIds.length === 0) {
    debug.perf.end('huddlesService.getTeamChannels')
    debug.data('HuddlesService.getTeamChannels', 'Response (empty)', { teamIds: [] })
    console.groupEnd()
    return { data: [] }
  }

  try {
    const { data, error } = await supabaseAny
      .from('stream_channels')
      .select(`
        *,
        metadata:stream_channel_metadata(*)
      `)
      .eq('channel_type', 'team')
      .in('team_id', teamIds)
      .order('updated_at', { ascending: false })

    if (error) {
      debug.perf.end('huddlesService.getTeamChannels')
      debug.error('HuddlesService.getTeamChannels', 'Failed to fetch team channels', { error, teamIds })
      console.groupEnd()
      console.error('Error fetching team channels:', error)
      return { error }
    }

    debug.perf.end('huddlesService.getTeamChannels')
    debug.data('HuddlesService.getTeamChannels', 'Response', { teamIds, channelCount: data?.length || 0 })
    console.groupEnd()
    return { data: data || [] }
  } catch (error) {
    debug.perf.end('huddlesService.getTeamChannels')
    debug.error('HuddlesService.getTeamChannels', 'Exception fetching team channels', { error, teamIds })
    console.groupEnd()
    console.error('Error in getTeamChannels:', error)
    return { error: error as Error }
  }
}

/**
 * Get org channels for user
 */
export async function getOrgChannels(orgIds: string[]): Promise<{ data: StreamChannelRecord[] } | { error: Error }> {
  console.groupCollapsed(`%cgetOrgChannels: ${orgIds.length} orgs`, 'color: #666; font-weight: bold;');
  debug.data('HuddlesService.getOrgChannels', 'Request', { orgIds })
  debug.perf.start('huddlesService.getOrgChannels')

  try {
    if (orgIds.length === 0) {
      debug.perf.end('huddlesService.getOrgChannels')
      debug.data('HuddlesService.getOrgChannels', 'Response (empty)', { orgIds: [] })
      console.groupEnd()
      return { data: [] }
    }
    const { data, error } = await supabaseAny
      .from('stream_channels')
      .select(`
        *,
        metadata:stream_channel_metadata(*)
      `)
      .eq('channel_type', 'org')
      .in('org_id', orgIds)
      .order('updated_at', { ascending: false })

    if (error) {
      debug.perf.end('huddlesService.getOrgChannels')
      debug.error('HuddlesService.getOrgChannels', 'Failed to fetch org channels', { error, orgIds })
      console.groupEnd()
      console.error('Error fetching org channels:', error)
      return { error }
    }

    debug.perf.end('huddlesService.getOrgChannels')
    debug.data('HuddlesService.getOrgChannels', 'Response', { orgIds, channelCount: data?.length || 0 })
    console.groupEnd()
    return { data: data || [] }
  } catch (error) {
    debug.perf.end('huddlesService.getOrgChannels')
    debug.error('HuddlesService.getOrgChannels', 'Exception fetching org channels', { error, orgIds })
    console.groupEnd()
    console.error('Error in getOrgChannels:', error)
    return { error: error as Error }
  }
}

/**
 * Start a direct message with policy evaluation, guardian-copy fanout, and idempotent DM creation.
 */
export async function startDirectMessage(
  input: StartDirectMessageInput,
): Promise<{ data: StartDirectMessageResult } | { error: Error; decision?: DmPolicyDecision }> {
  const {
    actor_user_id,
    recipient_user_id,
    org_id,
    acting_role_context,
    subject_athlete_id = null,
  } = input

  console.groupCollapsed(`%cstartDirectMessage: ${actor_user_id} -> ${recipient_user_id}`, 'color: #666; font-weight: bold;');
  debug.flow('HuddlesService.startDirectMessage', 'Evaluating and creating direct message', {
    actor_user_id,
    recipient_user_id,
    org_id,
    acting_role_context,
    subject_athlete_id,
  })
  debug.perf.start('huddlesService.startDirectMessage')

  try {
    const [actorSnapshot, recipientSnapshot, settings, blockState] = await Promise.all([
      getUserRoleSnapshot(org_id, actor_user_id),
      getUserRoleSnapshot(org_id, recipient_user_id),
      getOrganizationMessagingSettings(org_id, input.force_refresh_settings === true),
      getDmBlockState(org_id, actor_user_id, recipient_user_id),
    ])

    const recipientRoleContext = input.recipient_role_context
      ? normalizeRoleContext(input.recipient_role_context)
      : recipientSnapshot.primaryRole

    const actorRoleContext = normalizeRoleContext(acting_role_context)

    const [actorTeamIds, recipientTeamIds] = await Promise.all([
      getUserTeamIdsForMessaging(org_id, actor_user_id),
      getUserTeamIdsForMessaging(org_id, recipient_user_id),
    ])

    const hasSharedTeam = actorTeamIds.some((teamId) => recipientTeamIds.includes(teamId))

    const actorGuardianTargets = input.actor_guardian_user_ids ?? await getGuardianUserIdsForAthlete(org_id, subject_athlete_id)
    const recipientGuardianTargets = input.recipient_guardian_user_ids ?? await getGuardianUserIdsForAthlete(org_id, subject_athlete_id)

    const isOwnChild = input.is_own_child ?? (
      !!subject_athlete_id
      && actorSnapshot.guardianAthleteIds.includes(subject_athlete_id)
    )
    const isOwnGuardian = input.is_own_guardian ?? recipientGuardianTargets.includes(recipient_user_id)

    const decision = evaluateDmAttempt({
      actor_user_id,
      recipient_user_id,
      org_id,
      channel_mode: input.channel_mode ?? 'dm',
      acting_role_context: actorRoleContext,
      recipient_role_context: recipientRoleContext,
      actor_guardian_user_ids: actorGuardianTargets,
      recipient_guardian_user_ids: recipientGuardianTargets,
      subject_athlete_id,
      is_same_team: input.is_same_team ?? hasSharedTeam,
      is_own_child: isOwnChild,
      is_own_guardian: isOwnGuardian,
      block_state: blockState,
      org_settings: settings,
    })

    if (!decision.allowed) {
      await logAuditEntry({
        action: 'dm_denied',
        user_id: actor_user_id,
        metadata: {
          actor_user_id,
          recipient_user_id,
          org_id,
          acting_role_context: actorRoleContext,
          recipient_role_context: recipientRoleContext,
          settings_version: settings.settings_version,
        },
        decision_id: decision.decision_id,
        reason_code: decision.reason_code,
        actor_role_context: actorRoleContext,
        subject_athlete_id: subject_athlete_id ?? undefined,
      })

      debug.perf.end('huddlesService.startDirectMessage')
      console.groupEnd()
      return {
        error: new Error(`Direct messaging blocked by policy (${decision.reason_code})`),
        decision,
      }
    }

    const [user1, user2] = [actor_user_id, recipient_user_id].sort()
    const dmKey = buildDmKey(actor_user_id, recipient_user_id, subject_athlete_id)
    const channelId = dmKey
    const idempotencyKey = input.idempotency_key ?? `dm-start:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`

    const { data: existing, error: fetchError } = await supabaseAny
      .from('stream_channels')
      .select(`
        *,
        metadata:stream_channel_metadata(*)
      `)
      .eq('dm_key', dmKey)
      .maybeSingle()

    if (fetchError) {
      debug.perf.end('huddlesService.startDirectMessage')
      debug.error('HuddlesService.startDirectMessage', 'Failed to fetch existing channel', { error: fetchError, actor_user_id, recipient_user_id })
      console.groupEnd()
      return { error: fetchError as Error, decision }
    }

    if (existing) {
      await logAuditEntry({
        action: 'dm_allowed',
        user_id: actor_user_id,
        channel_id: existing.stream_channel_id,
        metadata: {
          actor_user_id,
          recipient_user_id,
          org_id,
          reused_channel: true,
          guardian_copy_targets: decision.guardian_copy_targets,
          settings_version: settings.settings_version,
        },
        decision_id: decision.decision_id,
        reason_code: decision.reason_code,
        actor_role_context: actorRoleContext,
        subject_athlete_id: subject_athlete_id ?? undefined,
      })

      debug.perf.end('huddlesService.startDirectMessage')
      debug.flow('HuddlesService.startDirectMessage', 'Existing DM channel found', { actor_user_id, recipient_user_id, channelId })
      console.groupEnd()
      return {
        data: {
          channel: existing,
          decision,
          settings,
        },
      }
    }

    const { data: newChannel, error: insertError } = await supabaseAny
      .from('stream_channels')
      .insert({
        stream_channel_id: channelId,
        org_id,
        channel_type: 'dm',
        user_id_1: user1,
        user_id_2: user2,
        dm_key: dmKey,
        dm_idempotency_key: idempotencyKey,
      })
      .select(`
        *,
        metadata:stream_channel_metadata(*)
      `)
      .single()

    if (insertError) {
      const isUniqueViolation = (insertError as { code?: string }).code === '23505'

      if (isUniqueViolation) {
        const { data: raceWinner } = await supabaseAny
          .from('stream_channels')
          .select(`
            *,
            metadata:stream_channel_metadata(*)
          `)
          .eq('dm_key', dmKey)
          .maybeSingle()

        if (raceWinner) {
          await logAuditEntry({
            action: 'dm_allowed',
            user_id: actor_user_id,
            channel_id: raceWinner.stream_channel_id,
            metadata: {
              actor_user_id,
              recipient_user_id,
              org_id,
              reused_channel: true,
              race_recovered: true,
              guardian_copy_targets: decision.guardian_copy_targets,
              settings_version: settings.settings_version,
            },
            decision_id: decision.decision_id,
            reason_code: decision.reason_code,
            actor_role_context: actorRoleContext,
            subject_athlete_id: subject_athlete_id ?? undefined,
          })

          debug.perf.end('huddlesService.startDirectMessage')
          console.groupEnd()
          return {
            data: {
              channel: raceWinner,
              decision,
              settings,
            },
          }
        }
      }

      debug.perf.end('huddlesService.startDirectMessage')
      debug.error('HuddlesService.startDirectMessage', 'Failed to create DM channel', { error: insertError, actor_user_id, recipient_user_id })
      console.groupEnd()
      console.error('Error creating DM channel:', insertError)
      return { error: insertError as Error, decision }
    }

    await supabaseAny
      .from('stream_channel_metadata')
      .upsert({
        channel_id: newChannel.id,
        name: 'Direct Message',
        policy_version: decision.policy_version,
        rule_id_at_creation: decision.rule_id,
        subject_athlete_user_id: subject_athlete_id ?? null,
        guardian_copy_mode: decision.guardian_copy_targets.length > 0 ? 'full_thread' : 'none',
        created_by_role_context: actorRoleContext,
        requires_parental_copy_notice: decision.requires_parental_copy_notice,
        effective_settings_hash: decision.effective_settings_hash,
      })

    await logAuditEntry({
      action: 'dm_allowed',
      user_id: actor_user_id,
      channel_id: channelId,
      metadata: {
        actor_user_id,
        recipient_user_id,
        org_id,
        guardian_copy_targets: decision.guardian_copy_targets,
        settings_version: settings.settings_version,
      },
      decision_id: decision.decision_id,
      reason_code: decision.reason_code,
      actor_role_context: actorRoleContext,
      subject_athlete_id: subject_athlete_id ?? undefined,
    })

    debug.perf.end('huddlesService.startDirectMessage')
    debug.flow('HuddlesService.startDirectMessage', 'DM channel created successfully', { actor_user_id, recipient_user_id, channelId })
    console.groupEnd()
    return {
      data: {
        channel: newChannel,
        decision,
        settings,
      },
    }
  } catch (error) {
    debug.perf.end('huddlesService.startDirectMessage')
    debug.error('HuddlesService.startDirectMessage', 'Exception creating DM channel', { error, actor_user_id, recipient_user_id })
    console.groupEnd()
    console.error('Error in startDirectMessage:', error)
    return { error: error as Error }
  }
}

/**
 * Backward-compatible DM creation wrapper.
 */
export async function getOrCreateDMChannel(
  userId1: string,
  userId2: string,
  orgId: string,
  options?: {
    acting_role_context?: MessagingRoleContext
    recipient_role_context?: MessagingRoleContext
    subject_athlete_id?: string | null
    idempotency_key?: string
  },
): Promise<{ data: StreamChannelRecord; decision?: DmPolicyDecision } | { error: Error; decision?: DmPolicyDecision }> {
  const result = await startDirectMessage({
    actor_user_id: userId1,
    recipient_user_id: userId2,
    org_id: orgId,
    acting_role_context: options?.acting_role_context ?? 'parent',
    recipient_role_context: options?.recipient_role_context,
    subject_athlete_id: options?.subject_athlete_id,
    idempotency_key: options?.idempotency_key,
  })

  if ('error' in result) {
    return result
  }

  return {
    data: result.data.channel,
    decision: result.data.decision,
  }
}

/**
 * Get notification preferences for a channel
 */
export async function getNotificationPreferences(
  userId: string,
  channelId: string
): Promise<{ data: NotificationPreferences | null } | { error: Error }> {
  console.groupCollapsed(`%cgetNotificationPreferences: ${channelId}`, 'color: #666; font-weight: bold;');
  debug.data('HuddlesService.getNotificationPreferences', 'Request', { userId, channelId })
  debug.perf.start('huddlesService.getNotificationPreferences')

  try {
    const { data, error } = await supabaseAny
      .from('huddle_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .single()

    if (error && error.code !== 'PGRST116') {
      debug.perf.end('huddlesService.getNotificationPreferences')
      debug.error('HuddlesService.getNotificationPreferences', 'Failed to get preferences', { error, userId, channelId })
      console.groupEnd()
      return { error }
    }

    debug.perf.end('huddlesService.getNotificationPreferences')
    debug.data('HuddlesService.getNotificationPreferences', 'Response', { userId, channelId, found: !!data })
    console.groupEnd()
    return { data: data || null }
  } catch (error) {
    debug.perf.end('huddlesService.getNotificationPreferences')
    debug.error('HuddlesService.getNotificationPreferences', 'Exception fetching preferences', { error, userId, channelId })
    console.groupEnd()
    console.error('Error fetching notification preferences:', error)
    return { error: error as Error }
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  channelId: string,
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'channel_id'>>
): Promise<{ data: NotificationPreferences } | { error: Error }> {
  console.groupCollapsed(`%cupdateNotificationPreferences: ${channelId}`, 'color: #666; font-weight: bold;');
  debug.flow('HuddlesService.updateNotificationPreferences', 'Updating preferences', { userId, channelId })
  debug.perf.start('huddlesService.updateNotificationPreferences')

  try {
    const { data, error } = await supabaseAny
      .from('huddle_notification_preferences')
      .upsert({
        user_id: userId,
        channel_id: channelId,
        ...preferences,
      })
      .select()
      .single()

    if (error) {
      debug.perf.end('huddlesService.updateNotificationPreferences')
      debug.error('HuddlesService.updateNotificationPreferences', 'Failed to update preferences', { error, userId, channelId })
      console.groupEnd()
      console.error('Error updating notification preferences:', error)
      return { error }
    }

    debug.perf.end('huddlesService.updateNotificationPreferences')
    debug.flow('HuddlesService.updateNotificationPreferences', 'Preferences updated successfully', { userId, channelId })
    console.groupEnd()
    return { data }
  } catch (error) {
    debug.perf.end('huddlesService.updateNotificationPreferences')
    debug.error('HuddlesService.updateNotificationPreferences', 'Exception updating preferences', { error, userId, channelId })
    console.groupEnd()
    console.error('Error in updateNotificationPreferences:', error)
    return { error: error as Error }
  }
}

/**
 * Report a message
 */
export async function reportMessage(
  userId: string,
  messageId: string,
  channelId: string,
  reason: string
): Promise<{ data: MessageReport } | { error: Error }> {
  console.groupCollapsed(`%creportMessage: ${messageId}`, 'color: #666; font-weight: bold;');
  debug.flow('HuddlesService.reportMessage', 'Reporting message', { userId, messageId, channelId, reason })
  debug.perf.start('huddlesService.reportMessage')

  try {
    const { data, error } = await supabaseAny
      .from('huddle_reports')
      .insert({
        reported_by_user_id: userId,
        stream_message_id: messageId,
        stream_channel_id: channelId,
        reason,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      debug.perf.end('huddlesService.reportMessage')
      debug.error('HuddlesService.reportMessage', 'Failed to report message', { error, userId, messageId, channelId })
      console.groupEnd()
      console.error('Error reporting message:', error)
      return { error }
    }

    debug.perf.end('huddlesService.reportMessage')
    debug.flow('HuddlesService.reportMessage', 'Message reported successfully', { userId, messageId, channelId })
    await logAuditEntry({
      action: 'dm_reported',
      user_id: userId,
      message_id: messageId,
      channel_id: channelId,
      reason_code: 'ALLOWED',
      metadata: {
        report_id: data.id,
        reason,
      },
    })
    console.groupEnd()
    return { data }
  } catch (error) {
    debug.perf.end('huddlesService.reportMessage')
    debug.error('HuddlesService.reportMessage', 'Exception reporting message', { error, userId, messageId, channelId })
    console.groupEnd()
    console.error('Error in reportMessage:', error)
    return { error: error as Error }
  }
}

/**
 * Get reports for review (org admins only)
 */
export async function getReportsForOrg(
  orgId: string,
  status?: 'pending' | 'reviewed' | 'dismissed'
): Promise<{ data: MessageReport[] } | { error: Error }> {
  console.groupCollapsed(`%cgetReportsForOrg: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.data('HuddlesService.getReportsForOrg', 'Request', { orgId, status })
  debug.perf.start('huddlesService.getReportsForOrg')
  try {
    let query = supabaseAny
      .from('huddle_reports')
      .select(`
        *,
        reporter:reported_by_user_id(first_name, last_name, email)
      `)
      .in('stream_channel_id', 
        supabaseAny
          .from('stream_channels')
          .select('stream_channel_id')
          .eq('org_id', orgId)
      )
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      debug.perf.end('huddlesService.getReportsForOrg')
      debug.error('HuddlesService.getReportsForOrg', 'Failed to fetch reports', { error, orgId, status })
      console.groupEnd()
      console.error('Error fetching reports:', error)
      return { error }
    }

    debug.perf.end('huddlesService.getReportsForOrg')
    debug.data('HuddlesService.getReportsForOrg', 'Response', { orgId, status, reportCount: data?.length || 0 })
    console.groupEnd()
    return { data: data || [] }
  } catch (error) {
    debug.perf.end('huddlesService.getReportsForOrg')
    debug.error('HuddlesService.getReportsForOrg', 'Exception fetching reports', { error, orgId, status })
    console.groupEnd()
    console.error('Error in getReportsForOrg:', error)
    return { error: error as Error }
  }
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: 'reviewed' | 'dismissed',
  reviewerId: string,
  adminNotes?: string
): Promise<{ data: MessageReport } | { error: Error }> {
  console.groupCollapsed(`%cupdateReportStatus: ${reportId}`, 'color: #666; font-weight: bold;');
  debug.flow('HuddlesService.updateReportStatus', 'Updating report status', { reportId, status, reviewerId })
  debug.perf.start('huddlesService.updateReportStatus')

  try {
    const { data, error } = await supabaseAny
      .from('huddle_reports')
      .update({
        status,
        reviewed_by_user_id: reviewerId,
        admin_notes: adminNotes,
      })
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      console.error('Error updating report status:', error)
      return { error }
    }

    return { data }
  } catch (error) {
    console.error('Error in updateReportStatus:', error)
    return { error: error as Error }
  }
}

/**
 * Log audit entry for message action
 */
export async function logAuditEntry(entry: {
  action: string
  user_id: string
  message_id?: string
  channel_id?: string
  metadata?: Record<string, any>
  decision_id?: string
  reason_code?: string
  actor_role_context?: MessagingRoleContext
  subject_athlete_id?: string
  access_reason?: string
}): Promise<void> {
  debug.flow('HuddlesService.logAuditEntry', 'Logging audit entry', { action: entry.action, userId: entry.user_id })
  debug.perf.start('huddlesService.logAuditEntry')
  try {
    await supabaseAny
      .from('huddle_audit_log')
      .insert({
        action: entry.action,
        user_id: entry.user_id,
        stream_message_id: entry.message_id,
        stream_channel_id: entry.channel_id,
        metadata: entry.metadata,
        decision_id: entry.decision_id,
        reason_code: entry.reason_code,
        actor_role_context: entry.actor_role_context,
        subject_athlete_id: entry.subject_athlete_id,
        access_reason: entry.access_reason,
      })
    debug.perf.end('huddlesService.logAuditEntry')
    debug.flow('HuddlesService.logAuditEntry', 'Audit entry logged successfully', { action: entry.action, userId: entry.user_id })
  } catch (error) {
    debug.perf.end('huddlesService.logAuditEntry')
    debug.error('HuddlesService.logAuditEntry', 'Failed to log audit entry', { error, action: entry.action, userId: entry.user_id })
    console.error('Error logging audit entry:', error)
    // Don't throw - audit logging failures shouldn't break functionality
  }
}

export async function blockUserForDM(input: {
  org_id: string
  blocker_user_id: string
  blocked_user_id: string
  reason?: string
  acting_role_context?: MessagingRoleContext
}): Promise<{ error?: Error }> {
  try {
    const { error } = await supabaseAny
      .from('dm_user_blocks')
      .upsert({
        org_id: input.org_id,
        blocker_user_id: input.blocker_user_id,
        blocked_user_id: input.blocked_user_id,
        reason: input.reason ?? null,
        is_active: true,
      }, { onConflict: 'org_id,blocker_user_id,blocked_user_id' })

    if (error) {
      return { error }
    }

    const { data: blockedUserRoles } = await supabaseAny
      .from('organization_members')
      .select('role')
      .eq('org_id', input.org_id)
      .eq('user_id', input.blocked_user_id)
      .eq('is_active', true)

    const blockedCoach = Array.isArray(blockedUserRoles)
      ? blockedUserRoles.some((row: { role?: string }) => row.role === 'coach')
      : false

    await logAuditEntry({
      action: blockedCoach ? 'dm_block_coach_alerted_admin' : 'dm_block_applied',
      user_id: input.blocker_user_id,
      reason_code: blockedCoach ? 'RESTRICTED_BY_ADMIN' : 'ALLOWED',
      actor_role_context: input.acting_role_context ?? 'unknown',
      metadata: {
        org_id: input.org_id,
        blocked_user_id: input.blocked_user_id,
        reason: input.reason ?? null,
      },
    })

    return {}
  } catch (error) {
    return { error: error as Error }
  }
}

export async function unblockUserForDM(input: {
  org_id: string
  blocker_user_id: string
  blocked_user_id: string
  acting_role_context?: MessagingRoleContext
}): Promise<{ error?: Error }> {
  try {
    const { error } = await supabaseAny
      .from('dm_user_blocks')
      .update({ is_active: false })
      .eq('org_id', input.org_id)
      .eq('blocker_user_id', input.blocker_user_id)
      .eq('blocked_user_id', input.blocked_user_id)
      .eq('is_active', true)

    if (error) {
      return { error }
    }

    await logAuditEntry({
      action: 'dm_block_removed',
      user_id: input.blocker_user_id,
      reason_code: 'ALLOWED',
      actor_role_context: input.acting_role_context ?? 'unknown',
      metadata: {
        org_id: input.org_id,
        blocked_user_id: input.blocked_user_id,
      },
    })

    return {}
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * Check if guardian-to-guardian DMs are allowed in org
 */
export async function areGuardianDMsAllowed(orgId: string): Promise<boolean> {
  debug.data('HuddlesService.areGuardianDMsAllowed', 'Request', { orgId })
  debug.perf.start('huddlesService.areGuardianDMsAllowed')

  try {
    const settings = await getOrganizationMessagingSettings(orgId)
    const allowed = settings.enable_parent_to_parent_dms
    debug.perf.end('huddlesService.areGuardianDMsAllowed')
    debug.data('HuddlesService.areGuardianDMsAllowed', 'Response', { orgId, allowed })
    console.groupEnd()
    return allowed
  } catch (error) {
    debug.perf.end('huddlesService.areGuardianDMsAllowed')
    debug.error('HuddlesService.areGuardianDMsAllowed', 'Exception checking settings', { error, orgId })
    console.groupEnd()
    console.error('Error checking guardian DM settings:', error)
    return false
  }
}

/**
 * Update channel metadata
 */
export async function updateChannelMetadata(
  channelId: string,
  updates: {
    name?: string
    description?: string
    avatar_url?: string
    pinned_message_ids?: string[]
    event_id?: string | null
  }
): Promise<{ error?: Error }> {
  console.groupCollapsed(`%cupdateChannelMetadata: ${channelId}`, 'color: #666; font-weight: bold;');
  debug.flow('HuddlesService.updateChannelMetadata', 'Updating channel metadata', { channelId, updates })
  debug.perf.start('huddlesService.updateChannelMetadata')

  try {
    const { error } = await supabaseAny
      .from('stream_channel_metadata')
      .upsert({
        channel_id: channelId,
        ...updates,
      })

    if (error) {
      debug.perf.end('huddlesService.updateChannelMetadata')
      debug.error('HuddlesService.updateChannelMetadata', 'Failed to update channel metadata', { error, channelId })
      console.groupEnd()
      console.error('Error updating channel metadata:', error)
      return { error }
    }

    debug.perf.end('huddlesService.updateChannelMetadata')
    debug.flow('HuddlesService.updateChannelMetadata', 'Channel metadata updated successfully', { channelId })
    console.groupEnd()
    return {}
  } catch (error) {
    debug.perf.end('huddlesService.updateChannelMetadata')
    debug.error('HuddlesService.updateChannelMetadata', 'Exception updating channel metadata', { error, channelId })
    console.groupEnd()
    console.error('Error in updateChannelMetadata:', error)
    return { error: error as Error }
  }
}

/**
 * Get channels linked to an event
 */
export async function getEventChannels(eventId: string): Promise<{ data: StreamChannelRecord[] } | { error: Error }> {
  try {
    const { data, error } = await supabaseAny
      .from('stream_channels')
      .select(`
        *,
        metadata:stream_channel_metadata!inner(*)
      `)
      .eq('metadata.event_id', eventId)

    if (error) {
      debug.perf.end('huddlesService.getEventChannels')
      debug.error('HuddlesService.getEventChannels', 'Failed to fetch event channels', { error, eventId })
      console.groupEnd()
      console.error('Error fetching event channels:', error)
      return { error }
    }

    debug.perf.end('huddlesService.getEventChannels')
    debug.data('HuddlesService.getEventChannels', 'Response', { eventId, channelCount: data?.length || 0 })
    console.groupEnd()
    return { data: data || [] }
  } catch (error) {
    debug.perf.end('huddlesService.getEventChannels')
    debug.error('HuddlesService.getEventChannels', 'Exception fetching event channels', { error, eventId })
    console.groupEnd()
    console.error('Error in getEventChannels:', error)
    return { error: error as Error }
  }
}
