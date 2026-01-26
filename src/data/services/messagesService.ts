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
    type FakeAnnouncement,
    type FakeNotification,
} from '../fake/fakeMessages'

export interface Announcement {
    id: string
    team_id: string | null
    author_id: string
    title: string
    content: string
    priority: 'normal' | 'urgent'
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
            author_id: fake.created_by_user_id,
            title: fake.title,
            content: fake.body,
            priority: fake.type === 'emergency' ? 'urgent' : 'normal',
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

        if (params.teamId) {
            query = query.eq('team_id', params.teamId)
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
            author_id: fakeAnn.created_by_user_id,
            title: fakeAnn.title,
            content: fakeAnn.body,
            priority: fakeAnn.type === 'emergency' ? 'urgent' : 'normal',
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
    teamId: string,
    authorId: string
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
                team_id: teamId,
                author_id: authorId,
                title: title.trim(),
                content: content.trim(),
                priority,
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
        // Fetch Org ID from team first to ensure we know where to book creation (if needed) but DB handles Insert.
        type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert']
        const insertData = {
            title: title.trim(),
            content: content.trim(),
            priority,
            team_id: teamId,
            author_id: authorId
        } satisfies AnnouncementInsert
        const { data, error } = await supabase
            .from('announcements')
            .insert(insertData)
            .select(`*, author:users(email)`)
            .single()

        if (error) throw error

        if (!data) {
            return { data: null, error: new Error('Failed to create announcement') }
        }

        // Manually fetch role for consistent return
        let result = data as unknown as { author?: { email?: string; role?: string } }
        if (result) {
            const teamData = await getTeamWithOrg(teamId)
            let role = 'parent'
            if (teamData) {
                const memberData = await getOrgMember(teamData.org_id, authorId)
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
            .from('messages')
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
        type MessageInsert = Database['public']['Tables']['messages']['Insert']
        const insertData = {
            content: content.trim(),
            team_id: teamId,
            author_id: authorId
        } satisfies MessageInsert
        const { data, error } = await supabase
            .from('messages')
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
        if (error) throw error
        return { data: data as Notification[], error: null }
    } catch (err) {
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

        if (error) throw error
        return { data: count || 0, error: null }
    } catch (err) {
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
