/**
 * Mock Videos Data Module
 *
 * Provides fake data for videos in demo mode.
 * Videos are linked to teams, athletes, events, and organizations.
 * All video assets are stored locally in /public/demo-assets/videos/
 */

import { DEMO_ORG_A_ID } from '../config'
import type { Video, VideoCategory, VideoStatus } from '@/types/video'

// ============================================================================
// Helper: Get local video asset URL
// ============================================================================

function getVideoAssetUrl(filename: string): string {
  return `/demo-assets/videos/${filename}`
}

function getVideoThumbnailUrl(filename: string): string {
  // Thumbnails use same filename with .jpg extension
  const baseName = filename.replace(/\.(mp4|webm|mov)$/i, '')
  return `/demo-assets/videos/${baseName}.jpg`
}

// ============================================================================
// Mock Videos Data
// ============================================================================

/**
 * Mock videos with local asset paths
 * Videos are organized by category and linked to teams/athletes
 */
export const MOCK_VIDEOS: Video[] = [
  // Game Videos
  {
    id: 'mock-video-1',
    org_id: DEMO_ORG_A_ID,
    title: 'Championship Game - Final Quarter',
    description: 'Exciting final quarter of the championship game with key plays',
    category: 'game',
    visibility: 'team',
    status: 'ready',
    mux_asset_id: null,
    mux_playback_id: null,
    mux_upload_id: null,
    passthrough: null,
    duration_seconds: 720,
    aspect_ratio: '16:9',
    resolution_tier: '1080p',
    max_stored_resolution: '1080p',
    max_stored_frame_rate: 30,
    thumbnail_url: getVideoThumbnailUrl('championship-game-final-quarter.mp4'),
    thumbnail_time_offset: 45,
    duration: 720,
    view_count: 125,
    team_id: 'team-1',
    season_id: null,
    event_id: 'event-tournament-1',
    program_id: null,
    level_id: null,
    sport_id: null,
    recorded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    recording_location: 'Riverside Sports Complex',
    uploaded_by: 'demo-coach',
    upload_started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    upload_completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
    processing_started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
    processing_completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
    error_type: null,
    error_message: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    // Local video file path (for demo mode)
    video_url: getVideoAssetUrl('championship-game-final-quarter.mp4'),
  } as Video & { video_url?: string },
  
  // Practice Videos
  {
    id: 'mock-video-2',
    org_id: DEMO_ORG_A_ID,
    title: 'Practice Session - Passing Drills',
    description: 'Team working on passing accuracy and communication',
    category: 'practice',
    visibility: 'team',
    status: 'ready',
    mux_asset_id: null,
    mux_playback_id: null,
    mux_upload_id: null,
    passthrough: null,
    duration_seconds: 480,
    aspect_ratio: '16:9',
    resolution_tier: '720p',
    max_stored_resolution: '720p',
    max_stored_frame_rate: 30,
    thumbnail_url: getVideoThumbnailUrl('practice-passing-drills.mp4'),
    thumbnail_time_offset: 30,
    duration: 480,
    view_count: 89,
    team_id: 'team-1',
    season_id: null,
    event_id: null,
    program_id: null,
    level_id: null,
    sport_id: null,
    recorded_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    recording_location: 'Practice Field A',
    uploaded_by: 'demo-coach',
    upload_started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    upload_completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
    processing_started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
    processing_completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(),
    error_type: null,
    error_message: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    video_url: getVideoAssetUrl('practice-passing-drills.mp4'),
  } as Video & { video_url?: string },
  
  // Training Videos
  {
    id: 'mock-video-3',
    org_id: DEMO_ORG_A_ID,
    title: 'Strength Training - Core Workout',
    description: 'Core strengthening exercises for athletes',
    category: 'training',
    visibility: 'organization',
    status: 'ready',
    mux_asset_id: null,
    mux_playback_id: null,
    mux_upload_id: null,
    passthrough: null,
    duration_seconds: 600,
    aspect_ratio: '16:9',
    resolution_tier: '1080p',
    max_stored_resolution: '1080p',
    max_stored_frame_rate: 30,
    thumbnail_url: getVideoThumbnailUrl('training-core-workout.mp4'),
    thumbnail_time_offset: 60,
    duration: 600,
    view_count: 156,
    team_id: null,
    season_id: null,
    event_id: null,
    program_id: null,
    level_id: null,
    sport_id: null,
    recorded_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    recording_location: 'Training Facility',
    uploaded_by: 'demo-coach',
    upload_started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    upload_completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000).toISOString(),
    processing_started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 1000).toISOString(),
    processing_completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 9 * 60 * 1000).toISOString(),
    error_type: null,
    error_message: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    video_url: getVideoAssetUrl('training-core-workout.mp4'),
  } as Video & { video_url?: string },
  
  // Highlight Videos
  {
    id: 'mock-video-4',
    org_id: DEMO_ORG_A_ID,
    title: 'Season Highlights 2024',
    description: 'Best moments from the 2024 season',
    category: 'highlight',
    visibility: 'guardians',
    status: 'ready',
    mux_asset_id: null,
    mux_playback_id: null,
    mux_upload_id: null,
    passthrough: null,
    duration_seconds: 300,
    aspect_ratio: '16:9',
    resolution_tier: '1080p',
    max_stored_resolution: '1080p',
    max_stored_frame_rate: 60,
    thumbnail_url: getVideoThumbnailUrl('highlights-season-2024.mp4'),
    thumbnail_time_offset: 15,
    duration: 300,
    view_count: 234,
    team_id: 'team-1',
    season_id: null,
    event_id: null,
    program_id: null,
    level_id: null,
    sport_id: null,
    recorded_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    recording_location: 'Various',
    uploaded_by: 'demo-coach',
    upload_started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    upload_completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
    processing_started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
    processing_completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 7 * 60 * 1000).toISOString(),
    error_type: null,
    error_message: null,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    video_url: getVideoAssetUrl('highlights-season-2024.mp4'),
  } as Video & { video_url?: string },
  
  // Event Videos
  {
    id: 'mock-video-5',
    org_id: DEMO_ORG_A_ID,
    title: 'Tournament Opening Ceremony',
    description: 'Opening ceremony and team introductions',
    category: 'event',
    visibility: 'organization',
    status: 'ready',
    mux_asset_id: null,
    mux_playback_id: null,
    mux_upload_id: null,
    passthrough: null,
    duration_seconds: 420,
    aspect_ratio: '16:9',
    resolution_tier: '720p',
    max_stored_resolution: '720p',
    max_stored_frame_rate: 30,
    thumbnail_url: getVideoThumbnailUrl('event-tournament-opening.mp4'),
    thumbnail_time_offset: 20,
    duration: 420,
    view_count: 178,
    team_id: null,
    season_id: null,
    event_id: 'event-tournament-1',
    program_id: null,
    level_id: null,
    sport_id: null,
    recorded_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    recording_location: 'Tournament Venue',
    uploaded_by: 'demo-org-admin',
    upload_started_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    upload_completed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
    processing_started_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
    processing_completed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(),
    error_type: null,
    error_message: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    video_url: getVideoAssetUrl('event-tournament-opening.mp4'),
  } as unknown as Video & { video_url?: string },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get mock videos for a specific organization
 */
export function getMockVideosForOrg(orgId: string): Video[] {
  return MOCK_VIDEOS.filter((v) => v.org_id === orgId)
}

/**
 * Get mock video by ID
 */
export function getMockVideoById(videoId: string): (Video & { video_url?: string }) | undefined {
  return MOCK_VIDEOS.find((v) => v.id === videoId)
}

/**
 * Get all mock videos (for demo mode)
 */
export function getAllMockVideos(): Video[] {
  return MOCK_VIDEOS
}

/**
 * Filter mock videos by category
 */
export function getMockVideosByCategory(category: VideoCategory): Video[] {
  return MOCK_VIDEOS.filter((v) => v.category === category)
}

/**
 * Filter mock videos by status
 */
export function getMockVideosByStatus(status: VideoStatus): Video[] {
  return MOCK_VIDEOS.filter((v) => v.status === status)
}

/**
 * Filter mock videos by team
 */
export function getMockVideosByTeam(teamId: string): Video[] {
  return MOCK_VIDEOS.filter((v) => v.team_id === teamId)
}
