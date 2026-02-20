/**
 * Messages Service
 *
 * Provides data access for announcements, messages, and notifications.
 * Uses Supabase for real data and falls back to fake data for demo/testing.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
const supabaseAny = supabase as any
import { getTeamWithOrg, getOrgMembers, getOrgMember, getUserEmail } from '../../lib/supabase-helpers'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import type { UserContext } from '../fake/userContext'
import {
    defaultPresentationForAction,
    isRoleAllowedForAction,
    ACTION_ROLE_MAP,
    type NotificationAction,
    type NotificationCreateInput,
    type NotificationCreateResult,
    type NotificationEntityType,
    type NotificationPresentation,
    type NotificationRecord,
    type NotificationRole,
} from '../../types/notifications'
import {
    getAnnouncementById as getFakeAnnouncementById,
    getAnnouncementsForOrg,
    getAnnouncementsForTeam,
    getOrgWideAnnouncements,
    fakeNotifications,
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

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

type DbNotificationRow = Database['public']['Tables']['user_notifications']['Row']

const VALID_ACTIONS = new Set<NotificationAction>(Object.keys(ACTION_ROLE_MAP) as NotificationAction[])
const VALID_PRESENTATIONS: NotificationPresentation[] = ['info', 'warning', 'urgent']
const VALID_ROLES: NotificationRole[] = ['guardian', 'parent', 'coach', 'org_admin']

function normalizeAction(action: unknown): NotificationAction {
    if (typeof action === 'string' && VALID_ACTIONS.has(action as NotificationAction)) {
        return action as NotificationAction
    }
    return 'system_generated_notice'
}

function normalizePresentation(value: unknown): NotificationPresentation {
    if (typeof value === 'string' && VALID_PRESENTATIONS.includes(value as NotificationPresentation)) {
        return value as NotificationPresentation
    }
    return 'info'
}

function normalizeRole(value: unknown): NotificationRole {
    if (typeof value === 'string' && VALID_ROLES.includes(value as NotificationRole)) {
        return value === 'parent' ? 'guardian' : (value as NotificationRole)
    }
    return 'guardian'
}

function mapDbNotification(row: DbNotificationRow): NotificationRecord {
    return {
        id: row.id,
        user_id: row.user_id,
        org_id: row.org_id,
        team_id: row.team_id ?? null,
        action: normalizeAction((row as any).action ?? (row as any).type),
        presentation_type: normalizePresentation((row as any).presentation_type ?? 'info'),
        role_context: normalizeRole((row as any).role_context),
        entity_type: ((row as any).entity_type ?? null) as NotificationEntityType | null,
        entity_id: ((row as any).entity_id ?? null) as string | null,
        title: row.title,
        body: row.body,
        link_url: ((row as any).link_url ?? null) as string | null,
        metadata: (row as any).metadata as Record<string, unknown> | null,
        dedupe_key: row.dedupe_key,
        read_at: row.read_at,
        created_at: row.created_at,
    }
}

function mapFakeNotification(fake: FakeNotification): NotificationRecord {
    return {
        id: fake.id,
        user_id: fake.user_id,
        org_id: fake.org_id,
        team_id: fake.team_id,
        action: fake.action,
        presentation_type: fake.presentation_type,
        role_context: fake.role_context,
        entity_type: fake.entity_type,
        entity_id: fake.entity_id,
        title: fake.title,
        body: fake.body,
        link_url: fake.link_url,
        metadata: fake.metadata,
        dedupe_key: fake.dedupe_key,
        read_at: fake.read_at,
        created_at: fake.created_at,
    }
}

function buildDedupeKey(input: NotificationCreateInput): string {
    if (input.dedupeKey) return input.dedupeKey
    const entityPart = input.entityId ?? input.entityType ?? 'none'
    return `${input.action}:${input.userId}:${entityPart}`
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
    console.groupCollapsed(`%cgetAnnouncements: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('MessagesService.getAnnouncements', 'Request', { context: { userId: context.userId, orgId: context.orgId }, params })
    debug.perf.start('messagesService.getAnnouncements')

    try {
        if (USE_FAKE_DATA) {
        await simulateDelay()
        // ... (existing fake logic simplified/omitted for brevity as we focus on real impl)
        // For brevity reusing existing fake calls if needed or just returning array
        const fakeOrgId = DEMO_ORG_A_ID
        let announcements: FakeAnnouncement[] = []
        if (params.teamId) {
            const teamAnn = getAnnouncementsForTeam(params.teamId)
            const orgWideAnn = getOrgWideAnnouncements(fakeOrgId)
            announcements = params.includeOrgWide ? [...orgWideAnn, ...teamAnn] : teamAnn
        } else {
            announcements = getAnnouncementsForOrg(fakeOrgId)
        }
        // Sort
        announcements.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())

        // Map to proper Announcement interface
        const mappedAnnouncements: Announcement[] = announcements.map(fake => ({
            id: fake.id,
            team_id: fake.team_id,
            org_id: fakeOrgId || null,
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

        debug.perf.end('messagesService.getAnnouncements')
        debug.data('MessagesService.getAnnouncements', 'Response (fake)', { announcementCount: mappedAnnouncements.length })
        console.groupEnd()
        return { data: mappedAnnouncements, error: null }
    }
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

        debug.perf.end('messagesService.getAnnouncements')
        debug.data('MessagesService.getAnnouncements', 'Response', { announcementCount: announcements.length })
        console.groupEnd()
        return { data: announcements as Announcement[], error: null }
    } catch (err) {
        debug.perf.end('messagesService.getAnnouncements')
        debug.error('MessagesService.getAnnouncements', 'Failed to get announcements', { error: err, context: { userId: context.userId, orgId: context.orgId }, params })
        console.groupEnd()
        console.error('Error fetching announcements:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function getAnnouncementById(
    _context: UserContext,
    announcementId: string
): Promise<{ data: Announcement | null; error: Error | null }> {
    console.groupCollapsed(`%cgetAnnouncementById: ${announcementId}`, 'color: #666; font-weight: bold;');
    debug.data('MessagesService.getAnnouncementById', 'Request', { announcementId })
    debug.perf.start('messagesService.getAnnouncementById')

    try {
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

        debug.perf.end('messagesService.getAnnouncementById')
        debug.data('MessagesService.getAnnouncementById', 'Response', { announcementId, found: !!dataAny })
        console.groupEnd()
        return { data: dataAny as unknown as Announcement, error: null }
    } catch (err) {
        debug.perf.end('messagesService.getAnnouncementById')
        const error = err instanceof Error ? err : new Error('Unknown error')
        type PostgrestError = { code?: string }
        if (error.message?.includes('No rows') || (err as PostgrestError)?.code === 'PGRST116') {
            debug.data('MessagesService.getAnnouncementById', 'Response (not found)', { announcementId })
            console.groupEnd()
            return { data: null, error: new Error('Announcement not found') }
        }
        debug.error('MessagesService.getAnnouncementById', 'Failed to get announcement', { error: err, announcementId })
        console.groupEnd()
        console.error('Error fetching announcement:', err)
        return { data: null, error }
    }
}

export async function createAnnouncement(
    context: UserContext,
    title: string,
    content: string,
    priority: 'normal' | 'urgent',
    teamId: string | null,
    authorId: string,
    orgId: string,
    type: 'general' | 'reminder' | 'schedule_change' | 'urgent' | 'payment' | 'travel' = 'general',
    isOrgWide: boolean = false,
    visibleToFans: boolean = false
): Promise<{ data: Announcement | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateAnnouncement: ${title}`, 'color: #666; font-weight: bold;');
    debug.flow('MessagesService.createAnnouncement', 'Creating announcement', { title, priority, teamId, orgId, isOrgWide })
    debug.perf.start('messagesService.createAnnouncement')

    // Input validation
    if (!title || !title.trim()) {
        debug.perf.end('messagesService.createAnnouncement')
        debug.error('MessagesService.createAnnouncement', 'Validation failed', { error: 'missing_title' })
        console.groupEnd()
        return { data: null, error: new Error('Announcement title is required') }
    }
    if (!content || !content.trim()) {
        debug.perf.end('messagesService.createAnnouncement')
        debug.error('MessagesService.createAnnouncement', 'Validation failed', { error: 'missing_content' })
        console.groupEnd()
        return { data: null, error: new Error('Announcement content is required') }
    }
    if (!priority || (priority !== 'normal' && priority !== 'urgent')) {
        debug.perf.end('messagesService.createAnnouncement')
        debug.error('MessagesService.createAnnouncement', 'Validation failed', { error: 'invalid_priority', priority })
        console.groupEnd()
        return { data: null, error: new Error('Priority must be "normal" or "urgent"') }
    }
    if (!isOrgWide && !teamId) {
        debug.perf.end('messagesService.createAnnouncement')
        debug.error('MessagesService.createAnnouncement', 'Validation failed', { error: 'missing_team_id' })
        console.groupEnd()
        return { data: null, error: new Error('Team ID is required for team-specific announcements') }
    }
    if (isOrgWide && !orgId) {
        debug.perf.end('messagesService.createAnnouncement')
        debug.error('MessagesService.createAnnouncement', 'Validation failed', { error: 'missing_org_id' })
        console.groupEnd()
        return { data: null, error: new Error('Organization ID is required for org-wide announcements') }
    }
    if (!authorId) {
        debug.perf.end('messagesService.createAnnouncement')
        debug.error('MessagesService.createAnnouncement', 'Validation failed', { error: 'missing_author_id' })
        console.groupEnd()
        return { data: null, error: new Error('Author ID is required') }
    }

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            debug.perf.end('messagesService.createAnnouncement')
            debug.flow('MessagesService.createAnnouncement', 'Announcement created (fake)', { title })
            console.groupEnd()
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

        // Build insert data - team_id can be null for org-wide announcements
        // Type assertion needed because Database types may not reflect nullable team_id
        const insertData = {
            title: title.trim(),
            content: content.trim(),
            priority,
            type,
            org_id: orgId,
            author_id: authorId,
            team_id: isOrgWide ? null : (teamId as string | null),
            visible_to_fans: visibleToFans
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
        const result = data as unknown as { author?: { email?: string; role?: string }; org_id?: string }
        if (result) {
            const targetOrgId = result.org_id || orgId
            let role = 'parent'
            if (targetOrgId) {
                const memberData = await getOrgMember(targetOrgId, authorId)
                if (memberData) role = memberData.role
            }
            result.author = { ...result.author, role }
        }

        const newAnnouncement = result as unknown as Announcement

        // WIRE NOTIFICATIONS (END-TO-END)
        // Explicitly resolve audience and create notifications
        // This ensures the action produces side-effects as requested
        if (newAnnouncement) {
            // We run this *without* awaiting to avoid blocking the UI response
            // Log errors internally
            distributeAnnouncementNotifications(newAnnouncement, context)
                .catch(err => console.error('[NotificationService] Failed to distribute announcement notifications:', err))
        }

        return { data: newAnnouncement, error: null }
    } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        console.error('Error creating announcement:', error)
        return { data: null, error }
    }
}

/**
 * Resolves audience and distributes notifications for a new announcement
 */
async function distributeAnnouncementNotifications(announcement: Announcement, context: UserContext): Promise<void> {
    if (USE_FAKE_DATA) return

    try {
        const orgId = announcement.org_id

        if (!orgId) {
            console.warn('[NotificationService] Cannot distribute announcement without org_id')
            return
        }

        const action: NotificationAction = announcement.priority === 'urgent'
            ? 'announcement_urgent'
            : 'announcement_created'

        const { notifyUsers } = await import('./notificationServiceCore')

        // 1. AUDIENCE RESOLUTION
        if (announcement.team_id) {
            // TEAM ANNOUNCEMENT: Parents of athletes on this team + coaches
            const guardianUserIds: string[] = []
            const coachUserIds: string[] = []

            const { data: members, error: memberError } = await supabase
                .from('team_memberships')
                .select(`
                    athlete_id,
                    athlete:athletes!athlete_id(family_id)
                `)
                .eq('team_id', announcement.team_id)
                .eq('status', 'active')

            if (!memberError && members) {
                const familyIds = members
                    .map(m => (m.athlete as any)?.family_id)
                    .filter(Boolean) as string[]

                if (familyIds.length > 0) {
                    const { data: users, error: userError } = await supabase
                        .from('users')
                        .select('id')
                        .in('family_id', familyIds)

                    if (!userError && users) {
                        users.forEach(u => {
                            if (u.id !== announcement.author_id && u.id !== context.userId) {
                                guardianUserIds.push(u.id)
                            }
                        })
                    }
                }
            }

            // Also include Coaches for this team
            const { data: coaches, error: coachError } = await supabaseAny
                .from('coach_assignments')
                .select('user_id')
                .eq('team_id', announcement.team_id)

            if (!coachError && coaches) {
                coaches.forEach((c: any) => {
                    if (c.user_id && c.user_id !== announcement.author_id && c.user_id !== context.userId) {
                        coachUserIds.push(c.user_id)
                    }
                })
            }

            let totalInAppCount = 0

            // Notify guardians
            if (guardianUserIds.length > 0) {
                const result = await notifyUsers({
                    userIds: guardianUserIds,
                    orgId,
                    teamId: announcement.team_id,
                    action,
                    roleContext: 'guardian',
                    title: announcement.title,
                    body: announcement.content,
                    linkUrl: `/portal/messages`,
                    entityType: 'announcement',
                    entityId: announcement.id,
                    presentation: announcement.priority === 'urgent' ? 'urgent' : 'info',
                    metadata: {
                        priority: announcement.priority,
                        type: announcement.type
                    }
                })
                if (result.success) {
                    totalInAppCount += result.inAppCount
                }
            }

            // Notify coaches
            if (coachUserIds.length > 0) {
                const result = await notifyUsers({
                    userIds: coachUserIds,
                    orgId,
                    teamId: announcement.team_id,
                    action,
                    roleContext: 'coach',
                    title: announcement.title,
                    body: announcement.content,
                    linkUrl: `/portal/messages`,
                    entityType: 'announcement',
                    entityId: announcement.id,
                    presentation: announcement.priority === 'urgent' ? 'urgent' : 'info',
                    metadata: {
                        priority: announcement.priority,
                        type: announcement.type
                    }
                })
                if (result.success) {
                    totalInAppCount += result.inAppCount
                }
            }

            console.log(`[NotificationService] Distributed ${totalInAppCount} notifications for announcement ${announcement.id}`)
        } else {
            // ORG-WIDE ANNOUNCEMENT: All org members by role
            const recipientRoles = ['guardian', 'parent', 'coach', 'org_admin']
            const { data: members, error: memberError } = await supabase
                .from('organization_members')
                .select('user_id, role')
                .eq('org_id', orgId)
                .in('role', recipientRoles as any)

            if (!memberError && members) {
                // Group by role
                const usersByRole: Record<string, string[]> = {
                    guardian: [],
                    coach: [],
                    org_admin: [],
                }

                members.forEach(m => {
                    const userId = m.user_id
                    if (userId === announcement.author_id || userId === context.userId) return

                    const role = m.role === 'parent' ? 'guardian' : m.role
                    if (role === 'guardian' || role === 'coach' || role === 'org_admin') {
                        if (!usersByRole[role]) usersByRole[role] = []
                        usersByRole[role].push(userId)
                    }
                })

                let totalInAppCount = 0

                // Notify each role group
                for (const [role, userIds] of Object.entries(usersByRole)) {
                    if (userIds.length === 0) continue

                    const result = await notifyUsers({
                        userIds,
                        orgId,
                        teamId: null,
                        action,
                        roleContext: role as 'guardian' | 'coach' | 'org_admin',
                        title: announcement.title,
                        body: announcement.content,
                        linkUrl: `/portal/messages`,
                        entityType: 'announcement',
                        entityId: announcement.id,
                        presentation: announcement.priority === 'urgent' ? 'urgent' : 'info',
                        metadata: {
                            priority: announcement.priority,
                            type: announcement.type
                        }
                    })
                    if (result.success) {
                        totalInAppCount += result.inAppCount
                    }
                }

                console.log(`[NotificationService] Distributed ${totalInAppCount} notifications for org-wide announcement ${announcement.id}`)
            }
        }

    } catch (err) {
        console.error('[NotificationService] Error distributing notifications:', err)
    }
}

export async function deleteAnnouncement(
    context: UserContext,
    announcementId: string
): Promise<{ success: boolean; error: Error | null }> {
    console.groupCollapsed(`%cdeleteAnnouncement: ${announcementId}`, 'color: #666; font-weight: bold;');
    debug.flow('MessagesService.deleteAnnouncement', 'Deleting announcement', { announcementId })
    debug.perf.start('messagesService.deleteAnnouncement')

    // Input validation
    const trimmedId = (announcementId ?? '').trim()
    if (!trimmedId) {
        debug.perf.end('messagesService.deleteAnnouncement')
        debug.error('MessagesService.deleteAnnouncement', 'Validation failed', { error: 'missing_id' })
        console.groupEnd()
        return { success: false, error: new Error('Announcement ID is required') }
    }
    if (!context.orgId) {
        debug.perf.end('messagesService.deleteAnnouncement')
        debug.error('MessagesService.deleteAnnouncement', 'Validation failed', { error: 'missing_org_id' })
        console.groupEnd()
        return { success: false, error: new Error('Organization context is required') }
    }
    if (!context.userId) {
        debug.perf.end('messagesService.deleteAnnouncement')
        debug.error('MessagesService.deleteAnnouncement', 'Validation failed', { error: 'missing_user_id' })
        console.groupEnd()
        return { success: false, error: new Error('User ID is required') }
    }

    try {
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

        debug.perf.end('messagesService.deleteAnnouncement')
        debug.flow('MessagesService.deleteAnnouncement', 'Announcement deleted successfully', { announcementId: trimmedId })
        console.groupEnd()
        return { success: true, error: null }
    } catch (err) {
        debug.perf.end('messagesService.deleteAnnouncement')
        const error = err instanceof Error ? err : new Error('Unknown error')
        debug.error('MessagesService.deleteAnnouncement', 'Failed to delete announcement', { error: err, announcementId: trimmedId })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetMessages: ${teamId}`, 'color: #666; font-weight: bold;');
    debug.data('MessagesService.getMessages', 'Request', { teamId })
    debug.perf.start('messagesService.getMessages')

    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('messagesService.getMessages')
            debug.data('MessagesService.getMessages', 'Response (fake)', { teamId, messageCount: 0 })
            console.groupEnd()
            return { data: [], error: null }
        }
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

        debug.perf.end('messagesService.getMessages')
        debug.data('MessagesService.getMessages', 'Response', { teamId, messageCount: messages.length })
        console.groupEnd()
        return { data: messages as Message[], error: null }
    } catch (err) {
        debug.perf.end('messagesService.getMessages')
        debug.error('MessagesService.getMessages', 'Failed to get messages', { error: err, teamId })
        console.groupEnd()
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function createMessage(
    content: string,
    teamId: string,
    authorId: string
): Promise<{ data: Message | null; error: Error | null }> {
    console.groupCollapsed(`%ccreateMessage: ${teamId}`, 'color: #666; font-weight: bold;');
    debug.flow('MessagesService.createMessage', 'Creating message', { teamId, authorId, contentLength: content.length })
    debug.perf.start('messagesService.createMessage')

    // Input validation
    if (!content || !content.trim()) {
        debug.perf.end('messagesService.createMessage')
        debug.error('MessagesService.createMessage', 'Validation failed', { error: 'missing_content' })
        console.groupEnd()
        return { data: null, error: new Error('Message content is required') }
    }
    if (!teamId) {
        debug.perf.end('messagesService.createMessage')
        debug.error('MessagesService.createMessage', 'Validation failed', { error: 'missing_team_id' })
        console.groupEnd()
        return { data: null, error: new Error('Team ID is required') }
    }
    if (!authorId) {
        debug.perf.end('messagesService.createMessage')
        debug.error('MessagesService.createMessage', 'Validation failed', { error: 'missing_author_id' })
        console.groupEnd()
        return { data: null, error: new Error('Author ID is required') }
    }

    try {
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

        const result = data as unknown as { author?: { email?: string; role?: string } }
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

        // Send notifications to team members (except the author)
        const messageId = (result as any).id
        try {
          const { notifyUsers } = await import('./notificationServiceCore')
          
          // Get team members (guardians and coaches)
          const { data: teamData } = await supabase
            .from('teams')
            .select('org_id')
            .eq('id', teamId)
            .single()

          if (teamData?.org_id) {
            const guardianUserIds: string[] = []
            const coachUserIds: string[] = []

            // Get guardians via team memberships
            const { data: members } = await supabase
              .from('team_memberships')
              .select(`
                athlete_id,
                athlete:athletes!athlete_id(family_id)
              `)
              .eq('team_id', teamId)
              .eq('status', 'active')

            if (members) {
              const familyIds = members
                .map(m => (m.athlete as any)?.family_id)
                .filter(Boolean) as string[]

              if (familyIds.length > 0) {
                const { data: users } = await supabase
                  .from('users')
                  .select('id')
                  .in('family_id', familyIds)

                if (users) {
                  users.forEach(u => {
                    if (u.id !== authorId) {
                      guardianUserIds.push(u.id)
                    }
                  })
                }
              }
            }

            // Get coaches
            const { data: coaches } = await supabaseAny
              .from('coach_assignments')
              .select('user_id')
              .eq('team_id', teamId)

            if (coaches) {
              coaches.forEach((c: any) => {
                if (c.user_id && c.user_id !== authorId) {
                  coachUserIds.push(c.user_id)
                }
              })
            }

            // Notify guardians
            if (guardianUserIds.length > 0) {
              await notifyUsers({
                userIds: guardianUserIds,
                orgId: teamData.org_id,
                teamId,
                action: 'message_sent',
                roleContext: 'guardian',
                title: 'New Message',
                body: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
                linkUrl: `/portal/messages?team=${teamId}`,
                entityType: 'message',
                entityId: messageId,
              }).catch(err => console.error('Failed to notify guardians about message:', err))
            }

            // Notify coaches
            if (coachUserIds.length > 0) {
              await notifyUsers({
                userIds: coachUserIds,
                orgId: teamData.org_id,
                teamId,
                action: 'message_sent',
                roleContext: 'coach',
                title: 'New Message',
                body: content.trim().substring(0, 100) + (content.length > 100 ? '...' : ''),
                linkUrl: `/portal/messages?team=${teamId}`,
                entityType: 'message',
                entityId: messageId,
              }).catch(err => console.error('Failed to notify coaches about message:', err))
            }

            // Check for user mentions (@username pattern)
            const mentionRegex = /@(\w+)/g
            const mentionTexts: string[] = []
            let match
            while ((match = mentionRegex.exec(content)) !== null) {
              mentionTexts.push(match[1].toLowerCase())
            }

            // Notify mentioned users
            if (mentionTexts.length > 0) {
              // Find users by display_name (case-insensitive) who are team members
              const allTeamUserIds = [...guardianUserIds, ...coachUserIds]
              
              if (allTeamUserIds.length > 0) {
                const { data: teamUsers } = await supabase
                  .from('users')
                  .select('id, display_name, email')
                  .in('id', allTeamUserIds)

                if (teamUsers) {
                  // Match mentions to users by display_name (case-insensitive)
                  const mentionedUserIds: string[] = []
                  for (const user of teamUsers) {
                    if (user.id === authorId) continue
                    const displayNameLower = (user.display_name || '').toLowerCase()
                    if (mentionTexts.some(mention => displayNameLower.includes(mention))) {
                      mentionedUserIds.push(user.id)
                    }
                  }

                  if (mentionedUserIds.length > 0) {
                    // Determine role for each mentioned user
                    const { data: orgMembers } = await supabase
                      .from('organization_members')
                      .select('user_id, role')
                      .eq('org_id', teamData.org_id)
                      .in('user_id', mentionedUserIds)

                    const mentionedByRole: Record<string, string[]> = { guardian: [], coach: [] }
                    for (const member of orgMembers || []) {
                      const role = member.role === 'parent' ? 'guardian' : member.role
                      if (role === 'guardian' || role === 'coach') {
                        mentionedByRole[role].push(member.user_id)
                      }
                    }

                    // Notify mentioned guardians
                    if (mentionedByRole.guardian.length > 0) {
                      await notifyUsers({
                        userIds: mentionedByRole.guardian,
                        orgId: teamData.org_id,
                        teamId,
                        action: 'user_mentioned',
                        roleContext: 'guardian',
                        title: 'You were mentioned',
                        body: `You were mentioned in a message: ${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                        linkUrl: `/portal/messages?team=${teamId}`,
                        entityType: 'message',
                        entityId: messageId,
                        presentation: 'info',
                      }).catch(err => console.error('Failed to notify mentioned guardians:', err))
                    }

                    // Notify mentioned coaches
                    if (mentionedByRole.coach.length > 0) {
                      await notifyUsers({
                        userIds: mentionedByRole.coach,
                        orgId: teamData.org_id,
                        teamId,
                        action: 'user_mentioned',
                        roleContext: 'coach',
                        title: 'You were mentioned',
                        body: `You were mentioned in a message: ${content.trim().substring(0, 100)}${content.length > 100 ? '...' : ''}`,
                        linkUrl: `/portal/messages?team=${teamId}`,
                        entityType: 'message',
                        entityId: messageId,
                        presentation: 'info',
                      }).catch(err => console.error('Failed to notify mentioned coaches:', err))
                    }
                  }
                }
              }
            }
          }
        } catch (notifErr) {
          // Don't fail message creation if notification fails
          console.error('Error sending message notifications:', notifErr)
        }

        debug.perf.end('messagesService.createMessage')
        debug.flow('MessagesService.createMessage', 'Message created successfully', { teamId, messageId })
        console.groupEnd()
        return { data: result as unknown as Message, error: null }
    } catch (err) {
        debug.perf.end('messagesService.createMessage')
        const error = err instanceof Error ? err : new Error('Unknown error')
        debug.error('MessagesService.createMessage', 'Failed to create message', { error: err, teamId, authorId })
        console.groupEnd()
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
): Promise<{ data: NotificationRecord[]; error: Error | null }> {
    console.groupCollapsed(`%cgetNotifications: ${context.userId}`, 'color: #666; font-weight: bold;');
    debug.data('MessagesService.getNotifications', 'Request', { userId: context.userId, limit })
    debug.perf.start('messagesService.getNotifications')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            const data = getNotificationsForUser(context.userId).map(mapFakeNotification)
            const sliced = typeof limit === 'number' ? data.slice(0, limit) : data
            debug.perf.end('messagesService.getNotifications')
            debug.data('MessagesService.getNotifications', 'Response (fake)', { userId: context.userId, notificationCount: sliced.length })
            console.groupEnd()
            return { data: sliced, error: null }
        }
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

        const records = (data ?? []).map(mapDbNotification)
        debug.perf.end('messagesService.getNotifications')
        debug.data('MessagesService.getNotifications', 'Response', { userId: context.userId, notificationCount: records.length })
        console.groupEnd()
        return { data: records, error: null }
    } catch (err) {
        debug.perf.end('messagesService.getNotifications')
        // Handle PostgrestError with code PGRST116 (relation does not exist)
        if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST116') {
            debug.data('MessagesService.getNotifications', 'Response (table not found)', { userId: context.userId })
            console.groupEnd()
            console.warn('[getNotifications] user_notifications table not found, returning empty array')
            return { data: [], error: null }
        }
        debug.error('MessagesService.getNotifications', 'Failed to get notifications', { error: err, userId: context.userId })
        console.groupEnd()
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function getUnreadCount(
    context: UserContext
): Promise<{ data: number; error: Error | null }> {
    debug.data('MessagesService.getUnreadCount', 'Request', { userId: context.userId })
    debug.perf.start('messagesService.getUnreadCount')

    try {
        if (USE_FAKE_DATA) {
            const count = getUnreadNotificationCount(context.userId)
            debug.perf.end('messagesService.getUnreadCount')
            debug.data('MessagesService.getUnreadCount', 'Response (fake)', { userId: context.userId, count })
            return { data: count, error: null }
        }
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
        debug.perf.end('messagesService.getUnreadCount')
        debug.data('MessagesService.getUnreadCount', 'Response', { userId: context.userId, count: count || 0 })
        return { data: count || 0, error: null }
    } catch (err) {
        debug.perf.end('messagesService.getUnreadCount')
        // Handle PostgrestError with code PGRST116 (relation does not exist)
        if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST116') {
            debug.data('MessagesService.getUnreadCount', 'Response (table not found)', { userId: context.userId })
            console.warn('[getUnreadCount] user_notifications table not found, returning 0')
            return { data: 0, error: null }
        }
        debug.error('MessagesService.getUnreadCount', 'Failed to get unread count', { error: err, userId: context.userId })
        return { data: 0, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function markNotificationRead(
    context: UserContext,
    notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
    debug.flow('MessagesService.markNotificationRead', 'Marking notification as read', { notificationId, userId: context.userId })
    debug.perf.start('messagesService.markNotificationRead')

    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('messagesService.markNotificationRead')
            debug.flow('MessagesService.markNotificationRead', 'Notification marked as read (fake)', { notificationId })
            return { success: true, error: null }
        }
        type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
        const updateData = { read_at: new Date().toISOString() } satisfies NotificationUpdate
        const { error } = await supabase
            .from('user_notifications')
            .update(updateData)
            .eq('id', notificationId)
            .eq('user_id', context.userId)

        if (error) throw error
        
        // Log read event metrics
        const { data: notification } = await supabase
          .from('user_notifications')
          .select('action, entity_type, entity_id, created_at')
          .eq('id', notificationId)
          .single()
        
        debug.perf.end('messagesService.markNotificationRead')
        debug.flow('MessagesService.markNotificationRead', 'Notification marked as read successfully', {
          notificationId,
          action: notification?.action,
          entityType: notification?.entity_type,
          timeToRead: notification?.created_at
            ? Math.round((Date.now() - new Date(notification.created_at).getTime()) / 1000)
            : null,
        })
        return { success: true, error: null }
    } catch (err) {
        debug.perf.end('messagesService.markNotificationRead')
        debug.error('MessagesService.markNotificationRead', 'Failed to mark notification as read', { error: err, notificationId })
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

export async function markAllNotificationsRead(
    context: UserContext
): Promise<{ success: boolean; error: Error | null }> {
    console.groupCollapsed(`%cmarkAllNotificationsRead: ${context.userId}`, 'color: #666; font-weight: bold;');
    debug.flow('MessagesService.markAllNotificationsRead', 'Marking all notifications as read', { userId: context.userId })
    debug.perf.start('messagesService.markAllNotificationsRead')

    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('messagesService.markAllNotificationsRead')
            debug.flow('MessagesService.markAllNotificationsRead', 'All notifications marked as read (fake)', { userId: context.userId })
            console.groupEnd()
            return { success: true, error: null }
        }
        type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
        const updateData = { read_at: new Date().toISOString() } satisfies NotificationUpdate
        const { error } = await supabase
            .from('user_notifications')
            .update(updateData)
            .eq('user_id', context.userId)
            .is('read_at', null)

        if (error) throw error
        
        // Log read event metrics
        const { count } = await supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', context.userId)
          .not('read_at', 'is', null)
        
        debug.perf.end('messagesService.markAllNotificationsRead')
        debug.flow('MessagesService.markAllNotificationsRead', 'All notifications marked as read successfully', {
          userId: context.userId,
          totalReadCount: count || 0,
        })
        console.groupEnd()
        return { success: true, error: null }
    } catch (err) {
        debug.perf.end('messagesService.markAllNotificationsRead')
        debug.error('MessagesService.markAllNotificationsRead', 'Failed to mark all notifications as read', { error: err, userId: context.userId })
        console.groupEnd()
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Notification Creation (typed actions)
// ============================================================================

export async function createNotification(
    _context: UserContext,
    input: NotificationCreateInput
): Promise<NotificationCreateResult> {
    console.groupCollapsed(`%ccreateNotification: ${input.action}`, 'color: #666; font-weight: bold;');
    debug.flow('MessagesService.createNotification', 'Creating notification', { userId: input.userId, orgId: input.orgId, action: input.action })
    debug.perf.start('messagesService.createNotification')

    // Validate required params
    if (!input.userId || !input.orgId) {
        debug.perf.end('messagesService.createNotification')
        debug.error('MessagesService.createNotification', 'Validation failed', { error: 'missing_userId_or_orgId' })
        console.groupEnd()
        return { success: false, error: new Error('Missing userId or orgId for notification creation') }
    }

    if (!VALID_ACTIONS.has(input.action)) {
        debug.perf.end('messagesService.createNotification')
        debug.error('MessagesService.createNotification', 'Validation failed', { error: 'unsupported_action', action: input.action })
        console.groupEnd()
        return { success: false, error: new Error(`Unsupported notification action: ${input.action}`) }
    }

    const normalizedRole = input.roleContext === 'parent' ? 'guardian' : input.roleContext

    if (!isRoleAllowedForAction(input.action, input.roleContext)) {
        debug.perf.end('messagesService.createNotification')
        debug.error('MessagesService.createNotification', 'Validation failed', { error: 'action_not_allowed_for_role', action: input.action, role: input.roleContext })
        console.groupEnd()
        return {
            success: false,
            error: new Error(`Action ${input.action} is not allowed for role ${input.roleContext}`),
        }
    }

    const presentation = input.presentation ?? defaultPresentationForAction(input.action)
    const dedupeKey = buildDedupeKey(input)

    try {
        if (USE_FAKE_DATA) {
            const nowIso = new Date().toISOString()
            const fake: FakeNotification = {
                id: `fake-notification-${Date.now()}`,
                user_id: input.userId,
                org_id: input.orgId,
                team_id: input.teamId ?? null,
                action: input.action,
                role_context: normalizedRole,
                title: input.title,
                body: input.body,
                presentation_type: presentation,
                entity_type: input.entityType ?? null,
                entity_id: input.entityId ?? null,
                link_url: input.linkUrl ?? null,
                metadata: input.metadata ?? null,
                dedupe_key: dedupeKey,
                read_at: null,
                created_at: nowIso,
            }
            // Avoid duplicate based on dedupe_key
            const exists = fakeNotifications.some((n) => n.dedupe_key === dedupeKey && n.user_id === input.userId)
            if (!exists) {
                fakeNotifications.push(fake)
            }
            debug.perf.end('messagesService.createNotification')
            debug.flow('MessagesService.createNotification', 'Notification created (fake)', { userId: input.userId, action: input.action })
            console.groupEnd()
            return { success: true, error: null }
        }
        type NotificationInsert = Database['public']['Tables']['user_notifications']['Insert']
        const insertData: NotificationInsert = {
            user_id: input.userId,
            org_id: input.orgId,
            team_id: input.teamId ?? null,
            action: input.action,
            role_context: normalizedRole,
            presentation_type: presentation,
            entity_type: (input.entityType ?? null) as NotificationEntityType | null,
            entity_id: input.entityId ?? null,
            link_url: input.linkUrl ?? null,
            metadata: (input.metadata ?? null) as any,
            payload: (input.metadata ?? null) as any,
            title: input.title,
            body: input.body,
            dedupe_key: dedupeKey,
            type: input.action, // keep legacy column populated for compatibility
        }

        const { error } = await supabase.from('user_notifications').insert(insertData)
        if (error) throw error
        debug.perf.end('messagesService.createNotification')
        debug.flow('MessagesService.createNotification', 'Notification created successfully', { userId: input.userId, action: input.action })
        console.groupEnd()
        return { success: true, error: null }
    } catch (err) {
        debug.perf.end('messagesService.createNotification')
        debug.error('MessagesService.createNotification', 'Failed to create notification', { error: err, userId: input.userId, action: input.action })
        console.groupEnd()
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error creating notification'),
        }
    }
}
