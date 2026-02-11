/**
 * VideoTagPicker Component
 * 
 * Tag selection component with autosuggest and create-new functionality.
 * Used for filtering and tagging videos.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useVideoTags } from '@/hooks/useVideos'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'

interface VideoTagPickerProps {
  orgId: string
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  allowCreate?: boolean
  multi?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
}

const TAG_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
]

export default function VideoTagPicker({
  orgId,
  selectedTagIds,
  onChange,
  allowCreate = true,
  multi = true,
  placeholder = 'Search or create tags...',
  disabled = false,
  className
}: VideoTagPickerProps) {
  const { tags, isLoading, createTag } = useVideoTags({ orgId, enabled: true })
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Selected tags details
  const selectedTags = useMemo(() => 
    tags.filter(tag => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  )

  // Filtered tags based on search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags
    const query = searchQuery.toLowerCase()
    return tags.filter(tag => 
      tag.name.toLowerCase().includes(query) ||
      tag.tag_type.toLowerCase().includes(query)
    )
  }, [tags, searchQuery])

  // Check if search query matches an existing tag exactly
  const exactMatch = useMemo(() => 
    tags.find(tag => tag.name.toLowerCase() === searchQuery.toLowerCase().trim()),
    [tags, searchQuery]
  )

  // Can create new tag?
  const canCreate = allowCreate && 
    searchQuery.trim().length > 0 && 
    !exactMatch && 
    !isCreating

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleTag = useCallback((tagId: string) => {
    if (disabled) return
    
    if (multi) {
      if (selectedTagIds.includes(tagId)) {
        onChange(selectedTagIds.filter(id => id !== tagId))
      } else {
        onChange([...selectedTagIds, tagId])
      }
    } else {
      onChange([tagId])
      setIsOpen(false)
    }
  }, [selectedTagIds, onChange, multi, disabled])

  const handleRemoveTag = useCallback((tagId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange(selectedTagIds.filter(id => id !== tagId))
  }, [selectedTagIds, onChange, disabled])

  const handleCreateTag = useCallback(async () => {
    if (!canCreate) return
    
    setIsCreating(true)
    try {
      const randomColor = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      const newTag = await createTag({
        name: searchQuery.trim(),
        tag_type: 'custom',
        color: randomColor,
        description: null,
      })

      if (newTag) {
        handleToggleTag(newTag.id)
        setSearchQuery('')
      }
    } finally {
      setIsCreating(false)
    }
  }, [canCreate, searchQuery, createTag, handleToggleTag])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canCreate) {
      e.preventDefault()
      handleCreateTag()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }, [canCreate, handleCreateTag])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected Tags & Input */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        className={cn(
          "min-h-[42px] px-3 py-2 rounded-lg border transition-colors flex flex-wrap gap-2 items-center cursor-text",
          isOpen 
            ? "border-[var(--org-btn-primary-bg)] ring-2 ring-[var(--org-btn-primary-bg)]/20" 
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
        )}
      >
        {/* Selected Tag Chips */}
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ 
              backgroundColor: tag.color ? `${tag.color}20` : '#e5e7eb',
              color: tag.color || '#374151'
            }}
          >
            {tag.name}
            {!disabled && (
              <button
                onClick={(e) => handleRemoveTag(tag.id, e)}
                className="hover:opacity-70"
              >
                <Icon name="close" size="text-xs" />
              </button>
            )}
          </span>
        ))}

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-gray-400"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-64 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              <Icon name="sync" size="text-lg" className="animate-spin mx-auto mb-1" />
              Loading tags...
            </div>
          ) : filteredTags.length === 0 && !canCreate ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchQuery ? 'No matching tags' : t('videoLibrary.tags.noTags')}
            </div>
          ) : (
            <div className="py-1">
              {/* Create New Tag Option */}
              {canCreate && (
                <button
                  onClick={handleCreateTag}
                  disabled={isCreating}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Icon name="add" size="text-lg" className="text-[var(--org-btn-primary-bg)]" />
                  <span>
                    Create "<span className="font-bold">{searchQuery.trim()}</span>"
                  </span>
                  {isCreating && (
                    <Icon name="sync" size="text-sm" className="animate-spin ml-auto" />
                  )}
                </button>
              )}

              {canCreate && filteredTags.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              )}

              {/* Existing Tags */}
              {filteredTags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                      isSelected 
                        ? "bg-[var(--org-btn-primary-bg)]/10" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    )}
                  >
                    {multi && (
                      <div className={cn(
                        "size-4 rounded border flex items-center justify-center",
                        isSelected 
                          ? "bg-[var(--org-btn-primary-bg)] border-[var(--org-btn-primary-bg)]" 
                          : "border-gray-300"
                      )}>
                        {isSelected && <Icon name="check" size="text-xs" className="text-white" />}
                      </div>
                    )}
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || '#9CA3AF' }}
                    />
                    <span className="flex-1 font-medium">{tag.name}</span>
                    <span className="text-xs text-gray-400 uppercase">{tag.tag_type}</span>
                    {tag.usage_count > 0 && (
                      <span className="text-xs text-gray-400">
                        ({tag.usage_count})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
