import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VideoCard from './VideoCard'
import type { Video } from '@/types/video'

const mockVideo: Video = {
  id: 'v1',
  title: 'Game Highlights',
  category: 'game',
  status: 'ready',
  duration_seconds: 120,
  thumbnail_url: null,
  mux_asset_id: null,
  mux_playback_id: null,
  visibility: 'team',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  athlete_ids: [],
  org_id: 'o1',
  team_id: 't1',
  created_by_user_id: 'u1',
}

describe('VideoCard', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    test('renders video title', () => {
      render(<VideoCard video={mockVideo} />)
      expect(screen.getByText('Game Highlights')).toBeInTheDocument()
    })

    test('shows READY status badge', () => {
      render(<VideoCard video={mockVideo} />)
      expect(screen.getByText('READY')).toBeInTheDocument()
    })

    test('shows processing status when processing', () => {
      render(<VideoCard video={{ ...mockVideo, status: 'processing' }} />)
      expect(screen.getByText('PROCESSING')).toBeInTheDocument()
    })
  })
})
