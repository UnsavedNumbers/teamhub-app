/**
 * VideoFilterBottomSheet Component
 * 
 * Mobile-friendly bottom sheet for video filters.
 * Provides the same filtering capabilities as the sidebar panel
 * but optimized for mobile touch interactions.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { cn } from '@/utils/cn'
import type { VideoCategory, VideoVisibility, VideoStatus } from '@/types/video'

export interface VideoFilters {
  category: VideoCategory | null
  visibility: VideoVisibility | null
  status: VideoStatus | null
  teamId: string | null
  athleteId: string | null
  tagIds: string[]
  dateRange: {
    start: string | null
    end: string | null
  }
}

interface VideoFilterBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  filters: VideoFilters
  onFiltersChange: (filters: VideoFilters) => void
  teams: Array<{ id: string; name: string }>
  athletes?: Array<{ id: string; name: string }>
  tags?: Array<{ id: string; name: string; type: string }>
}

const CATEGORIES: Array<{ value: VideoCategory; label: string; icon: string }> = [
  { value: 'game', label: 'Game', icon: 'sports' },
  { value: 'practice', label: 'Practice', icon: 'fitness_center' },
  { value: 'training', label: 'Training', icon: 'school' },
  { value: 'highlight', label: 'Highlight', icon: 'star' },
  { value: 'event', label: 'Event', icon: 'event' },
  { value: 'other', label: 'Other', icon: 'more_horiz' },
]

const VISIBILITIES: Array<{ value: VideoVisibility; label: string; icon: string }> = [
  { value: 'private', label: 'Private', icon: 'lock' },
  { value: 'team', label: 'Team Only', icon: 'group' },
  { value: 'organization', label: 'Organization', icon: 'apartment' },
  { value: 'guardians', label: 'Guardians', icon: 'family_restroom' },
]

const STATUSES: Array<{ value: VideoStatus; label: string; icon: string }> = [
  { value: 'ready', label: 'Ready', icon: 'check_circle' },
  { value: 'processing', label: 'Processing', icon: 'pending' },
  { value: 'uploading', label: 'Uploading', icon: 'cloud_upload' },
  { value: 'pending_upload', label: 'Pending', icon: 'schedule' },
  { value: 'errored', label: 'Error', icon: 'error' },
]

export default function VideoFilterBottomSheet({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  teams,
  athletes = [],
  tags = [],
}: VideoFilterBottomSheetProps) {
  const [localFilters, setLocalFilters] = useState<VideoFilters>(filters)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ startY: 0, currentY: 0, isDragging: false })
  
  // Sync with external filters when opening
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [isOpen, filters])
  
  // Handle drag to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragRef.current = {
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      isDragging: true
    }
  }, [])
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragRef.current.isDragging) return
    
    const currentY = e.touches[0].clientY
    const delta = currentY - dragRef.current.startY
    
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`
    }
    
    dragRef.current.currentY = currentY
  }, [])
  
  const handleTouchEnd = useCallback(() => {
    if (!dragRef.current.isDragging) return
    
    const delta = dragRef.current.currentY - dragRef.current.startY
    
    if (delta > 100) {
      onClose()
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
    
    dragRef.current.isDragging = false
  }, [onClose])
  
  // Apply filters
  const handleApply = useCallback(() => {
    onFiltersChange(localFilters)
    onClose()
  }, [localFilters, onFiltersChange, onClose])
  
  // Clear all filters
  const handleClear = useCallback(() => {
    const cleared: VideoFilters = {
      category: null,
      visibility: null,
      status: null,
      teamId: null,
      athleteId: null,
      tagIds: [],
      dateRange: { start: null, end: null }
    }
    setLocalFilters(cleared)
    onFiltersChange(cleared)
    onClose()
  }, [onFiltersChange, onClose])
  
  // Count active filters
  const activeFilterCount = [
    localFilters.category,
    localFilters.visibility,
    localFilters.status,
    localFilters.teamId,
    localFilters.athleteId,
    localFilters.tagIds.length > 0 ? true : null,
    localFilters.dateRange.start || localFilters.dateRange.end ? true : null
  ].filter(Boolean).length
  
  if (!isOpen) return null
  
  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col transition-transform"
      >
        {/* Drag Handle */}
        <div
          className="flex-shrink-0 py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-[var(--org-btn-primary-bg)] text-white rounded-full text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Icon name="close" size="text-xl" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Category */}
          <FilterSection title="Category">
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <ChipButton
                  key={cat.value}
                  icon={cat.icon}
                  label={cat.label}
                  selected={localFilters.category === cat.value}
                  onClick={() => setLocalFilters(prev => ({
                    ...prev,
                    category: prev.category === cat.value ? null : cat.value
                  }))}
                />
              ))}
            </div>
          </FilterSection>
          
          {/* Visibility */}
          <FilterSection title="Visibility">
            <div className="grid grid-cols-2 gap-2">
              {VISIBILITIES.map(vis => (
                <ChipButton
                  key={vis.value}
                  icon={vis.icon}
                  label={vis.label}
                  selected={localFilters.visibility === vis.value}
                  onClick={() => setLocalFilters(prev => ({
                    ...prev,
                    visibility: prev.visibility === vis.value ? null : vis.value
                  }))}
                />
              ))}
            </div>
          </FilterSection>
          
          {/* Status */}
          <FilterSection title="Status">
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map(status => (
                <ChipButton
                  key={status.value}
                  icon={status.icon}
                  label={status.label}
                  selected={localFilters.status === status.value}
                  onClick={() => setLocalFilters(prev => ({
                    ...prev,
                    status: prev.status === status.value ? null : status.value
                  }))}
                />
              ))}
            </div>
          </FilterSection>
          
          {/* Teams */}
          {teams.length > 0 && (
            <FilterSection title="Team">
              <div className="flex flex-wrap gap-2">
                {teams.map(team => (
                  <ChipButton
                    key={team.id}
                    icon="groups"
                    label={team.name}
                    selected={localFilters.teamId === team.id}
                    onClick={() => setLocalFilters(prev => ({
                      ...prev,
                      teamId: prev.teamId === team.id ? null : team.id
                    }))}
                  />
                ))}
              </div>
            </FilterSection>
          )}
          
          {/* Athletes */}
          {athletes.length > 0 && (
            <FilterSection title="Athlete">
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {athletes.map(athlete => (
                  <ChipButton
                    key={athlete.id}
                    icon="person"
                    label={athlete.name}
                    selected={localFilters.athleteId === athlete.id}
                    onClick={() => setLocalFilters(prev => ({
                      ...prev,
                      athleteId: prev.athleteId === athlete.id ? null : athlete.id
                    }))}
                  />
                ))}
              </div>
            </FilterSection>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <FilterSection title="Tags">
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {tags.map(tag => (
                  <ChipButton
                    key={tag.id}
                    icon="label"
                    label={tag.name}
                    selected={localFilters.tagIds.includes(tag.id)}
                    onClick={() => setLocalFilters(prev => ({
                      ...prev,
                      tagIds: prev.tagIds.includes(tag.id)
                        ? prev.tagIds.filter(id => id !== tag.id)
                        : [...prev.tagIds, tag.id]
                    }))}
                  />
                ))}
              </div>
            </FilterSection>
          )}
          
          {/* Date Range */}
          <FilterSection title="Date Range">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <input
                  type="date"
                  value={localFilters.dateRange.start || ''}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value || null }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <input
                  type="date"
                  value={localFilters.dateRange.end || ''}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value || null }
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </div>
            </div>
          </FilterSection>
        </div>
        
        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 safe-area-pb">
          <Button
            variant="secondary"
            onClick={handleClear}
            className="flex-1"
            disabled={activeFilterCount === 0}
          >
            Clear All
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>,
    document.body
  )
}

// Filter Section Component
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  )
}

// Chip Button Component
function ChipButton({
  icon,
  label,
  selected,
  onClick
}: {
  icon: string
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        selected
          ? "bg-[var(--org-btn-primary-bg)] text-white shadow-sm"
          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
      )}
    >
      <Icon name={icon} size="text-sm" />
      <span className="truncate">{label}</span>
    </button>
  )
}
