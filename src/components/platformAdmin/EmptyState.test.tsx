import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  test('renders title', () => {
    render(<EmptyState title="No items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Add your first item." />)
    expect(screen.getByText('Add your first item.')).toBeInTheDocument()
  })

  test('calls action onClick when button clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Create', onClick }}
      />
    )
    await user.click(screen.getByRole('button', { name: /create/i }))
    expect(onClick).toHaveBeenCalled()
  })
})
