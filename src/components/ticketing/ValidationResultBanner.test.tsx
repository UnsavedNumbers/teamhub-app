import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ValidationResultBanner } from '@/components/ticketing/ValidationResultBanner'
import { TestWrapper } from '@/test/helpers/renderWithProviders'
import { createMockValidateScanResponse } from '@/test/mocks/ticketing'

const mockPlaySound = vi.fn()
const mockTriggerHaptic = vi.fn()

vi.mock('@/utils/audio', () => ({
  playSound: (...args: unknown[]) => mockPlaySound(...args),
}))

vi.mock('@/utils/haptics', () => ({
  triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
}))

describe('ValidationResultBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('[TE-E2E-017] renders valid-ticket success state with success feedback', () => {
    render(
      <ValidationResultBanner
        result={createMockValidateScanResponse({ result: 'valid', ticket_type_name: 'VIP' })}
        onDismiss={vi.fn()}
      />,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Valid Ticket')).toBeInTheDocument()
    expect(screen.getByText('VIP')).toBeInTheDocument()
    expect(mockPlaySound).toHaveBeenCalledWith('success')
    expect(mockTriggerHaptic).toHaveBeenCalledWith('success')
  })

  test('[TE-E2E-018] renders already-used state with duplicate warning feedback', () => {
    render(
      <ValidationResultBanner
        result={createMockValidateScanResponse({ result: 'already_used', used_at: '2026-08-01T19:00:00.000Z' })}
        onDismiss={vi.fn()}
      />,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Already Used')).toBeInTheDocument()
    expect(mockPlaySound).toHaveBeenCalledWith('duplicate')
    expect(mockTriggerHaptic).toHaveBeenCalledWith('warning')
  })

  test('[TE-E2E-019] renders invalid-ticket state with error feedback', () => {
    render(
      <ValidationResultBanner
        result={createMockValidateScanResponse({ result: 'invalid', message: 'Token not found' })}
        onDismiss={vi.fn()}
      />,
      { wrapper: TestWrapper },
    )

    expect(screen.getByText('Invalid Ticket')).toBeInTheDocument()
    expect(screen.getByText('Token not found')).toBeInTheDocument()
    expect(mockPlaySound).toHaveBeenCalledWith('error')
    expect(mockTriggerHaptic).toHaveBeenCalledWith('error')
  })
})
