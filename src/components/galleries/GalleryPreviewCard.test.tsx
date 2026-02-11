import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GalleryPreviewCard } from './GalleryPreviewCard'
import type { Gallery } from '@/data/services/galleryService'

const mockGallery: Gallery = {
  id: 'g1',
  name: 'Season Photos',
  org_id: 'o1',
  gallery_type: 'team',
  entity_id: 't1',
  photo_count: 24,
  cover_url: null,
  cover_thumbnails: null,
  pending_count: 0,
  allow_contributions: false,
  require_approval: false,
  fans_can_see: false,
  is_system_generated: false,
  cover_generated_at: null,
  cover_generation_status: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('GalleryPreviewCard', () => {
  test('renders gallery name', () => {
    const onClick = vi.fn()
    render(<GalleryPreviewCard gallery={mockGallery} onClick={onClick} />)
    expect(screen.getByText('Season Photos')).toBeInTheDocument()
  })

  test('renders photo count', () => {
    const onClick = vi.fn()
    render(<GalleryPreviewCard gallery={mockGallery} onClick={onClick} />)
    expect(screen.getByText('24 photos')).toBeInTheDocument()
  })

  test('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<GalleryPreviewCard gallery={mockGallery} onClick={onClick} />)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
