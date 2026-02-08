/**
 * VideoFilterPanel Component
 * 
 * Advanced filtering panel for video library with date range, tags, 
 * status, type, and team filtering capabilities.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { cn } from '@/utils/cn'

export interface VideoFilters {
  dateRange: {
    start: string | null
    end: string | null
  }
  tagIds: string[]
  status: string[]
  type: string[]
  teamId: string | null
  uploadedBy: string | null
  hasAthletes: boolean | null
}

export interface Tag {
  id: string
  name: string
  color: string | null
}

export interface Team {
  id: string
  name: string
}

export interface User {
  id: string
  name: string
}

interface VideoFilterPanelProps {
  filters: VideoFilters
  onFiltersChange: (filters: VideoFilters) => void
  tags?: Tag[]
  teams?: Team[]
  uploaders?: User[]
  isOpen: boolean
  onClose: () => void
  className?: string
}

const defaultFilters: VideoFilters = {
  dateRange: { start: null, end: null },
  tagIds: [],
  status: [],
  type: [],
  teamId: null,
  uploadedBy: null,
  hasAthletes: null
}

const VIDEO_STATUSES = [
  { value: 'uploading', label: 'Uploading', icon: 'upload' },
  { value: 'processing', label: 'Processing', icon: 'sync' },
  { value: 'ready', label: 'Ready', icon: 'check_circle' },
  { value: 'error', label: 'Error', icon: 'error' },
  { value: 'deleted', label: 'Deleted', icon: 'delete' }
]

const VIDEO_TYPES = [
  { value: 'game', label: 'Game', icon: 'sports' },
  { value: 'practice', label: 'Practice', icon: 'fitness_center' },
  { value: 'highlight', label: 'Highlight', icon: 'stars' },
  { value: 'training', label: 'Training', icon: 'school' },
  { value: 'other', label: 'Other', icon: 'movie' }
]

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: 365 }
]

export default function VideoFilterPanel({
  filters,
  onFiltersChange,
  tags = [],
  teams = [],
  uploaders = [],
  isOpen,
  onClose,
  className
}: VideoFilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<VideoFilters>(filters)
  
  // Sync local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (localFilters.dateRange.start || localFilters.dateRange.end) count++
    if (localFilters.tagIds.length > 0) count++
    if (localFilters.status.length > 0) count++
    if (localFilters.type.length > 0) count++
    if (localFilters.teamId) count++
    if (localFilters.uploadedBy) count++
    if (localFilters.hasAthletes !== null) count++
    return count
  }, [localFilters])

  const handleDatePreset = useCallback((days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    
    setLocalFilters(prev => ({
      ...prev,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    }))
  }, [])

  const toggleStatus = useCallback((status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }))
  }, [])

  const toggleType = useCallback((type: string) => {
    setLocalFilters(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }))
  }, [])

  const toggleTag = useCallback((tagId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId]
    }))
  }, [])

  const handleClearAll = useCallback(() => {
    setLocalFilters(defaultFilters)
  }, [])

  const handleApply = useCallback(() => {
    onFiltersChange(localFilters)
    onClose()
  }, [localFilters, onFiltersChange, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={cn(
        "relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-[var(--org-btn-primary-bg)] text-white text-xs font-bold rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <Icon name="close" size="text-xl" />
          </button>
        </div>

        {/* Filter Sections */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Date Range */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Date Range
            </h3>
            
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {DATE_PRESETS.map(preset => (
                <button
                  key={preset.days}
                  onClick={() => handleDatePreset(preset.days)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[var(--org-btn-primary-bg)] hover:text-[var(--org-btn-primary-bg)] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            {/* Custom Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={localFilters.dateRange.start || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value || null }
                }))}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={localFilters.dateRange.end || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value || null }
                }))}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </div>
          </section>

          {/* Video Type */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Video Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {VIDEO_TYPES.map(type => {
                const isSelected = localFilters.type.includes(type.value)
                return (
                  <button
                    key={type.value}
                    onClick={() => toggleType(type.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all",
                      isSelected
                        ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)] text-white"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <Icon name={type.icon} size="text-base" />
                    {type.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Status */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {VIDEO_STATUSES.map(status => {
                const isSelected = localFilters.status.includes(status.value)
                return (
                  <button
                    key={status.value}
                    onClick={() => toggleStatus(status.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all",
                      isSelected
                        ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)] text-white"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    )}
                  >
                    <Icon name={status.icon} size="text-base" />
                    {status.label}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Tags */}
          {tags.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const isSelected = localFilters.tagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all",
                        isSelected
                          ? "ring-2 ring-offset-1"
                          : "opacity-70 hover:opacity-100"
                      )}
                      style={{
                        backgroundColor: `${tag.color || '#9CA3AF'}20`,
                        borderColor: tag.color || '#9CA3AF',
                        color: tag.color || '#9CA3AF',
                        ...(isSelected && { ringColor: tag.color || '#9CA3AF' })
                      }}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: tag.color || '#9CA3AF' }}
                      />
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Team */}
          {teams.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Team
              </h3>
              <select
                value={localFilters.teamId || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  teamId: e.target.value || null
                }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </section>
          )}

          {/* Uploaded By */}
          {uploaders.length > 0 && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Uploaded By
              </h3>
              <select
                value={localFilters.uploadedBy || ''}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  uploadedBy: e.target.value || null
                }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="">Anyone</option>
                {uploaders.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </section>
          )}

          {/* Has Athletes */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
              Athletes Tagged
            </h3>
            <div className="flex gap-2">
              {[
                { value: null, label: 'Any' },
                { value: true, label: 'With athletes' },
                { value: false, label: 'Without athletes' }
              ].map(option => (
                <button
                  key={String(option.value)}
                  onClick={() => setLocalFilters(prev => ({
                    ...prev,
                    hasAthletes: option.value
                  }))}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg border text-sm transition-all",
                    localFilters.hasAthletes === option.value
                      ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)] text-white"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
            disabled={activeFilterCount === 0}
          >
            Clear All
          </button>
          
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApply}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export types for external use
