import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RSVPButton from './RSVPButton'
import { TestWrapper } from '@/test/helpers/renderWithProviders'

describe('RSVPButton', () => {
  let user: ReturnType<typeof userEvent.setup>

  const defaultProps = {
    eventId: 'e1',
    childId: 'c1',
    childName: 'Alex',
    currentStatus: 'unknown' as const,
    onStatusChange: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders without crashing', () => {
      render(<RSVPButton {...defaultProps} />, { wrapper: TestWrapper })
      expect(screen.getByText('Alex')).toBeInTheDocument()
      expect(screen.getByText(/no response/i)).toBeInTheDocument()
    })

    test('shows current status label', () => {
      render(<RSVPButton {...defaultProps} currentStatus="going" />, { wrapper: TestWrapper })
      expect(screen.getByText(/going/i)).toBeInTheDocument()
    })

    test('shows Running Late for late status', () => {
      render(<RSVPButton {...defaultProps} currentStatus="late" />, { wrapper: TestWrapper })
      expect(screen.getByText(/running late/i)).toBeInTheDocument()
    })
  })

  describe('user interactions', () => {
    test('opens dropdown when clicked', async () => {
      render(<RSVPButton {...defaultProps} />, { wrapper: TestWrapper })
      const button = screen.getByRole('button', { name: /no response/i })
      await user.click(button)
      expect(screen.getByRole('button', { name: /^going$/i })).toBeInTheDocument()
      expect(screen.getByText(/running late/i)).toBeInTheDocument()
    })

    test('calls onStatusChange when option selected', async () => {
      const onStatusChange = vi.fn().mockResolvedValue(undefined)
      render(<RSVPButton {...defaultProps} onStatusChange={onStatusChange} />, { wrapper: TestWrapper })
      await user.click(screen.getByRole('button', { name: /no response/i }))
      const goingOptions = screen.getAllByRole('button', { name: /^going$/i })
      await user.click(goingOptions[goingOptions.length - 1])
      expect(onStatusChange).toHaveBeenCalledWith('going')
    })

    test('closes dropdown when backdrop clicked', async () => {
      const { container } = render(<RSVPButton {...defaultProps} />, { wrapper: TestWrapper })
      await user.click(screen.getByRole('button', { name: /no response/i }))
      expect(screen.getByRole('button', { name: /^going$/i })).toBeInTheDocument()
      const backdrop = container.querySelector('.fixed.inset-0')
      expect(backdrop).toBeTruthy()
      await user.click(backdrop as HTMLElement)
      expect(screen.queryByRole('button', { name: /^going$/i })).not.toBeInTheDocument()
    })

    test('does not open when disabled', async () => {
      render(<RSVPButton {...defaultProps} disabled />, { wrapper: TestWrapper })
      const button = screen.getByRole('button', { name: /no response/i })
      await user.click(button)
      expect(screen.queryByText(/going/i)).not.toBeInTheDocument()
    })
  })
})
