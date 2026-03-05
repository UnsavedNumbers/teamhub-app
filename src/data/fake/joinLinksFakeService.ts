/**
 * Fake Join Links Service
 * 
 * Provides fake data for join link operations in demo mode.
 */

import type { JoinLink, JoinRequestResult } from '../services/joinLinksService'
import type { SubmitJoinRequestParams } from '../services/joinLinksService'
import { DEMO_ORG_A_ID } from '../config'

// In-memory store for fake join links
const joinLinksStore = new Map<string, JoinLink>()
const joinRequestsStore = new Map<string, any>()

// Initialize with a demo join link
function initializeDemoJoinLink(): void {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now
    
    const demoLink: JoinLink = {
        id: 'demo-join-link-001',
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        token: 'demo-join-token-12345',
        auto_approve: false,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        created_by_user_id: null,
        updated_at: null,
    }
    
    joinLinksStore.set('demo-join-token-12345', demoLink)
}

// Initialize on module load
initializeDemoJoinLink()

export async function getJoinLinkByToken(token: string): Promise<{ data: JoinLink | null; error: Error | null }> {
    try {
        // Check if token matches demo token
        if (token === 'demo-join-token-12345' || token.startsWith('demo-')) {
            const link = joinLinksStore.get('demo-join-token-12345')
            if (!link) {
                // Create a new demo link if not found
                initializeDemoJoinLink()
                const newLink = joinLinksStore.get('demo-join-token-12345')
                if (!newLink) {
                    return { data: null, error: new Error('Invalid join link') }
                }
                return { data: newLink, error: null }
            }
            
            // Check if expired
            const expiresAt = new Date(link.expires_at)
            if (expiresAt < new Date()) {
                return { data: null, error: new Error('This join link has expired') }
            }
            
            return { data: link, error: null }
        }
        
        return { data: null, error: new Error('Invalid join link') }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to get join link'),
        }
    }
}

export async function submitJoinRequest(
    params: SubmitJoinRequestParams
): Promise<{ data: JoinRequestResult | null; error: Error | null }> {
    try {
        // Validate token
        const linkResult = await getJoinLinkByToken(params.linkToken)
        if (linkResult.error || !linkResult.data) {
            return {
                data: null,
                error: new Error('Invalid or expired join link'),
            }
        }
        
        const link = linkResult.data
        
        // Check if expired
        const expiresAt = new Date(link.expires_at)
        if (expiresAt < new Date()) {
            return {
                data: null,
                error: new Error('This join link has expired'),
            }
        }
        
        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        // Create join request
        const requestId = `join-request-${Date.now()}`
        const status = link.auto_approve ? 'approved' : 'pending'
        
        joinRequestsStore.set(requestId, {
            id: requestId,
            link_token: params.linkToken,
            child_id: params.childId,
            season_id: params.seasonId,
            team_id: params.teamId,
            status,
            created_at: new Date().toISOString(),
        })
        
        const result: JoinRequestResult = {
            requestId: requestId,
            status: status as 'pending' | 'approved' | 'denied',
            message: status === 'approved' 
                ? 'Your join request has been approved! You now have access to the team.'
                : 'Your join request has been submitted and is pending approval.',
        }
        
        return { data: result, error: null }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to submit join request'),
        }
    }
}
