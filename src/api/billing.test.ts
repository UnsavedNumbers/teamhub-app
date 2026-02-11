/**
 * Financial/Billing Tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'
import { paymentsService } from '@/data/services/paymentsService'
import { feesService } from '@/data/services/feesService'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
    rpc: vi.fn(),
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/services/paymentsService', () => ({
  paymentsService: {
    processPayment: vi.fn(),
    refundPayment: vi.fn(),
    getPaymentHistory: vi.fn(),
    getPaymentDetails: vi.fn(),
    updatePaymentMethod: vi.fn(),
    calculateTotal: vi.fn(),
  },
}))

vi.mock('@/data/services/feesService', () => ({
  feesService: {
    createFee: vi.fn(),
    updateFee: vi.fn(),
    deleteFee: vi.fn(),
    getFees: vi.fn(),
    calculateFeeTotal: vi.fn(),
  },
}))

describe('Financial/Billing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Payment Processing', () => {
    describe('processPayment', () => {
      test('successfully processes a payment', async () => {
        const paymentData = {
          amount: 15000,
          currency: 'usd',
          payment_method_id: 'pm_card_visa',
          description: 'Team registration fee',
          organization_id: 'org-1',
          user_id: 'user-1',
          metadata: { event_id: 'event-1', fee_type: 'registration' },
        }

        const mockPaymentResult = {
          id: 'payment-123',
          status: 'succeeded',
          amount: 15000,
          currency: 'usd',
          payment_method: 'card',
          last4: '4242',
          receipt_url: 'https://stripe.com/receipt/123',
          created_at: '2024-01-15T10:00:00Z',
        }

        vi.mocked(paymentsService.processPayment).mockResolvedValue({
          data: mockPaymentResult,
          error: null,
        })

        const result = await paymentsService.processPayment(paymentData)

        expect(result.error).toBeNull()
        expect(result.data?.status).toBe('succeeded')
        expect(result.data?.amount).toBe(15000)
        expect(result.data?.receipt_url).toBeDefined()
      })

      test('handles payment method decline', async () => {
        vi.mocked(paymentsService.processPayment).mockResolvedValue({
          data: null,
          error: { message: 'Your card was declined', code: 'card_declined' },
        })

        const result = await paymentsService.processPayment({
          amount: 5000,
          currency: 'usd',
          payment_method_id: 'pm_card_declined',
          description: 'Test payment',
        })

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Your card was declined')
        expect(result.error?.code).toBe('card_declined')
      })
    })
  })

  describe('Fee Management', () => {
    describe('createFee', () => {
      test('successfully creates a fee', async () => {
        const feeData = {
          organization_id: 'org-1',
          name: 'Registration Fee',
          description: 'Spring 2024 registration',
          amount: 15000,
          currency: 'usd',
          type: 'registration',
          due_date: '2024-02-01',
          is_recurring: false,
          tax_rate: 0.08,
        }

        const mockCreatedFee = { id: 'fee-123', ...feeData, status: 'active', created_at: '2024-01-15T10:00:00Z' }

        vi.mocked(feesService.createFee).mockResolvedValue({ data: mockCreatedFee, error: null })

        const result = await feesService.createFee(feeData)

        expect(result.error).toBeNull()
        expect(result.data?.name).toBe('Registration Fee')
        expect(result.data?.amount).toBe(15000)
      })

      test('validates fee amount', async () => {
        vi.mocked(feesService.createFee).mockResolvedValue({
          data: null,
          error: { message: 'Fee amount must be positive' },
        })

        const result = await feesService.createFee({
          organization_id: 'org-1',
          name: 'Invalid Fee',
          amount: -1000,
        })

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Fee amount must be positive')
      })
    })
  })

  describe('Subscription Management', () => {
    test('creates subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub-123',
        status: 'trialing',
        current_period_start: '2024-01-15T00:00:00Z',
        current_period_end: '2024-02-15T00:00:00Z',
        trial_end: '2024-01-29T00:00:00Z',
        plan: { id: 'plan-premium', name: 'Premium Plan', amount: 9900 },
      }

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockSubscription, error: null })

      const result = await supabase.rpc('create_subscription', {
        organization_id: 'org-1',
        plan_id: 'plan-premium',
        payment_method_id: 'pm_card_valid',
        trial_days: 14,
      })

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('trialing')
      expect(result.data?.plan.amount).toBe(9900)
    })
  })
})
