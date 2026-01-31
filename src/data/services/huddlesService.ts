/**
 * Huddles Service
 * 
 * Business logic for Stream Chat integration with Supabase data.
 * Handles channel creation, membership management, and permission checks.
 */

import { supabase } from '../../lib/supabase'
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
    return { token: data.token, user: data.user }
  } catch (error) {
    console.error('Error getting Stream token:', error)
    return { error: error as Error }
  }
}

/**
 * Get all channels for current user's context
 */
export async function getUserChannels(context: UserContext): Promise<{ data: StreamChannelRecord[] } | { error: Error }> {
  try {
    if (!context.userId || !context.orgId) {
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
      console.error('Error fetching user channels:', error)
      return { error }
    }

    return { data: data || [] }
  } catch (error) {
    console.error('Error in getUserChannels:', error)
    return { error: error as Error }
  }
}

/**
 * Get team channels for user
 */
export async function getTeamChannels(teamIds: string[]): Promise<{ data: StreamChannelRecord[] } | { error: Error }> {
  if (teamIds.length === 0) {
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
      console.error('Error fetching team channels:', error)
      return { error }
    }

    return { data: data || [] }
  } catch (error) {
    console.error('Error in getTeamChannels:', error)
    return { error: error as Error }
  }
}

/**
 * Get org channels for user
 */
export async function getOrgChannels(orgIds: string[]): Promise<{ data: StreamChannelRecord[] } | { error: Error }> {
  if (orgIds.length === 0) {
    return { data: [] }
  }

  try {
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
      console.error('Error fetching org channels:', error)
      return { error }
    }

    return { data: data || [] }
  } catch (error) {
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
      // Error other than "not found"
      return { error: fetchError }
    }

    if (existing) {
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

    return { data: newChannel }
  } catch (error) {
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
  try {
    const { data, error } = await supabaseAny
      .from('huddle_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { error }
    }

    return { data: data || null }
  } catch (error) {
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
      console.error('Error updating notification preferences:', error)
      return { error }
    }

    return { data }
  } catch (error) {
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
      console.error('Error reporting message:', error)
      return { error }
    }

    return { data }
  } catch (error) {
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
      console.error('Error fetching reports:', error)
      return { error }
    }

    return { data: data || [] }
  } catch (error) {
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
  } catch (error) {
    console.error('Error logging audit entry:', error)
    // Don't throw - audit logging failures shouldn't break functionality
  }
}

/**
 * Check if guardian-to-guardian DMs are allowed in org
 */
export async function areGuardianDMsAllowed(orgId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAny
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single()

    if (error || !data) {
      // Default to disallowing guardian DMs for safety
      return false
    }

    return data.settings?.allow_guardian_dms === true
  } catch (error) {
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
  try {
    const { error } = await supabaseAny
      .from('stream_channel_metadata')
      .upsert({
        channel_id: channelId,
        ...updates,
      })

    if (error) {
      console.error('Error updating channel metadata:', error)
      return { error }
    }

    return {}
  } catch (error) {
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
      console.error('Error fetching event channels:', error)
      return { error }
    }

    return { data: data || [] }
  } catch (error) {
    console.error('Error in getEventChannels:', error)
    return { error: error as Error }
  }
}
