import type { Json } from '@/lib/supabase.extended.types'

/**
 * Video Library Domain Types
 * 
 * Centralized TypeScript types for the video library feature.
 * Supports Mux integration with direct uploads and signed playback.
 */

// ============================================================================
// Enums (mirroring database enums)
// ============================================================================

export type VideoCategory =
  | 'game'
  | 'practice'
  | 'training'
  | 'highlight'
  | 'event'
  | 'other'

export type VideoVisibility =
  | 'private'
  | 'team'
  | 'organization'
  | 'guardians'

export type VideoStatus =
  | 'pending_upload'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'errored'
  | 'deleted'

export type VideoTagType =
  | 'skill'
  | 'drill'
  | 'play'
  | 'custom'

export type VideoLinkType =
  | 'featured'
  | 'appears'
  | 'highlight'

export type VideoNoteScope =
  | 'private'
  | 'coaches'
  | 'guardians'
  | 'all'

export type VideoBookmarkVisibility =
  | 'private'
  | 'shared'

export type VideoReviewStatus =
  | 'requested'
  | 'in_progress'
  | 'completed'

// ============================================================================
// Core Video Model
// ============================================================================

export interface Video {
  id: string
  org_id: string
  title: string
  description: string | null
  category: VideoCategory
  visibility: VideoVisibility
  status: VideoStatus
  
  // Mux integration
  mux_asset_id: string | null
  mux_playback_id: string | null
  mux_upload_id: string | null
  passthrough: string | null
  
  // Metadata
  duration_seconds: number | null
  aspect_ratio: string | null
  resolution_tier: string | null
  max_stored_resolution: string | null
  max_stored_frame_rate: number | null
  thumbnail_url: string | null
  thumbnail_time_offset: number | null
  duration?: number | null
  view_count?: number | null
  
  // Associations
  team_id: string | null
  season_id: string | null
  event_id: string | null
  program_id: string | null
  level_id: string | null
  sport_id: string | null
  
  // Recording metadata
  recorded_at: string | null
  recording_location: string | null
  
  // Upload tracking
  uploaded_by: string
  upload_started_at: string | null
  upload_completed_at: string | null
  processing_started_at: string | null
  processing_completed_at: string | null
  
  // Error tracking
  error_type: string | null
  error_message: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null
  
  // Relations (optional, loaded via joins)
  team?: {
    id: string
    name: string
  }
  season?: {
    id: string
    name: string
  }
  event?: {
    id: string
    title: string
    type: string
  }
  program?: {
    id: string
    name: string
  }
  level?: {
    id: string
    name: string
  }
  sport?: {
    id: string
    name: string
    icon: string | null
  }
  uploader?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  
  // Aggregated relations
  tags?: VideoTagLink[]
  athlete_links?: VideoAthleteLink[]
  notes_count?: number
  comments_count?: number
  bookmarks_count?: number
}

// ============================================================================
// Video Tags
// ============================================================================

export interface VideoTag {
  id: string
  org_id: string
  name: string
  tag_type: VideoTagType
  color: string | null
  usage_count: number
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VideoTagLink {
  id: string
  video_id: string
  tag_id: string
  created_by: string | null
  created_at: string
  
  // Relations
  tag?: VideoTag
}

// ============================================================================
// Athlete Links
// ============================================================================

export interface VideoAthleteLink {
  id: string
  video_id: string
  athlete_id: string
  link_type: VideoLinkType
  start_time_seconds: number | null
  end_time_seconds: number | null
  created_by: string | null
  created_at: string
  
  // Relations
  athlete?: {
    id: string
    first_name: string
    last_name: string
    jersey_number: string | null
    photo_url: string | null
  }
}

// ============================================================================
// Video Notes (Timestamped Coach Notes)
// ============================================================================

export interface VideoNote {
  id: string
  video_id: string
  author_id: string
  title: string | null
  content: string
  timestamp_start: number | null
  timestamp_end: number | null
  scope: VideoNoteScope
  is_pinned: boolean
  drawing_data: Json | null
  created_at: string
  updated_at: string
  
  // Relations
  author?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  targets?: VideoNoteTarget[]
}

export interface VideoNoteTarget {
  id: string
  note_id: string
  athlete_id: string
  created_at: string
  
  // Relations
  athlete?: {
    id: string
    first_name: string
    last_name: string
  }
}

// ============================================================================
// Video Bookmarks (User-specific Timestamps)
// ============================================================================

export interface VideoBookmark {
  id: string
  video_id: string
  user_id: string
  timestamp_seconds: number
  label: string | null
  visibility: VideoBookmarkVisibility
  created_at: string
  updated_at: string
}

// ============================================================================
// Video Comments (Discussion Threads)
// ============================================================================

export interface VideoComment {
  id: string
  video_id: string
  author_id: string
  parent_comment_id: string | null
  content: string
  timestamp_seconds: number | null
  is_edited: boolean
  created_at: string
  updated_at: string
  
  // Relations
  author?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
  replies?: VideoComment[]
  reply_count?: number
}

// ============================================================================
// Video Reviews (Evaluation Workflow)
// ============================================================================

export interface VideoReview {
  id: string
  video_id: string
  athlete_id: string
  requested_by: string
  assigned_to: string | null
  status: VideoReviewStatus
  due_date: string | null
  completed_at: string | null
  feedback: string | null
  rating: number | null
  created_at: string
  updated_at: string
  
  // Relations
  video?: Video
  athlete?: {
    id: string
    first_name: string
    last_name: string
  }
  requester?: {
    id: string
    full_name: string
  }
  reviewer?: {
    id: string
    full_name: string
  }
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateVideoUploadRequest {
  title: string
  description?: string
  category?: VideoCategory
  visibility?: VideoVisibility
  team_id?: string
  season_id?: string
  event_id?: string
  program_id?: string
  level_id?: string
  sport_id?: string
  athlete_ids?: string[]
  recorded_at?: string
  recording_location?: string
}

export interface CreateVideoUploadResponse {
  video_id: string
  upload_url: string
  upload_id: string
}

export interface GetPlaybackTokenRequest {
  video_id?: string
  playback_id?: string
  type?: 'video' | 'thumbnail' | 'gif' | 'storyboard'
  expiration?: number
}

export interface GetPlaybackTokenResponse {
  playback_id: string
  stream_url: string
  thumbnail_url: string
  animated_gif_url: string
  storyboard_url: string
  token: string
  thumbnail_token: string
  storyboard_token: string
  expires_in: number
  video?: {
    id: string
    status: VideoStatus
  }
}

// ============================================================================
// Filter & Query Types
// ============================================================================

export interface VideoFilters {
  search?: string
  category?: VideoCategory | VideoCategory[]
  visibility?: VideoVisibility | VideoVisibility[]
  status?: VideoStatus | VideoStatus[]
  team_id?: string
  season_id?: string
  event_id?: string
  program_id?: string
  level_id?: string
  sport_id?: string
  athlete_id?: string
  uploaded_by?: string
  tag_ids?: string[]
  date_from?: string
  date_to?: string
}

export interface VideoPagination {
  page?: number
  limit?: number
  sort_by?: 'created_at' | 'title' | 'recorded_at' | 'duration_seconds'
  sort_order?: 'asc' | 'desc'
}

export interface VideoListResult {
  videos: Video[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface VideoCardProps {
  video: Video
  onPlay?: (video: Video) => void
  onEdit?: (video: Video) => void
  onDelete?: (video: Video) => void
  showActions?: boolean
  compact?: boolean
}

export interface VideoPlayerProps {
  videoId?: string
  playbackId?: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  startTime?: number
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  onError?: (error: Error) => void
}

export interface VideoUploaderProps {
  orgId: string
  teamId?: string
  defaultValues?: Partial<CreateVideoUploadRequest>
  onUploadStart?: (videoId: string) => void
  onUploadProgress?: (progress: number) => void
  onUploadComplete?: (videoId: string) => void
  onUploadError?: (error: Error) => void
  onCancel?: () => void
}

export interface VideoNoteComposerProps {
  videoId: string
  currentTime?: number
  defaultScope?: VideoNoteScope
  athleteOptions?: Array<{ id: string; name: string }>
  onSave?: (note: VideoNote) => void
  onCancel?: () => void
}

// ============================================================================
// Training Library Types (for instructional content)
// ============================================================================

export interface TrainingCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  parent_id: string | null
  sort_order: number
  children?: TrainingCategory[]
}

export interface TrainingVideo extends Video {
  training_category_id?: string
  skill_level?: 'beginner' | 'intermediate' | 'advanced'
  is_featured?: boolean
  view_count?: number
  completion_count?: number
}

// ============================================================================
// Guardian Portal Types
// ============================================================================

export interface GuardianVideoView {
  video: Video
  athlete: {
    id: string
    first_name: string
    last_name: string
    photo_url: string | null
  }
  link_type: VideoLinkType
  coach_notes?: VideoNote[]
  can_download: boolean
}

export interface AthleteVideoSummary {
  athlete_id: string
  athlete_name: string
  total_videos: number
  recent_videos: Video[]
  highlight_count: number
  evaluation_count: number
}

// ============================================================================
// Upload Progress Types (for UpChunk integration)
// ============================================================================

export interface UploadProgress {
  videoId: string
  uploadId: string
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number // 0-100
  bytesUploaded: number
  totalBytes: number
  error?: string
  startedAt: string
  completedAt?: string
}

export interface UploadQueueItem {
  file: File
  metadata: CreateVideoUploadRequest
  progress: UploadProgress | null
}
