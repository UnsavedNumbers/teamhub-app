/**
 * Messages Service
 *
 * Provides data access for announcements, messages, and notifications.
 * Uses Supabase for real data and falls back to fake data for demo/testing.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import type { UserContext } from '../fake/userContext'
import {
    fakeNotifications,
    getAnnouncementById as getFakeAnnouncementById,
    getAnnouncementsForOrg,
    getPinnedAnnouncementsForOrg,
    getAnnouncementsForTeam,
    getOrgWideAnnouncements,
    getDraftAnnouncements,
    getEmergencyAnnouncements,
    getNotificationsForUser,
    getUnreadNotificationsForUser,
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
        let announcements = getAnnouncementsForOrg(context.orgId)
        if (params.teamId) {
            const teamAnn = getAnnouncementsForTeam(params.teamId)
            announcements = params.includeOrgWide ? [...announcements, ...teamAnn] : teamAnn
        }
        // Sort
        announcements.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        return { data: announcements, error: null }
    }

    try {
        // 1. Get Team Org ID
        let orgId = context.orgId;
        if (params.teamId && !orgId) {
            const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', params.teamId).single()
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

        // 3. Fetch Roles Manually
        if (announcements.length > 0 && orgId) {
            const authorIds = [...new Set(announcements.map(a => a.author_id))]
            const { data: members } = await supabase
                .from('organization_members')
                .select('user_id, role')
                .eq('organization_id', orgId)
                .in('user_id', authorIds)

            const roleMap = new Map(members?.map(m => [m.user_id, m.role]))

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
    context: UserContext,
    announcementId: string
): Promise<{ data: Announcement | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const announcement = getFakeAnnouncementById(announcementId)
        return { data: announcement as Announcement | null, error: null }
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
        if (!data.author) {
            data.author = { email: '', role: 'parent' }
        }
        if (!data.team && data.team_id) {
            data.team = { name: 'Team' }
        }

        // Fetch author role from organization_members
        if (data && data.team?.org_id) {
            const { data: memberData } = await supabase
                .from('organization_members')
                .select('role')
                .eq('organization_id', data.team.org_id)
                .eq('user_id', data.author_id)
                .single()

            if (data.author) {
                data.author.role = memberData?.role || 'parent'
            } else {
                data.author = { email: data.author?.email || '', role: memberData?.role || 'parent' }
            }
        } else if (data && !data.author.role) {
            // If no team/org context, default role
            data.author.role = 'parent'
        }

        return { data: data as Announcement, error: null }
    } catch (err) {
        // Check error type for better handling
        const error = err instanceof Error ? err : new Error('Unknown error')
        if (error.message?.includes('No rows') || (err as any)?.code === 'PGRST116') {
            // 404 - announcement not found
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
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: null, error: null }
    }

    try {
        // Fetch Org ID from team first to ensure we know where to book creation (if needed) but DB handles Insert.
        // We just insert.
        const { data, error } = await supabase
            .from('announcements')
            .insert({
                title,
                content,
                priority,
                team_id: teamId,
                author_id: authorId
            })
            .select(`*, author:users(email)`) // Can't easily get role in one shot if it's in another table
            .single()

        if (error) throw error

        // Manually fetch role for consistent return
        if (data) {
            const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', teamId).single()
            let role = 'parent'
            if (teamData) {
                const { data: memberData } = await supabase
                    .from('organization_members')
                    .select('role')
                    .eq('organization_id', teamData.org_id)
                    .eq('user_id', authorId)
                    .single()
                if (memberData) role = memberData.role
            }
            (data as any).author = { ...(data as any).author, role }
        }

        return { data: data as any as Announcement, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
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

        // Fetch Roles
        if (messages.length > 0) {
            // All messages in same team -> same org
            const orgId = messages[0].team?.org_id
            if (orgId) {
                const authorIds = [...new Set(messages.map(m => m.author_id))]
                const { data: members } = await supabase
                    .from('organization_members')
                    .select('user_id, role')
                    .eq('organization_id', orgId)
                    .in('user_id', authorIds)

                const roleMap = new Map(members?.map(m => [m.user_id, m.role]))
                messages.forEach(m => {
                    const realRole = roleMap.get(m.author_id)
                    if (m.author) {
                        m.author.role = realRole || 'parent'
                    } else {
                        m.author = { email: '', role: realRole || 'parent' }
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
    if (USE_FAKE_DATA) {
        return {
            data: {
                id: Date.now().toString(),
                content,
                team_id: teamId,
                author_id: authorId,
                created_at: new Date().toISOString()
            } as Message, error: null
        }
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                content,
                team_id: teamId,
                author_id: authorId
            })
            .select(`*, author:users(email)`)
            .single()

        if (error) throw error

        if (data) {
            const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', teamId).single()
            let role = 'parent'
            if (teamData) {
                const { data: memberData } = await supabase
                    .from('organization_members')
                    .select('role')
                    .eq('organization_id', teamData.org_id)
                    .eq('user_id', authorId)
                    .single()
                if (memberData) role = memberData.role
            }
            (data as any).author = { ...(data as any).author, role }
        }

        return { data: data as any as Message, error: null }
    } catch (err) {
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
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
                const { data: authorData } = await supabase
                    .from('users')
                    .select('email')
                    .eq('id', payload.new.author_id)
                    .single()

                // Fetch Role
                let role = 'parent'
                const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', teamId).single()
                if (teamData) {
                    const { data: memberData } = await supabase
                        .from('organization_members')
                        .select('role')
                        .eq('organization_id', teamData.org_id)
                        .eq('user_id', payload.new.author_id)
                        .single()
                    if (memberData) role = memberData.role
                }

                const message = {
                    ...payload.new,
                    author: {
                        email: authorData?.email,
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
        const { error } = await supabase
            .from('user_notifications')
            .update({ read_at: new Date().toISOString() })
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
        const { error } = await supabase
            .from('user_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('user_id', context.userId)
            .is('read_at', null)

        if (error) throw error
        return { success: true, error: null }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
