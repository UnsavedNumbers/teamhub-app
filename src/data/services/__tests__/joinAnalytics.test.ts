/**
 * Unit Tests - Join Analytics Service
 * 
 * Tests for joinAnalytics functions including:
 * - getJoinAnalytics
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../../lib/supabase'
import { getJoinAnalytics } from '../joinAnalytics'

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}))

describe('joinAnalytics', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getJoinAnalytics', () => {
        it('should calculate invite metrics correctly', async () => {
            const mockInvites = [
                { status: 'pending', created_at: '2026-01-01' },
                { status: 'accepted', created_at: '2026-01-02' },
                { status: 'accepted', created_at: '2026-01-03' },
                { status: 'expired', created_at: '2026-01-04' },
                { status: 'cancelled', created_at: '2026-01-05' },
            ]

            const mockRequests: any[] = []
            const mockEvents: any[] = []

            const mockFrom = vi.fn()
                .mockReturnValueOnce({
                    select: vi.fn().mockResolvedValue({
                        data: mockInvites,
                        error: null,
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockResolvedValue({
                        data: mockRequests,
                        error: null,
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockResolvedValue({
                                    data: mockEvents,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                in: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        eq: vi.fn().mockResolvedValue({
                                            data: [],
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockReturnValue({
                                    count: vi.fn().mockResolvedValue({
                                        count: 10,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    }),
                })

            ;(supabase.from as any) = mockFrom

            const result = await getJoinAnalytics('org-123', 30)

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.invite_metrics.total_sent).toBe(5)
            expect(result.data?.invite_metrics.total_accepted).toBe(2)
            expect(result.data?.invite_metrics.total_pending).toBe(1)
            expect(result.data?.invite_metrics.total_expired).toBe(1)
            expect(result.data?.invite_metrics.total_cancelled).toBe(1)
            expect(result.data?.invite_metrics.acceptance_rate).toBe(40) // 2/5 * 100
        })

        it('should calculate join request metrics correctly', async () => {
            const mockInvites: any[] = []

            const mockRequests = [
                { status: 'pending', created_at: '2026-01-01' },
                { status: 'approved', created_at: '2026-01-02' },
                { status: 'approved', created_at: '2026-01-03' },
                { status: 'denied', created_at: '2026-01-04' },
            ]

            const mockEvents: any[] = []

            const mockFrom = vi.fn()
                .mockReturnValueOnce({
                    select: vi.fn().mockResolvedValue({
                        data: mockInvites,
                        error: null,
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockResolvedValue({
                        data: mockRequests,
                        error: null,
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockResolvedValue({
                                    data: mockEvents,
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                in: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        eq: vi.fn().mockResolvedValue({
                                            data: [],
                                            error: null,
                                        }),
                                    }),
                                }),
                            }),
                        }),
                    }),
                })
                .mockReturnValueOnce({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                gte: vi.fn().mockReturnValue({
                                    count: vi.fn().mockResolvedValue({
                                        count: 0,
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    }),
                })

            ;(supabase.from as any) = mockFrom

            const result = await getJoinAnalytics('org-123', 30)

            expect(result.error).toBeNull()
            expect(result.data).toBeTruthy()
            expect(result.data?.join_request_metrics.total_submitted).toBe(4)
            expect(result.data?.join_request_metrics.total_approved).toBe(2)
            expect(result.data?.join_request_metrics.total_denied).toBe(1)
            expect(result.data?.join_request_metrics.total_pending).toBe(1)
            // Approval rate: 2 approved / (2 approved + 1 denied) = 66.7%
            expect(result.data?.join_request_metrics.approval_rate).toBeCloseTo(66.67, 1)
        })

        it('should handle errors gracefully', async () => {
            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                }),
            })

            ;(supabase.from as any) = mockFrom

            const result = await getJoinAnalytics('org-123', 30)

            expect(result.error).toBeTruthy()
            expect(result.data).toBeNull()
        })
    })
})
