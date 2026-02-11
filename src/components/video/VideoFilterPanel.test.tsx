import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VideoFilterPanel from './VideoFilterPanel'
import type { VideoFilters } from './VideoFilterPanel'

const defaultFilters: VideoFilters = {
  dateRange: { start: null, end: null },
  tagIds: [],
  status: [],
  type: [],
  teamId: null,
  uploadedBy: null,
  hasAthletes: null,
}

describe('VideoFilterPanel', () => {
  test('renders when open', () => {
    render(
      <VideoFilterPanel
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        isOpen
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument()
  })

  test('calls onClose when backdrop clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <VideoFilterPanel
        filters={defaultFilters}
        onFiltersChange={vi.fn()}
        isOpen
        onClose={onClose}
      />
    )
    const backdrop = container.querySelector('.fixed.inset-0 > div.bg-black\\/30')
    expect(backdrop).toBeTruthy()
    await user.click(backdrop as Element)
    expect(onClose).toHaveBeenCalled()
  })
})
