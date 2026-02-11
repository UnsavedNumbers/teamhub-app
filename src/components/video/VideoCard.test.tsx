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
  mux_upload_id: null,
  passthrough: null,
  visibility: 'team',
  aspect_ratio: null,
  resolution_tier: null,
  max_stored_resolution: null,
  max_stored_frame_rate: null,
  thumbnail_time_offset: null,
  team_id: 't1',
  season_id: null,
  event_id: null,
  program_id: null,
  level_id: null,
  sport_id: null,
  recorded_at: null,
  recording_location: null,
  uploaded_by: 'u1',
  upload_started_at: null,
  upload_completed_at: null,
  processing_started_at: null,
  processing_completed_at: null,
  error_type: null,
  error_message: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  description: null,
  org_id: 'o1',
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
