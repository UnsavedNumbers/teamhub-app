/**
 * Messages Service
 *
 * Provides data access for announcements, messages, and notifications.
 * Uses Supabase for real data and falls back to fake data for demo/testing.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import { getTeamWithOrg, getOrgMembers, getOrgMember, getUserEmail } from '../../lib/supabase-helpers'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import type { UserContext } from '../fake/userContext'
import {
    getAnnouncementById as getFakeAnnouncementById,
    getAnnouncementsForOrg,
    getAnnouncementsForTeam,
    getOrgWideAnnouncements,
    getNotificationsForUser,
    getUnreadNotificationCount,
    deleteAnnouncementById as deleteFakeAnnouncementById,
    type FakeAnnouncement,
    type FakeNotification,
} from '../fake/fakeMessages'

export interface Announcement {
    id: string
    team_id: string | null
    org_id: string | null
    author_id: string
    title: string
    content: string
    priority: 'normal' | 'urgent'
    type: 'general' | 'reminder' | 'schedule_change' | 'urgent' | 'payment' | 'travel'
    created_at: string
    updated_at: string
    author?: {
        email: string
        role: string
    }
    team?: {
        name: string
    }
}

export interface Message {
    id: string
    team_id: string
    author_id: string
    content: string
    created_at: string
    author?: {
        email: string
        role: string
    }
}

export interface Notification {
    id: string
    user_id: string
    title: string
    body: string
    type: string
    read_at: string | null
    created_at: string
    payload?: any
}

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

// ============================================================================
// Announcement Service Functions
// ============================================================================

export interface AnnouncementsQueryParams {
    teamId?: string
    pinnedOnly?: boolean // pinned not in schema yet, mapped from priority?
    includeOrgWide?: boolean
}

export async function getAnnouncements(
    context: UserContext,
    params: AnnouncementsQueryParams = {}
): Promise<{ data: Announcement[] | FakeAnnouncement[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        // ... (existing fake logic simplified/omitted for brevity as we focus on real impl)
        // For brevity reusing existing fake calls if needed or just returning array
        let announcements: FakeAnnouncement[] = []
        if (params.teamId) {
            const teamAnn = getAnnouncementsForTeam(params.teamId)
            const orgWideAnn = getOrgWideAnnouncements(context.orgId)
            announcements = params.includeOrgWide ? [...orgWideAnn, ...teamAnn] : teamAnn
        } else {
            announcements = getAnnouncementsForOrg(context.orgId)
        }
        // Sort
        announcements.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())

        // Map to proper Announcement interface
        const mappedAnnouncements: Announcement[] = announcements.map(fake => ({
            id: fake.id,
            team_id: fake.team_id,
            org_id: context.orgId || null,
            author_id: fake.created_by_user_id,
            title: fake.title,
            content: fake.body,
            priority: fake.type === 'emergency' ? 'urgent' : 'normal',
            type: 'general' as const,
            created_at: fake.created_at,
            updated_at: fake.updated_at,
            author: {
                email: '',
                role: 'coach'
            }
        }))

        return { data: mappedAnnouncements, error: null }
    }

    try {
        // 1. Get Team Org ID
        let orgId = context.orgId;
        if (params.teamId && !orgId) {
            const teamData = await getTeamWithOrg(params.teamId)
            if (teamData) orgId = teamData.org_id
        }

        // 2. Build Query
        let query = supabase
            .from('announcements')
            .select(`
                *,
                author:users(email),
                team:teams(name, org_id)
            `)
            .order('created_at', { ascending: false })

        if (params.teamId && orgId) {
            // Get team-specific announcements OR org-wide announcements for this org
            // Use separate queries and combine, or use a filter function
            // For now, filter by org and then filter in JS, or use PostgREST or syntax
            query = query
                .eq('org_id', orgId)
                .or(`team_id.eq.${params.teamId},team_id.is.null`)
        } else if (orgId) {
            // Get all announcements for the org (team-specific + org-wide)
            query = query.eq('org_id', orgId)
        }

        const { data, error } = await query

        if (error) throw error

        const announcements = data as any[]

        if (announcements.length > 0 && orgId) {
            const authorIds = [...new Set(announcements.map(a => a.author_id))]
            const members = await getOrgMembers(orgId, authorIds)
            const roleMap = new Map(members.map(m => [m.user_id, m.role]))

            // Merge
            announcements.forEach(a => {
                const realRole = roleMap.get(a.author_id)
                if (a.author) {
                    a.author.role = realRole || 'parent'
                } else {
                    a.author = { email: '', role: realRole || 'parent' }
                }
            })
        }

        return { data: announcements as Announcement[], error: null }
    } catch (err) {
        console.error('Error fetching announcements:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function getAnnouncementById(
    _context: UserContext,
    announcementId: string
): Promise<{ data: Announcement | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const fakeAnn = getFakeAnnouncementById(announcementId)
        if (!fakeAnn) {
            return { data: null, error: null }
        }
        // Map FakeAnnouncement to Announcement interface
        const announcement: Announcement = {
            id: fakeAnn.id,
            team_id: fakeAnn.team_id,
            org_id: null,
            author_id: fakeAnn.created_by_user_id,
            title: fakeAnn.title,
            content: fakeAnn.body,
            priority: fakeAnn.type === 'emergency' ? 'urgent' : 'normal',
            type: 'general' as const,
            created_at: fakeAnn.created_at,
            updated_at: fakeAnn.updated_at,
            author: {
                email: '',
                role: 'coach' // Default role for fake data
            }
        }
        return { data: announcement, error: null }
    }

    try {
        // Query announcement with author and team info
        const { data, error } = await supabase
            .from('announcements')
            .select(`
                *,
                author:users(email),
                team:teams(name, org_id)
            `)
            .eq('id', announcementId)
            .single()

        if (error) throw error

        // Provide safe defaults for author and team
        const dataAny = data as unknown as {
            team?: { org_id?: string; name?: string }
            author_id?: string
            author?: { email?: string; role?: string }
            team_id?: string
        }
        if (!dataAny.author) {
            dataAny.author = { email: '', role: 'parent' }
        }
        if (!dataAny.team && dataAny.team_id) {
            dataAny.team = { name: 'Team' }
        }

        // Fetch author role from organization_members
        if (dataAny && dataAny.team?.org_id && dataAny.author_id) {
            const memberData = await getOrgMember(dataAny.team.org_id, dataAny.author_id)

            if (dataAny.author) {
                dataAny.author.role = memberData?.role || 'parent'
            } else {
                dataAny.author = { email: '', role: memberData?.role || 'parent' }
            }
        } else if (dataAny && !dataAny.author?.role) {
            // If no team/org context, default role
            if (dataAny.author) {
                dataAny.author.role = 'parent'
            } else {
                dataAny.author = { email: '', role: 'parent' }
            }
        }

        return { data: dataAny as unknown as Announcement, error: null }
    } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        type PostgrestError = { code?: string }
        if (error.message?.includes('No rows') || (err as PostgrestError)?.code === 'PGRST116') {
            return { data: null, error: new Error('Announcement not found') }
        }
        console.error('Error fetching announcement:', err)
        return { data: null, error }
    }
}

export async function createAnnouncement(
    title: string,
    content: string,
    priority: 'normal' | 'urgent',
    teamId: string | null,
    authorId: string,
    orgId: string,
    type: 'general' | 'reminder' | 'schedule_change' | 'urgent' | 'payment' | 'travel' = 'general',
    isOrgWide: boolean = false
): Promise<{ data: Announcement | null; error: Error | null }> {
    // Input validation
    if (!title || !title.trim()) {
        return { data: null, error: new Error('Announcement title is required') }
    }
    if (!content || !content.trim()) {
        return { data: null, error: new Error('Announcement content is required') }
    }
    if (!priority || (priority !== 'normal' && priority !== 'urgent')) {
        return { data: null, error: new Error('Priority must be "normal" or "urgent"') }
    }
    if (!isOrgWide && !teamId) {
        return { data: null, error: new Error('Team ID is required for team-specific announcements') }
    }
    if (isOrgWide && !orgId) {
        return { data: null, error: new Error('Organization ID is required for org-wide announcements') }
    }
    if (!authorId) {
        return { data: null, error: new Error('Author ID is required') }
    }

    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { 
            data: {
                id: Date.now().toString(),
                team_id: isOrgWide ? null : teamId,
                org_id: orgId,
                author_id: authorId,
                title: title.trim(),
                content: content.trim(),
                priority,
                type,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                author: {
                    email: '',
                    role: 'coach'
                }
            } as Announcement, 
            error: null 
        }
    }

    try {
        // Build insert data - team_id can be null for org-wide announcements
        // Type assertion needed because Database types may not reflect nullable team_id
        const insertData = {
            title: title.trim(),
            content: content.trim(),
            priority,
            type,
            org_id: orgId,
            author_id: authorId,
            team_id: isOrgWide ? null : (teamId as string | null)
        } as Database['public']['Tables']['announcements']['Insert']
        
        const { data, error } = await supabase
            .from('announcements')
            .insert(insertData)
            .select(`*, author:users(email), team:teams(name, org_id)`)
            .single()

        if (error) throw error

        if (!data) {
            return { data: null, error: new Error('Failed to create announcement') }
        }

        // Manually fetch role for consistent return
        let result = data as unknown as { author?: { email?: string; role?: string }; org_id?: string }
        if (result) {
            const targetOrgId = result.org_id || orgId
            let role = 'parent'
            if (targetOrgId) {
                const memberData = await getOrgMember(targetOrgId, authorId)
                if (memberData) role = memberData.role
            }
            result.author = { ...result.author, role }
        }

        return { data: result as unknown as Announcement, error: null }
    } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        console.error('Error creating announcement:', error)
        return { data: null, error }
    }
}

export async function deleteAnnouncement(
    context: UserContext,
    announcementId: string
): Promise<{ success: boolean; error: Error | null }> {
    // Input validation
    const trimmedId = (announcementId ?? '').trim()
    if (!trimmedId) {
        return { success: false, error: new Error('Announcement ID is required') }
    }
    if (!context.orgId) {
        return { success: false, error: new Error('Organization context is required') }
    }
    if (!context.userId) {
        return { success: false, error: new Error('User ID is required') }
    }

    if (USE_FAKE_DATA) {
        await simulateDelay()
        
        // First, check if announcement exists and get it for permission check
        const announcement = getFakeAnnouncementById(announcementId)
        if (!announcement) {
            return { success: false, error: new Error('Announcement not found') }
        }
        
        // Check permission: must be org_admin or author
        const isAuthor = announcement.created_by_user_id === context.userId
        const isOrgAdmin = context.roles?.includes('org_admin') ?? false
        
        if (!isAuthor && !isOrgAdmin) {
            return { success: false, error: new Error('You do not have permission to delete this announcement') }
        }
        
        // Check org ownership
        if (announcement.org_id !== context.orgId) {
            return { success: false, error: new Error('Announcement does not belong to your organization') }
        }
        
        // Delete using helper function
        const deleted = deleteFakeAnnouncementById(announcementId)
        if (!deleted) {
            return { success: false, error: new Error('Failed to delete announcement') }
        }
        
        return { success: true, error: null }
    }

    try {
        // First, fetch the announcement to check permissions and ownership
        const { data: announcement, error: fetchError } = await supabase
            .from('announcements')
            .select('id, author_id, org_id')
            .eq('id', trimmedId)
            .single()

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {
                return { success: false, error: new Error('Announcement not found') }
            }
            throw fetchError
        }

        if (!announcement || typeof announcement !== 'object' || !('id' in announcement)) {
            return { success: false, error: new Error('Announcement not found') }
        }

        // Type guard for announcement data
        const announcementData = announcement as { id: string; author_id: string; org_id: string | null }

        // Check org ownership
        if (announcementData.org_id !== context.orgId) {
            return { success: false, error: new Error('Announcement does not belong to your organization') }
        }

        // Check permission: must be org_admin or author
        const isAuthor = announcementData.author_id === context.userId
        const isOrgAdmin = context.roles?.includes('org_admin') ?? false

        if (!isAuthor && !isOrgAdmin) {
            // Double-check by querying organization_members
            const memberData = await getOrgMember(context.orgId, context.userId)
            const hasOrgAdminRole = memberData?.role === 'org_admin'
            
            if (!hasOrgAdminRole && !isAuthor) {
                return { success: false, error: new Error('You do not have permission to delete this announcement') }
            }
        }

        // Delete the announcement
        const { error: deleteError } = await supabase
            .from('announcements')
            .delete()
            .eq('id', trimmedId)

        if (deleteError) throw deleteError

        return { success: true, error: null }
    } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        console.error('Error deleting announcement:', error)
        return { success: false, error }
    }
}

// ============================================================================
// Message Service Functions (Chat)
// ============================================================================

export async function getMessages(
    teamId: string
): Promise<{ data: Message[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        return { data: [], error: null }
    }

    try {
        const { data, error } = await supabase
            .from('messages' as any)
            .select(`
                *,
                author:users(email),
                team:teams(org_id)
            `)
            .eq('team_id', teamId)
            .order('created_at', { ascending: true })

        if (error) throw error

        const messages = data as any[]

        if (messages.length > 0) {
            // All messages in same team -> same org
            const firstMessage = messages[0] as unknown as { team?: { org_id?: string }; author_id?: string; author?: { email?: string; role?: string } }
            const orgId = firstMessage.team?.org_id
            if (orgId) {
                const authorIds = [...new Set(messages.map((m: unknown) => {
                    const msg = m as { author_id?: string }
                    return msg.author_id
                }).filter((id): id is string => typeof id === 'string'))]
                const members = await getOrgMembers(orgId, authorIds)
                const roleMap = new Map(members.map(m => [m.user_id, m.role]))
                messages.forEach((m: unknown) => {
                    const msg = m as { author_id?: string; author?: { email?: string; role?: string } }
                    const realRole = roleMap.get(msg.author_id || '')
                    if (msg.author) {
                        msg.author.role = realRole || 'parent'
                    } else {
                        msg.author = { email: '', role: realRole || 'parent' }
                    }
                })
            }
        }

        return { data: messages as Message[], error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function createMessage(
    content: string,
    teamId: string,
    authorId: string
): Promise<{ data: Message | null; error: Error | null }> {
    // Input validation
    if (!content || !content.trim()) {
        return { data: null, error: new Error('Message content is required') }
    }
    if (!teamId) {
        return { data: null, error: new Error('Team ID is required') }
    }
    if (!authorId) {
        return { data: null, error: new Error('Author ID is required') }
    }

    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: {
                id: Date.now().toString(),
                content: content.trim(),
                team_id: teamId,
                author_id: authorId,
                created_at: new Date().toISOString()
            } as Message, error: null
        }
    }

    try {
        // Note: messages table was archived in migration 061, using type assertion for compatibility
        type MessageInsert = {
            content: string
            team_id: string
            author_id: string
        }
        const insertData: MessageInsert = {
            content: content.trim(),
            team_id: teamId,
            author_id: authorId
        }
        const { data, error } = await supabase
            .from('messages' as any)
            .insert(insertData)
            .select(`*, author:users(email)`)
            .single()

        if (error) throw error

        if (!data) {
            return { data: null, error: new Error('Failed to create message') }
        }

        let result = data as unknown as { author?: { email?: string; role?: string } }
        if (result) {
            const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', teamId).single()
            let role = 'parent'
            if (teamData) {
                const { data: memberData } = await supabase
                    .from('organization_members')
                    .select('role')
                    .eq('org_id', teamData.org_id)
                    .eq('user_id', authorId)
                    .single()
                if (memberData) role = memberData.role as string
            }
            result.author = { ...result.author, role }
        }

        return { data: result as unknown as Message, error: null }
    } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        console.error('Error creating message:', error)
        return { data: null, error }
    }
}

export function subscribeToMessages(
    teamId: string,
    callback: (message: Message) => void
) {
    if (USE_FAKE_DATA) return { unsubscribe: () => { } }

    const channel = supabase
        .channel(`team-messages-${teamId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `team_id=eq.${teamId}`
            },
            async (payload) => {
                // Fetch author details
                const authorEmail = await getUserEmail(payload.new.author_id)

                // Fetch Role
                let role = 'parent'
                const teamData = await getTeamWithOrg(teamId)
                if (teamData) {
                    const memberData = await getOrgMember(teamData.org_id, payload.new.author_id)
                    if (memberData) role = memberData.role
                }

                const message = {
                    ...payload.new,
                    author: {
                        email: authorEmail || '',
                        role
                    }
                } as unknown as Message

                callback(message)
            }
        )
        .subscribe()

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel)
        }
    }
}


// ============================================================================
// Notification Service Functions
// ============================================================================

export async function getNotifications(
    context: UserContext,
    limit?: number
): Promise<{ data: Notification[] | FakeNotification[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: getNotificationsForUser(context.userId), error: null }
    }

    try {
        let query = supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', context.userId)
            .order('created_at', { ascending: false })

        if (limit) {
            query = query.limit(limit)
        }

        const { data, error } = await query
        
        // Handle 404 (table doesn't exist) or other errors gracefully
        if (error) {
            // If table doesn't exist (404), return empty array instead of error
            if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                console.warn('[getNotifications] user_notifications table not found, returning empty array')
                return { data: [], error: null }
            }
            throw error
        }
        
        return { data: data as Notification[], error: null }
    } catch (err) {
        // Handle PostgrestError with code PGRST116 (relation does not exist)
        if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST116') {
            console.warn('[getNotifications] user_notifications table not found, returning empty array')
            return { data: [], error: null }
        }
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function getUnreadCount(
    context: UserContext
): Promise<{ data: number; error: Error | null }> {
    if (USE_FAKE_DATA) {
        return { data: getUnreadNotificationCount(context.userId), error: null }
    }

    try {
        const { count, error } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', context.userId)
            .is('read_at', null)

        // Handle 404 (table doesn't exist) gracefully
        if (error) {
            if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
                console.warn('[getUnreadCount] user_notifications table not found, returning 0')
                return { data: 0, error: null }
            }
            throw error
        }
        return { data: count || 0, error: null }
    } catch (err) {
        // Handle PostgrestError with code PGRST116 (relation does not exist)
        if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST116') {
            console.warn('[getUnreadCount] user_notifications table not found, returning 0')
            return { data: 0, error: null }
        }
        return { data: 0, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function markNotificationRead(
    context: UserContext,
    notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
    if (USE_FAKE_DATA) {
        return { success: true, error: null }
    }

    try {
        type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
        const updateData = { read_at: new Date().toISOString() } satisfies NotificationUpdate
        const { error } = await supabase
            .from('user_notifications')
            .update(updateData)
            .eq('id', notificationId)
            .eq('user_id', context.userId)

        if (error) throw error
        return { success: true, error: null }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function markAllNotificationsRead(
    context: UserContext
): Promise<{ success: boolean; error: Error | null }> {
    if (USE_FAKE_DATA) {
        return { success: true, error: null }
    }

    try {
        type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
        const updateData = { read_at: new Date().toISOString() } satisfies NotificationUpdate
        const { error } = await supabase
            .from('user_notifications')
            .update(updateData)
            .eq('user_id', context.userId)
            .is('read_at', null)

        if (error) throw error
        return { success: true, error: null }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
