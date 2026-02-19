import type {
  VideoAthleteLink,
  VideoBookmark,
  VideoComment,
  VideoNote,
  VideoNoteScope,
} from '@/types/video'
import { DEMO_USER_IDS } from '../config'
import { getAllMockVideos } from './mockVideos'
import {
  CHILD_AIDEN_PATEL_ID,
  CHILD_EMMA_JOHNSON_ID,
  CHILD_ETHAN_WILLIAMS_ID,
  CHILD_LIAM_JOHNSON_ID,
  CHILD_MASON_RODRIGUEZ_ID,
  CHILD_NOAH_SMITH_ID,
  CHILD_SOPHIA_CHEN_ID,
  getChildById,
  getChildIdsForUser,
  getUserById,
} from './fakeUsers'

type ViewerRole = 'parent' | 'athlete' | 'coach' | 'org_admin' | 'staff'

interface ViewerContext {
  userId?: string
  roles?: ViewerRole[]
}

interface MockCommentInput {
  content: string
  timestamp?: number
  parentId?: string
}

interface MockNoteInput {
  title?: string
  content: string
  timestamp_start?: number
  timestamp_end?: number
  scope?: VideoNoteScope
  is_pinned?: boolean
  drawing_data?: Record<string, unknown>
  target_athlete_ids?: string[]
}

type BookmarkRecord = VideoBookmark

const ADMIN_ONLY_ID = DEMO_USER_IDS['admin-only@example.com']
const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']
const PARENT_ONLY_ID = DEMO_USER_IDS['parent-only@example.com']
const PARENT_ADMIN_ID = DEMO_USER_IDS['parent-admin@example.com']

const DEFAULT_AUTHOR = {
  id: COACH_ONLY_ID,
  display_name: 'Coach Staff',
  first_name: 'Coach',
  last_name: 'Staff',
}

const VIDEO_DURATION_BY_ID = new Map<string, number>(
  getAllMockVideos().map((video) => [
    video.id,
    Math.max(0, Math.floor(video.duration_seconds ?? video.duration ?? 0)),
  ])
)

const MOCK_VIDEO_ATHLETE_LINKS_SEED: VideoAthleteLink[] = [
  { id: 'mock-vlink-001', video_id: 'mock-video-1', athlete_id: CHILD_EMMA_JOHNSON_ID, link_type: 'featured', start_time_seconds: 2, end_time_seconds: 4, created_by: COACH_ONLY_ID, created_at: '2026-02-01T15:00:00Z' },
  { id: 'mock-vlink-002', video_id: 'mock-video-1', athlete_id: CHILD_SOPHIA_CHEN_ID, link_type: 'appears', start_time_seconds: 0, end_time_seconds: null, created_by: COACH_ONLY_ID, created_at: '2026-02-01T15:00:00Z' },
  { id: 'mock-vlink-003', video_id: 'mock-video-1', athlete_id: CHILD_AIDEN_PATEL_ID, link_type: 'appears', start_time_seconds: 0, end_time_seconds: null, created_by: COACH_ONLY_ID, created_at: '2026-02-01T15:00:00Z' },
  { id: 'mock-vlink-004', video_id: 'mock-video-2', athlete_id: CHILD_EMMA_JOHNSON_ID, link_type: 'featured', start_time_seconds: 1, end_time_seconds: 3, created_by: COACH_ONLY_ID, created_at: '2026-02-03T17:45:00Z' },
  { id: 'mock-vlink-005', video_id: 'mock-video-2', athlete_id: CHILD_SOPHIA_CHEN_ID, link_type: 'appears', start_time_seconds: 0, end_time_seconds: null, created_by: COACH_ONLY_ID, created_at: '2026-02-03T17:45:00Z' },
  { id: 'mock-vlink-006', video_id: 'mock-video-3', athlete_id: CHILD_LIAM_JOHNSON_ID, link_type: 'featured', start_time_seconds: 2, end_time_seconds: 5, created_by: COACH_ONLY_ID, created_at: '2026-02-04T12:00:00Z' },
  { id: 'mock-vlink-007', video_id: 'mock-video-3', athlete_id: CHILD_NOAH_SMITH_ID, link_type: 'appears', start_time_seconds: 0, end_time_seconds: null, created_by: COACH_ONLY_ID, created_at: '2026-02-04T12:00:00Z' },
  { id: 'mock-vlink-008', video_id: 'mock-video-3', athlete_id: CHILD_ETHAN_WILLIAMS_ID, link_type: 'highlight', start_time_seconds: 6, end_time_seconds: 8, created_by: COACH_ONLY_ID, created_at: '2026-02-04T12:00:00Z' },
  { id: 'mock-vlink-009', video_id: 'mock-video-4', athlete_id: CHILD_EMMA_JOHNSON_ID, link_type: 'featured', start_time_seconds: 3, end_time_seconds: 8, created_by: COACH_ONLY_ID, created_at: '2026-02-06T09:30:00Z' },
  { id: 'mock-vlink-010', video_id: 'mock-video-4', athlete_id: CHILD_LIAM_JOHNSON_ID, link_type: 'appears', start_time_seconds: 0, end_time_seconds: null, created_by: COACH_ONLY_ID, created_at: '2026-02-06T09:30:00Z' },
  { id: 'mock-vlink-011', video_id: 'mock-video-5', athlete_id: CHILD_EMMA_JOHNSON_ID, link_type: 'appears', start_time_seconds: null, end_time_seconds: null, created_by: ADMIN_ONLY_ID, created_at: '2026-02-07T10:30:00Z' },
  { id: 'mock-vlink-012', video_id: 'mock-video-5', athlete_id: CHILD_MASON_RODRIGUEZ_ID, link_type: 'appears', start_time_seconds: null, end_time_seconds: null, created_by: ADMIN_ONLY_ID, created_at: '2026-02-07T10:30:00Z' },
]

const MOCK_VIDEO_NOTES_SEED: VideoNote[] = [
  {
    id: 'mock-note-001',
    video_id: 'mock-video-1',
    author_id: COACH_ONLY_ID,
    title: 'Great first touch',
    content: 'At 01:14 Emma opens up her body early and keeps the dribble under control.',
    timestamp_start: 2,
    timestamp_end: 3,
    scope: 'guardians',
    is_pinned: true,
    drawing_data: null,
    created_at: '2026-02-01T15:10:00Z',
    updated_at: '2026-02-01T15:10:00Z',
    targets: [
      {
        id: 'mock-note-target-001',
        note_id: 'mock-note-001',
        athlete_id: CHILD_EMMA_JOHNSON_ID,
        created_at: '2026-02-01T15:10:00Z',
      },
    ],
  },
  {
    id: 'mock-note-002',
    video_id: 'mock-video-1',
    author_id: COACH_ONLY_ID,
    title: 'Press trigger cue',
    content: 'Team shape is strongest when the first defender presses on the second touch.',
    timestamp_start: 4,
    timestamp_end: 5,
    scope: 'all',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-01T15:18:00Z',
    updated_at: '2026-02-01T15:18:00Z',
  },
  {
    id: 'mock-note-003',
    video_id: 'mock-video-1',
    author_id: ADMIN_ONLY_ID,
    title: 'Clip for staff packet',
    content: 'Use this moment for the spring parent meeting recap.',
    timestamp_start: 6,
    timestamp_end: null,
    scope: 'coaches',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-01T15:22:00Z',
    updated_at: '2026-02-01T15:22:00Z',
  },
  {
    id: 'mock-note-004',
    video_id: 'mock-video-2',
    author_id: COACH_ONLY_ID,
    title: 'Passing rhythm',
    content: 'Excellent tempo after the second setup cone. Keep this same pace.',
    timestamp_start: 1,
    timestamp_end: 2,
    scope: 'all',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-03T17:58:00Z',
    updated_at: '2026-02-03T17:58:00Z',
  },
  {
    id: 'mock-note-005',
    video_id: 'mock-video-2',
    author_id: COACH_ONLY_ID,
    title: 'Personal feedback',
    content: 'Emma keeps her hips square and sees both passing lanes clearly.',
    timestamp_start: 3,
    timestamp_end: 4,
    scope: 'guardians',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-03T18:03:00Z',
    updated_at: '2026-02-03T18:03:00Z',
    targets: [
      {
        id: 'mock-note-target-002',
        note_id: 'mock-note-005',
        athlete_id: CHILD_EMMA_JOHNSON_ID,
        created_at: '2026-02-03T18:03:00Z',
      },
    ],
  },
  {
    id: 'mock-note-006',
    video_id: 'mock-video-3',
    author_id: COACH_ONLY_ID,
    title: 'Core control',
    content: 'Liam maintains alignment during the second plank transition.',
    timestamp_start: 3,
    timestamp_end: 5,
    scope: 'guardians',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-04T12:10:00Z',
    updated_at: '2026-02-04T12:10:00Z',
    targets: [
      {
        id: 'mock-note-target-003',
        note_id: 'mock-note-006',
        athlete_id: CHILD_LIAM_JOHNSON_ID,
        created_at: '2026-02-04T12:10:00Z',
      },
    ],
  },
  {
    id: 'mock-note-007',
    video_id: 'mock-video-3',
    author_id: ADMIN_ONLY_ID,
    title: 'Training block summary',
    content: 'Good consistency in station work and transitions.',
    timestamp_start: 7,
    timestamp_end: 8,
    scope: 'all',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-04T12:15:00Z',
    updated_at: '2026-02-04T12:15:00Z',
  },
  {
    id: 'mock-note-008',
    video_id: 'mock-video-4',
    author_id: COACH_ONLY_ID,
    title: 'Confidence clip',
    content: 'Great carry and finish sequence. Save this for confidence review.',
    timestamp_start: 4,
    timestamp_end: 6,
    scope: 'guardians',
    is_pinned: true,
    drawing_data: null,
    created_at: '2026-02-06T09:45:00Z',
    updated_at: '2026-02-06T09:45:00Z',
    targets: [
      {
        id: 'mock-note-target-004',
        note_id: 'mock-note-008',
        athlete_id: CHILD_EMMA_JOHNSON_ID,
        created_at: '2026-02-06T09:45:00Z',
      },
    ],
  },
  {
    id: 'mock-note-009',
    video_id: 'mock-video-4',
    author_id: PARENT_ADMIN_ID,
    title: 'Family share pick',
    content: 'This moment is a great one to share with grandparents.',
    timestamp_start: 8,
    timestamp_end: null,
    scope: 'all',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-06T09:52:00Z',
    updated_at: '2026-02-06T09:52:00Z',
  },
  {
    id: 'mock-note-010',
    video_id: 'mock-video-5',
    author_id: ADMIN_ONLY_ID,
    title: 'Ceremony notes',
    content: 'Strong athlete introductions and excellent crowd engagement.',
    timestamp_start: 6,
    timestamp_end: 9,
    scope: 'all',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-07T10:42:00Z',
    updated_at: '2026-02-07T10:42:00Z',
  },
  {
    id: 'mock-note-011',
    video_id: 'mock-video-5',
    author_id: COACH_ONLY_ID,
    title: 'Personal feedback',
    content: 'Emma stays composed on the ball and scans before the pass.',
    timestamp_start: 12,
    timestamp_end: 14,
    scope: 'guardians',
    is_pinned: false,
    drawing_data: null,
    created_at: '2026-02-07T10:46:00Z',
    updated_at: '2026-02-07T10:46:00Z',
    targets: [
      {
        id: 'mock-note-target-005',
        note_id: 'mock-note-011',
        athlete_id: CHILD_EMMA_JOHNSON_ID,
        created_at: '2026-02-07T10:46:00Z',
      },
    ],
  },
]

const MOCK_VIDEO_BOOKMARKS_SEED: BookmarkRecord[] = [
  { id: 'mock-bookmark-001', video_id: 'mock-video-1', user_id: PARENT_ONLY_ID, timestamp_seconds: 2, label: 'Emma first touch', visibility: 'private', created_at: '2026-02-01T17:00:00Z', updated_at: '2026-02-01T17:00:00Z' },
  { id: 'mock-bookmark-002', video_id: 'mock-video-1', user_id: PARENT_ONLY_ID, timestamp_seconds: 4, label: 'Team press shape', visibility: 'private', created_at: '2026-02-01T17:05:00Z', updated_at: '2026-02-01T17:05:00Z' },
  { id: 'mock-bookmark-003', video_id: 'mock-video-2', user_id: PARENT_ONLY_ID, timestamp_seconds: 3, label: 'Best passing rep', visibility: 'private', created_at: '2026-02-03T19:00:00Z', updated_at: '2026-02-03T19:00:00Z' },
  { id: 'mock-bookmark-004', video_id: 'mock-video-4', user_id: PARENT_ONLY_ID, timestamp_seconds: 5, label: 'Highlight finish', visibility: 'private', created_at: '2026-02-06T13:00:00Z', updated_at: '2026-02-06T13:00:00Z' },
  { id: 'mock-bookmark-005', video_id: 'mock-video-1', user_id: ADMIN_ONLY_ID, timestamp_seconds: 6, label: 'Parent meeting clip', visibility: 'private', created_at: '2026-02-01T18:30:00Z', updated_at: '2026-02-01T18:30:00Z' },
  { id: 'mock-bookmark-006', video_id: 'mock-video-3', user_id: ADMIN_ONLY_ID, timestamp_seconds: 7, label: 'Training summary', visibility: 'private', created_at: '2026-02-04T13:10:00Z', updated_at: '2026-02-04T13:10:00Z' },
  { id: 'mock-bookmark-007', video_id: 'mock-video-1', user_id: COACH_ONLY_ID, timestamp_seconds: 3, label: 'Transition to press', visibility: 'private', created_at: '2026-02-01T16:40:00Z', updated_at: '2026-02-01T16:40:00Z' },
  { id: 'mock-bookmark-008', video_id: 'mock-video-5', user_id: PARENT_ADMIN_ID, timestamp_seconds: 12, label: 'Ceremony highlight', visibility: 'private', created_at: '2026-02-07T11:00:00Z', updated_at: '2026-02-07T11:00:00Z' },
]

const MOCK_VIDEO_COMMENTS_SEED: VideoComment[] = [
  {
    id: 'mock-comment-001',
    video_id: 'mock-video-1',
    author_id: COACH_ONLY_ID,
    parent_comment_id: null,
    content: 'Great defensive recovery at 02:12.',
    timestamp_seconds: 4,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-01T15:30:00Z',
    updated_at: '2026-02-01T15:30:00Z',
  },
  {
    id: 'mock-comment-002',
    video_id: 'mock-video-1',
    author_id: PARENT_ONLY_ID,
    parent_comment_id: 'mock-comment-001',
    content: 'Loved this sequence, thanks for calling it out.',
    timestamp_seconds: null,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-01T16:12:00Z',
    updated_at: '2026-02-01T16:12:00Z',
  },
  {
    id: 'mock-comment-003',
    video_id: 'mock-video-1',
    author_id: ADMIN_ONLY_ID,
    parent_comment_id: null,
    content: 'Please include this in weekly recap.',
    timestamp_seconds: 6,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-01T16:20:00Z',
    updated_at: '2026-02-01T16:20:00Z',
  },
  {
    id: 'mock-comment-004',
    video_id: 'mock-video-2',
    author_id: COACH_ONLY_ID,
    parent_comment_id: null,
    content: 'Passing channels are cleaner from 02:40 onward.',
    timestamp_seconds: 3,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-03T18:20:00Z',
    updated_at: '2026-02-03T18:20:00Z',
  },
  {
    id: 'mock-comment-005',
    video_id: 'mock-video-2',
    author_id: PARENT_ONLY_ID,
    parent_comment_id: 'mock-comment-004',
    content: 'Noticed the same thing. Great improvement.',
    timestamp_seconds: null,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-03T18:31:00Z',
    updated_at: '2026-02-03T18:31:00Z',
  },
  {
    id: 'mock-comment-006',
    video_id: 'mock-video-3',
    author_id: ADMIN_ONLY_ID,
    parent_comment_id: null,
    content: 'Program-wide training quality is looking strong.',
    timestamp_seconds: 7,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-04T12:25:00Z',
    updated_at: '2026-02-04T12:25:00Z',
  },
  {
    id: 'mock-comment-007',
    video_id: 'mock-video-4',
    author_id: COACH_ONLY_ID,
    parent_comment_id: null,
    content: 'This is a perfect confidence-building clip.',
    timestamp_seconds: 5,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-06T09:57:00Z',
    updated_at: '2026-02-06T09:57:00Z',
  },
  {
    id: 'mock-comment-008',
    video_id: 'mock-video-5',
    author_id: ADMIN_ONLY_ID,
    parent_comment_id: null,
    content: 'Use this section for sponsor thank-you highlights.',
    timestamp_seconds: 8,
    is_edited: false,
    deleted_at: null,
    created_at: '2026-02-07T10:49:00Z',
    updated_at: '2026-02-07T10:49:00Z',
  },
]

const athleteLinkStore: VideoAthleteLink[] = MOCK_VIDEO_ATHLETE_LINKS_SEED
  .map(sanitizeAthleteLinkTimestamps)
  .map(cloneAthleteLink)
const noteStore: VideoNote[] = MOCK_VIDEO_NOTES_SEED
  .map(sanitizeNoteTimestamps)
  .map(cloneNote)
const bookmarkStore: BookmarkRecord[] = MOCK_VIDEO_BOOKMARKS_SEED
  .map(sanitizeBookmarkTimestamp)
  .map(cloneBookmark)
const commentStore: VideoComment[] = MOCK_VIDEO_COMMENTS_SEED
  .map(sanitizeCommentTimestamp)
  .map(cloneComment)

let runtimeNoteCounter = 1000
let runtimeBookmarkCounter = 1000
let runtimeCommentCounter = 1000
let runtimeTargetCounter = 1000
const bookmarkSeededUsers = new Set<string>()
const DEFAULT_BOOKMARK_USER_IDS = [PARENT_ONLY_ID, PARENT_ADMIN_ID, ADMIN_ONLY_ID, COACH_ONLY_ID]

bootstrapCuratedVideoInteractions()

export function getMockVideoAthleteLinks(videoId: string): VideoAthleteLink[] {
  return athleteLinkStore
    .filter((link) => link.video_id === videoId)
    .map(sanitizeAthleteLinkTimestamps)
    .map(enrichAthleteLink)
}

export function getMockVideoInteractionCounts(videoId: string, userId?: string): {
  notes: number
  comments: number
  bookmarks: number
} {
  if (userId) ensureUserBookmarkSeed(userId)

  const notes = noteStore.filter((note) => note.video_id === videoId).length
  const comments = commentStore.filter((comment) => comment.video_id === videoId).length
  const bookmarks = userId
    ? bookmarkStore.filter((bookmark) => bookmark.video_id === videoId && bookmark.user_id === userId).length
    : 0

  return { notes, comments, bookmarks }
}

export function getMockVideoNotes(
  videoId: string,
  viewer: ViewerContext = {}
): VideoNote[] {
  const notes = noteStore
    .filter((note) => note.video_id === videoId)
    .map(sanitizeNoteTimestamps)
    .map(enrichNote)
    .filter((note) => canViewNote(note, viewer))
    .sort((a, b) => {
      const aTs = a.timestamp_start ?? Number.MAX_SAFE_INTEGER
      const bTs = b.timestamp_start ?? Number.MAX_SAFE_INTEGER
      if (aTs !== bTs) return aTs - bTs
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  return notes
}

export function createMockVideoNote(
  videoId: string,
  userId: string,
  input: MockNoteInput
): VideoNote {
  const now = new Date().toISOString()
  const id = `mock-note-runtime-${++runtimeNoteCounter}`
  const scope = input.scope ?? 'coaches'
  const targetIds = input.target_athlete_ids ?? []

  const note: VideoNote = sanitizeNoteTimestamps({
    id,
    video_id: videoId,
    author_id: userId,
    title: input.title?.trim() || null,
    content: input.content,
    timestamp_start: input.timestamp_start ?? null,
    timestamp_end: input.timestamp_end ?? null,
    scope,
    is_pinned: input.is_pinned ?? false,
    drawing_data: (input.drawing_data as VideoNote['drawing_data']) ?? null,
    created_at: now,
    updated_at: now,
    targets: targetIds.map((athleteId) => ({
      id: `mock-note-target-runtime-${++runtimeTargetCounter}`,
      note_id: id,
      athlete_id: athleteId,
      created_at: now,
    })),
  })

  noteStore.push(note)
  return enrichNote(note)
}

export function updateMockVideoNote(noteId: string, updates: Partial<VideoNote>): boolean {
  const index = noteStore.findIndex((note) => note.id === noteId)
  if (index < 0) return false

  const current = noteStore[index]
  noteStore[index] = sanitizeNoteTimestamps({
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
    targets: updates.targets ? updates.targets.map(cloneNoteTarget) : current.targets,
  })
  return true
}

export function deleteMockVideoNote(noteId: string): boolean {
  const index = noteStore.findIndex((note) => note.id === noteId)
  if (index < 0) return false
  noteStore.splice(index, 1)
  return true
}

export function getMockVideoBookmarks(videoId: string, userId: string): VideoBookmark[] {
  ensureUserBookmarkSeed(userId)

  return bookmarkStore
    .filter((bookmark) => bookmark.video_id === videoId && bookmark.user_id === userId)
    .map(sanitizeBookmarkTimestamp)
    .map(cloneBookmark)
    .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
}

export function createMockVideoBookmark(
  videoId: string,
  userId: string,
  timestamp: number,
  label?: string
): VideoBookmark {
  const now = new Date().toISOString()
  const bookmark: BookmarkRecord = sanitizeBookmarkTimestamp({
    id: `mock-bookmark-runtime-${++runtimeBookmarkCounter}`,
    video_id: videoId,
    user_id: userId,
    timestamp_seconds: timestamp,
    label: label?.trim() || null,
    visibility: 'private',
    created_at: now,
    updated_at: now,
  })
  bookmarkStore.push(bookmark)
  return cloneBookmark(bookmark)
}

export function updateMockVideoBookmark(bookmarkId: string, updates: Partial<VideoBookmark>): boolean {
  const index = bookmarkStore.findIndex((bookmark) => bookmark.id === bookmarkId)
  if (index < 0) return false
  bookmarkStore[index] = sanitizeBookmarkTimestamp({
    ...bookmarkStore[index],
    ...updates,
    updated_at: new Date().toISOString(),
  })
  return true
}

export function deleteMockVideoBookmark(bookmarkId: string): boolean {
  const index = bookmarkStore.findIndex((bookmark) => bookmark.id === bookmarkId)
  if (index < 0) return false
  bookmarkStore.splice(index, 1)
  return true
}

export function getMockVideoComments(videoId: string): VideoComment[] {
  return commentStore
    .filter((comment) => comment.video_id === videoId)
    .map(sanitizeCommentTimestamp)
    .map(enrichComment)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function createMockVideoComment(
  videoId: string,
  authorId: string,
  input: MockCommentInput
): VideoComment {
  const now = new Date().toISOString()
  const comment: VideoComment = sanitizeCommentTimestamp({
    id: `mock-comment-runtime-${++runtimeCommentCounter}`,
    video_id: videoId,
    author_id: authorId,
    parent_comment_id: input.parentId ?? null,
    content: input.content,
    timestamp_seconds: input.timestamp ?? null,
    is_edited: false,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  })
  commentStore.push(comment)
  return enrichComment(comment)
}

export function updateMockVideoComment(commentId: string, content: string): boolean {
  const index = commentStore.findIndex((comment) => comment.id === commentId)
  if (index < 0) return false
  commentStore[index] = {
    ...commentStore[index],
    content,
    is_edited: true,
    updated_at: new Date().toISOString(),
  }
  return true
}

export function deleteMockVideoComment(commentId: string): boolean {
  const index = commentStore.findIndex((comment) => comment.id === commentId)
  if (index < 0) return false
  commentStore.splice(index, 1)
  return true
}

function ensureUserBookmarkSeed(userId: string): void {
  if (bookmarkSeededUsers.has(userId)) return
  bookmarkSeededUsers.add(userId)

  const now = new Date().toISOString()
  const bookmarkLabels = [
    'Opening sequence',
    'Strong transition',
    'Best team shape',
    'Defensive recovery',
    'Finishing chance',
    'Coach highlight',
  ]

  for (const [videoId, duration] of VIDEO_DURATION_BY_ID.entries()) {
    if (duration <= 0) continue
    const desiredCount = Math.min(3, Math.max(1, duration))
    const existing = bookmarkStore.filter(
      (bookmark) => bookmark.user_id === userId && bookmark.video_id === videoId
    )
    const usedTimestamps = new Set(existing.map((bookmark) => bookmark.timestamp_seconds))
    const candidates = getTimestampCandidates(videoId)

    for (const candidate of candidates) {
      if (existing.length >= desiredCount) break
      if (usedTimestamps.has(candidate)) continue

      const seeded = sanitizeBookmarkTimestamp({
        id: `mock-bookmark-seed-${userId.slice(0, 8)}-${videoId}-${existing.length + 1}`,
        video_id: videoId,
        user_id: userId,
        timestamp_seconds: candidate,
        label: bookmarkLabels[(existing.length + videoId.length) % bookmarkLabels.length],
        visibility: 'private',
        created_at: now,
        updated_at: now,
      })
      bookmarkStore.push(seeded)
      existing.push(seeded)
      usedTimestamps.add(candidate)
    }
  }
}

function bootstrapCuratedVideoInteractions(): void {
  for (const videoId of VIDEO_DURATION_BY_ID.keys()) {
    ensureVideoNoteDensity(videoId)
    ensureVideoCommentDensity(videoId)
  }

  for (const userId of DEFAULT_BOOKMARK_USER_IDS) {
    ensureUserBookmarkSeed(userId)
  }
}

function ensureVideoNoteDensity(videoId: string): void {
  const currentGuardian = noteStore.filter((note) => note.video_id === videoId && note.scope === 'guardians')
  const currentTeam = noteStore.filter((note) => note.video_id === videoId && note.scope === 'all')

  const feedbackTexts = [
    'Great composure on the ball. Keep scanning before each pass.',
    'Strong body position and balance through contact.',
    'Excellent recovery run and communication with teammates.',
  ]
  const feedbackTitles = [
    'Composed decision-making',
    'Balanced body control',
    'Recovery effort',
    'Ball awareness',
  ]
  const teamTexts = [
    'Team spacing is clean during transition moments.',
    'Excellent bench energy and communication from everyone.',
    'Tempo improved once the group kept two-touch movement.',
  ]
  const teamTitles = [
    'Transition spacing',
    'Communication standard',
    'Tempo improvement',
    'Collective shape',
  ]

  const timestamps = getTimestampCandidates(videoId)
  const primaryAthleteId =
    athleteLinkStore.find((link) => link.video_id === videoId)?.athlete_id ?? CHILD_EMMA_JOHNSON_ID
  const now = new Date().toISOString()

  for (let i = currentGuardian.length; i < 3; i += 1) {
    const targeted = i % 2 === 0
    noteStore.push(
      sanitizeNoteTimestamps({
        id: `mock-note-auto-${++runtimeNoteCounter}`,
        video_id: videoId,
        author_id: COACH_ONLY_ID,
        title: feedbackTitles[(i + videoId.length) % feedbackTitles.length],
        content: feedbackTexts[i % feedbackTexts.length],
        timestamp_start: timestamps[i % timestamps.length],
        timestamp_end: timestamps[(i + 1) % timestamps.length],
        scope: 'guardians',
        is_pinned: false,
        drawing_data: null,
        created_at: now,
        updated_at: now,
        targets: targeted
          ? [
              {
                id: `mock-note-target-auto-${++runtimeTargetCounter}`,
                note_id: `mock-note-auto-${runtimeNoteCounter}`,
                athlete_id: primaryAthleteId,
                created_at: now,
              },
            ]
          : [],
      })
    )
  }

  for (let i = currentTeam.length; i < 3; i += 1) {
    noteStore.push(
      sanitizeNoteTimestamps({
        id: `mock-note-auto-${++runtimeNoteCounter}`,
        video_id: videoId,
        author_id: ADMIN_ONLY_ID,
        title: teamTitles[(i + videoId.length) % teamTitles.length],
        content: teamTexts[i % teamTexts.length],
        timestamp_start: timestamps[(i + 1) % timestamps.length],
        timestamp_end: timestamps[(i + 2) % timestamps.length],
        scope: 'all',
        is_pinned: false,
        drawing_data: null,
        created_at: now,
        updated_at: now,
      })
    )
  }
}

function ensureVideoCommentDensity(videoId: string): void {
  const current = commentStore.filter((comment) => comment.video_id === videoId)
  const targetCount = 5
  if (current.length >= targetCount) return

  const commentTexts = [
    'Nice sequence here.',
    'Great awareness from the group.',
    'Love the pace in this stretch.',
    'This clip is useful for review night.',
    'Excellent response after the reset.',
  ]
  const timestamps = getTimestampCandidates(videoId)
  const topLevelIds: string[] = current
    .filter((comment) => comment.parent_comment_id === null)
    .map((comment) => comment.id)
  const authors = [COACH_ONLY_ID, PARENT_ONLY_ID, ADMIN_ONLY_ID, PARENT_ADMIN_ID]
  const now = new Date().toISOString()

  for (let i = current.length; i < targetCount; i += 1) {
    const reply = i % 3 === 2 && topLevelIds.length > 0
    const parentId = reply ? topLevelIds[topLevelIds.length - 1] : null
    const id = `mock-comment-auto-${++runtimeCommentCounter}`
    const next = sanitizeCommentTimestamp({
      id,
      video_id: videoId,
      author_id: authors[i % authors.length],
      parent_comment_id: parentId,
      content: commentTexts[i % commentTexts.length],
      timestamp_seconds: reply ? null : timestamps[i % timestamps.length],
      is_edited: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    })
    commentStore.push(next)
    current.push(next)
    if (!reply) topLevelIds.push(id)
  }
}

function getTimestampCandidates(videoId: string): number[] {
  const duration = VIDEO_DURATION_BY_ID.get(videoId) ?? 0
  const max = Math.max(0, duration - 1)
  const preferred = [0.15, 0.35, 0.5, 0.7, 0.85, 0.95].map((p) => Math.floor(max * p))
  const unique = Array.from(new Set(preferred.filter((n) => n >= 0 && n <= max))).sort((a, b) => a - b)

  if (unique.length === 0) return [0]
  if (!unique.includes(0)) unique.unshift(0)
  if (!unique.includes(max)) unique.push(max)
  return unique
}

function clampTimestampForVideo(videoId: string, value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null

  const raw = Math.floor(value)
  const duration = VIDEO_DURATION_BY_ID.get(videoId)

  if (!duration || duration <= 0) return null
  if (raw < 0) return 0
  if (raw >= duration) return Math.max(0, duration - 1)

  return raw
}

function sanitizeAthleteLinkTimestamps(link: VideoAthleteLink): VideoAthleteLink {
  const start = clampTimestampForVideo(link.video_id, link.start_time_seconds)
  let end = clampTimestampForVideo(link.video_id, link.end_time_seconds)
  if (start !== null && end !== null && end < start) end = start
  return {
    ...link,
    start_time_seconds: start,
    end_time_seconds: end,
  }
}

function sanitizeNoteTimestamps(note: VideoNote): VideoNote {
  const start = clampTimestampForVideo(note.video_id, note.timestamp_start)
  let end = clampTimestampForVideo(note.video_id, note.timestamp_end)
  if (start !== null && end !== null && end < start) end = start
  return {
    ...note,
    timestamp_start: start,
    timestamp_end: end,
  }
}

function sanitizeBookmarkTimestamp(bookmark: VideoBookmark): VideoBookmark {
  const next = clampTimestampForVideo(bookmark.video_id, bookmark.timestamp_seconds)
  return {
    ...bookmark,
    timestamp_seconds: next ?? 0,
  }
}

function sanitizeCommentTimestamp(comment: VideoComment): VideoComment {
  return {
    ...comment,
    timestamp_seconds: clampTimestampForVideo(comment.video_id, comment.timestamp_seconds),
  }
}

function canViewNote(note: VideoNote, viewer: ViewerContext): boolean {
  if (viewer.roles && canManageAllNotes(viewer.roles)) return true
  if (note.scope === 'all') return true

  if (!viewer.userId) return false
  if (note.scope === 'private' || note.scope === 'coaches') {
    return note.author_id === viewer.userId
  }

  if (note.scope === 'guardians') {
    const targets = note.targets ?? []
    if (targets.length === 0) return true
    const childIds = getChildIdsForUser(viewer.userId)
    if (childIds.length === 0) return true
    return targets.some((target) => childIds.includes(target.athlete_id))
  }

  return false
}

function canManageAllNotes(roles: ViewerRole[]): boolean {
  return roles.includes('org_admin') || roles.includes('coach') || roles.includes('staff')
}

function enrichAthleteLink(link: VideoAthleteLink): VideoAthleteLink {
  const child = getChildById(link.athlete_id)
  return {
    ...cloneAthleteLink(link),
    athlete: child
      ? {
          id: child.id,
          first_name: child.first_name,
          last_name: child.last_name,
          jersey_number: child.jersey_number,
          photo_url: child.photo_url,
        }
      : undefined,
  }
}

function enrichNote(note: VideoNote): VideoNote {
  const author = resolveAuthor(note.author_id)
  const targets = note.targets?.map((target) => {
    const child = getChildById(target.athlete_id)
    return {
      ...cloneNoteTarget(target),
      athlete: child
        ? {
            id: child.id,
            first_name: child.first_name,
            last_name: child.last_name,
          }
        : undefined,
    }
  })

  return {
    ...cloneNote(note),
    author,
    targets,
  }
}

function enrichComment(comment: VideoComment): VideoComment {
  return {
    ...cloneComment(comment),
    author: resolveAuthor(comment.author_id),
  }
}

function resolveAuthor(userId: string): {
  id: string
  display_name: string | null
  first_name: string
  last_name: string
} {
  const user = getUserById(userId)
  if (!user) return DEFAULT_AUTHOR

  const parts = user.display_name.trim().split(/\s+/)
  const first_name = parts[0] || 'Demo'
  const last_name = parts.length > 1 ? parts.slice(1).join(' ') : 'User'

  return {
    id: user.id,
    display_name: user.display_name,
    first_name,
    last_name,
  }
}

function cloneAthleteLink(link: VideoAthleteLink): VideoAthleteLink {
  return {
    ...link,
    athlete: link.athlete ? { ...link.athlete } : undefined,
  }
}

function cloneNoteTarget(target: NonNullable<VideoNote['targets']>[number]) {
  return {
    ...target,
    athlete: target.athlete ? { ...target.athlete } : undefined,
  }
}

function cloneNote(note: VideoNote): VideoNote {
  return {
    ...note,
    author: note.author ? { ...note.author } : undefined,
    targets: note.targets?.map(cloneNoteTarget),
  }
}

function cloneBookmark(bookmark: VideoBookmark): VideoBookmark {
  return { ...bookmark }
}

function cloneComment(comment: VideoComment): VideoComment {
  return {
    ...comment,
    author: comment.author ? { ...comment.author } : undefined,
    replies: comment.replies?.map(cloneComment),
  }
}
