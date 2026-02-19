/**
 * Unit Tests - Join Links Service
 * 
 * Tests for joinLinksService functions including:
 * - createJoinLink
 * - getJoinLinkByToken
 * - submitJoinRequest
 * - reviewJoinRequest
 * - getJoinLinks
 * - getJoinRequests
 * - deleteJoinLink
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../../lib/supabase'
import {
    createJoinLink,
    getJoinLinkByToken,
    submitJoinRequest,
    reviewJoinRequest,
    getJoinLinks,
    getJoinRequests,
    deleteJoinLink,
} from '../joinLinksService'

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
    supabase: {
        rpc: vi.fn(),
        from: vi.fn(),
        auth: {
            getUser: vi.fn(),
        },
    },
}))

describe('joinLinksService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createJoinLink', () => {
        it('should create a join link successfully', async () => {
            const mockRpc = vi.fn().mockResolvedValue({
                data: [{ token: 'test-token', expires_at: '2026-12-31T00:00:00Z' }],
                error: null,
            })

            const mockAuth = vi.fn().mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            ;(supabase.rpc as any) = mockRpc
            ;(supabase.auth.getUser as any) = mockAuth

            const result = await createJoinLink({
                orgId: 'org-123',
                teamId: 'team-123',
                autoApprove: false,
                expiresInDays: 7,
            })

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.token).toBe('test-token')
            expect(result.data?.url).toContain('test-token')
        })

        it('should handle RPC errors', async () => {
            const mockRpc = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RPC failed' },
            })

            ;(supabase.rpc as any) = mockRpc

            const result = await createJoinLink({
                orgId: 'org-123',
            })

            expect(result.error).toBeTruthy()
            expect(result.data).toBeNull()
        })
    })

    describe('getJoinLinkByToken', () => {
        it('should retrieve join link by token', async () => {
            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: 'link-123',
                                token: 'test-token',
                                org_id: 'org-123',
                                expires_at: '2026-12-31T00:00:00Z',
                            },
                            error: null,
                        }),
                    }),
                }),
            })

            ;(supabase.from as any) = mockFrom

            const result = await getJoinLinkByToken('test-token')

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.token).toBe('test-token')
        })

        it('should detect expired links', async () => {
            const pastDate = new Date(Date.now() - 86400000).toISOString() // Yesterday
            
            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: {
                                id: 'link-123',
                                token: 'test-token',
                                expires_at: pastDate,
                            },
                            error: null,
                        }),
                    }),
                }),
            })

            ;(supabase.from as any) = mockFrom

            const result = await getJoinLinkByToken('test-token')

            expect(result.error).toBeTruthy()
            expect(result.error?.message).toContain('expired')
        })
    })

    describe('submitJoinRequest', () => {
        it('should submit join request successfully', async () => {
            const mockRpc = vi.fn().mockResolvedValue({
                data: [{
                    request_id: 'req-123',
                    status: 'pending',
                    message: 'Request submitted',
                }],
                error: null,
            })

            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { org_id: 'org-123' },
                            error: null,
                        }),
                    }),
                }),
            })

            const mockAuth = vi.fn().mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            ;(supabase.rpc as any) = mockRpc
            ;(supabase.from as any) = mockFrom
            ;(supabase.auth.getUser as any) = mockAuth

            const result = await submitJoinRequest({
                linkToken: 'test-token',
                childId: 'child-123',
                seasonId: 'season-123',
            })

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.requestId).toBe('req-123')
            expect(result.data?.status).toBe('pending')
        })
    })

    describe('reviewJoinRequest', () => {
        it('should approve join request', async () => {
            const mockRpc = vi.fn().mockResolvedValue({
                data: [{
                    request_id: 'req-123',
                    status: 'approved',
                    message: 'Request approved',
                }],
                error: null,
            })

            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { org_id: 'org-123' },
                            error: null,
                        }),
                    }),
                }),
            })

            const mockAuth = vi.fn().mockResolvedValue({
                data: { user: { id: 'admin-123' } },
            })

            ;(supabase.rpc as any) = mockRpc
            ;(supabase.from as any) = mockFrom
            ;(supabase.auth.getUser as any) = mockAuth

            const result = await reviewJoinRequest({
                requestId: 'req-123',
                approve: true,
            })

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.status).toBe('approved')
        })

        it('should deny join request with reason', async () => {
            const mockRpc = vi.fn().mockResolvedValue({
                data: [{
                    request_id: 'req-123',
                    status: 'denied',
                    message: 'Request denied',
                }],
                error: null,
            })

            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                            data: { org_id: 'org-123' },
                            error: null,
                        }),
                    }),
                }),
            })

            const mockAuth = vi.fn().mockResolvedValue({
                data: { user: { id: 'admin-123' } },
            })

            ;(supabase.rpc as any) = mockRpc
            ;(supabase.from as any) = mockFrom
            ;(supabase.auth.getUser as any) = mockAuth

            const result = await reviewJoinRequest({
                requestId: 'req-123',
                approve: false,
                decisionReason: 'Team is full',
            })

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.status).toBe('denied')
        })
    })

    describe('getJoinLinks', () => {
        it('should retrieve all join links for org', async () => {
            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({
                            data: [
                                { id: 'link-1', org_id: 'org-123', token: 'token-1' },
                                { id: 'link-2', org_id: 'org-123', token: 'token-2' },
                            ],
                            error: null,
                        }),
                    }),
                }),
            })

            ;(supabase.from as any) = mockFrom

            const result = await getJoinLinks('org-123')

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.length).toBe(2)
        })
    })

    describe('getJoinRequests', () => {
        it('should retrieve join requests with status filter', async () => {
            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            order: vi.fn().mockResolvedValue({
                                data: [
                                    { id: 'req-1', status: 'pending' },
                                    { id: 'req-2', status: 'pending' },
                                ],
                                error: null,
                            }),
                        }),
                    }),
                }),
            })

            ;(supabase.from as any) = mockFrom

            const result = await getJoinRequests('org-123', 'pending')

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.length).toBe(2)
        })
    })

    describe('deleteJoinLink', () => {
        it('should delete join link successfully', async () => {
            const mockFrom = vi.fn().mockReturnValue({
                delete: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({
                        error: null,
                    }),
                }),
            })

            ;(supabase.from as any) = mockFrom

            const result = await deleteJoinLink('link-123')

            expect(result.error).toBeNull()
            expect(result.success).toBe(true)
        })
    })
})
