/**
 * Video Components Index
 * 
 * Central export for all video-related components.
 */

// Core Components
export { default as VideoCard } from './VideoCard'
export { default as VideoPlayer, formatTime, type VideoPlayerRef } from './VideoPlayer'
export { default as TimestampedText } from './TimestampedText'
export { default as VideoUploader } from './VideoUploader'
export { default as VideoNoteCard } from './VideoNoteCard'
export { default as VideoNoteComposer } from './VideoNoteComposer'

// Notes Panel Components
export { default as NotesPanel } from './NotesPanel'
export { default as NoteComposer } from './NoteComposer'
export { default as NotesFeed } from './NotesFeed'
export { AccordionItem, AccordionGroup } from './Accordion'

// Video Library Feature Components
export { default as VideoCommentsPanel } from './VideoCommentsPanel'
export { default as VideoFavoriteButton } from './VideoFavoriteButton'
export { default as VideoShareModal } from './VideoShareModal'
export { default as VideoTagPicker } from './VideoTagPicker'
export { default as VideoBulkActionsBar } from './VideoBulkActionsBar'
export { default as VideoThumbnailSelector } from './VideoThumbnailSelector'
export { default as VideoFilterPanel } from './VideoFilterPanel'
export { default as VideoFilterBottomSheet } from './VideoFilterBottomSheet'
export { default as VideoSortDropdown } from './VideoSortDropdown'
export { default as VideoDownloadButton } from './VideoDownloadButton'

// Types re-export
export type { VideoFilters, Tag, Team, User } from './VideoFilterPanel'
export type { VideoFilters as MobileVideoFilters } from './VideoFilterBottomSheet'
export type { SortOption, SortField, SortDirection } from './VideoSortDropdown'
