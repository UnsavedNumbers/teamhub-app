/**
 * Huddles Service
 * 
 * Business logic for Stream Chat integration with Supabase data.
 * Handles channel creation, membership management, and permission checks.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { UserContext } from '../fake/userContext'

const supabaseAny = supabase as any

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
 * Get or create DM channel
 */
export async function getOrCreateDMChannel(
  userId1: string,
  userId2: string,
  orgId: string
): Promise<{ data: StreamChannelRecord } | { error: Error }> {
  console.groupCollapsed(`%cgetOrCreateDMChannel: ${userId1} - ${userId2}`, 'color: #666; font-weight: bold;');
  debug.flow('HuddlesService.getOrCreateDMChannel', 'Getting or creating DM channel', { userId1, userId2, orgId })
  debug.perf.start('huddlesService.getOrCreateDMChannel')

  try {
    // Sort user IDs
    const [user1, user2] = [userId1, userId2].sort()
    const channelId = `dm:${user1}:${user2}`

    // Check if channel exists
    const { data: existing, error: fetchError } = await supabaseAny
      .from('stream_channels')
      .select(`
        *,
        metadata:stream_channel_metadata(*)
      `)
      .eq('stream_channel_id', channelId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      debug.perf.end('huddlesService.getOrCreateDMChannel')
      debug.error('HuddlesService.getOrCreateDMChannel', 'Failed to fetch existing channel', { error: fetchError, userId1, userId2 })
      console.groupEnd()
      return { error: fetchError }
    }

    if (existing) {
      debug.perf.end('huddlesService.getOrCreateDMChannel')
      debug.flow('HuddlesService.getOrCreateDMChannel', 'Existing DM channel found', { userId1, userId2, channelId })
      console.groupEnd()
      return { data: existing }
    }

    // Create new DM channel
    const { data: newChannel, error: insertError } = await supabaseAny
      .from('stream_channels')
      .insert({
        stream_channel_id: channelId,
        org_id: orgId,
        channel_type: 'dm',
        user_id_1: user1,
        user_id_2: user2,
      })
      .select(`
        *,
        metadata:stream_channel_metadata(*)
      `)
      .single()

    if (insertError) {
      debug.perf.end('huddlesService.getOrCreateDMChannel')
      debug.error('HuddlesService.getOrCreateDMChannel', 'Failed to create DM channel', { error: insertError, userId1, userId2 })
      console.groupEnd()
      console.error('Error creating DM channel:', insertError)
      return { error: insertError }
    }

    // Create metadata
    await supabaseAny
      .from('stream_channel_metadata')
      .insert({
        channel_id: newChannel.id,
        name: 'Direct Message',
      })

    debug.perf.end('huddlesService.getOrCreateDMChannel')
    debug.flow('HuddlesService.getOrCreateDMChannel', 'DM channel created successfully', { userId1, userId2, channelId })
    console.groupEnd()
    return { data: newChannel }
  } catch (error) {
    debug.perf.end('huddlesService.getOrCreateDMChannel')
    debug.error('HuddlesService.getOrCreateDMChannel', 'Exception creating DM channel', { error, userId1, userId2 })
    console.groupEnd()
    console.error('Error in getOrCreateDMChannel:', error)
    return { error: error as Error }
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
export async function logAuditEntry(
  action: string,
  userId: string,
  messageId?: string,
  channelId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  debug.flow('HuddlesService.logAuditEntry', 'Logging audit entry', { action, userId })
  debug.perf.start('huddlesService.logAuditEntry')
  try {
    await supabaseAny
      .from('huddle_audit_log')
      .insert({
        action,
        user_id: userId,
        stream_message_id: messageId,
        stream_channel_id: channelId,
        metadata,
      })
    debug.perf.end('huddlesService.logAuditEntry')
    debug.flow('HuddlesService.logAuditEntry', 'Audit entry logged successfully', { action, userId })
  } catch (error) {
    debug.perf.end('huddlesService.logAuditEntry')
    debug.error('HuddlesService.logAuditEntry', 'Failed to log audit entry', { error, action, userId })
    console.error('Error logging audit entry:', error)
    // Don't throw - audit logging failures shouldn't break functionality
  }
}

/**
 * Check if guardian-to-guardian DMs are allowed in org
 */
export async function areGuardianDMsAllowed(orgId: string): Promise<boolean> {
  debug.data('HuddlesService.areGuardianDMsAllowed', 'Request', { orgId })
  debug.perf.start('huddlesService.areGuardianDMsAllowed')

  try {
    const { data, error } = await supabaseAny
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single()

    if (error || !data) {
      debug.perf.end('huddlesService.areGuardianDMsAllowed')
      debug.data('HuddlesService.areGuardianDMsAllowed', 'Response (default false)', { orgId })
      console.groupEnd()
      return false
    }

    const allowed = data.settings?.allow_guardian_dms === true
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
