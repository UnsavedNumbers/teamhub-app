/**
 * VideoBulkActionsBar Component
 * 
 * Action bar that appears when videos are selected for bulk operations.
 * Supports delete, move, and tag operations.
 */

import { useState, useCallback } from 'react'
import { useBulkVideoOperations } from '@/hooks/useVideosExtended'
import { useVideoTags } from '@/hooks/useVideos'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { cn } from '@/utils/cn'
import { showSuccess, showError } from '@/utils/toast'

interface VideoBulkActionsBarProps {
  orgId: string
  selectedVideoIds: string[]
  onClearSelection: () => void
  onOperationComplete: () => void
  teams?: Array<{ id: string; name: string }>
  className?: string
}

type ModalType = 'delete' | 'move' | 'addTags' | 'removeTags' | null

export default function VideoBulkActionsBar({
  orgId,
  selectedVideoIds,
  onClearSelection,
  onOperationComplete,
  teams = [],
  className
}: VideoBulkActionsBarProps) {
  const { isProcessing, progress, bulkDelete, bulkAddTags, bulkRemoveTags, bulkMove } = useBulkVideoOperations({ orgId })
  const { tags } = useVideoTags({ orgId, enabled: true })

  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const count = selectedVideoIds.length

  const handleDelete = useCallback(async () => {
    const result = await bulkDelete(selectedVideoIds)
    
    if (result.failed.length === 0) {
      showSuccess(`${result.succeeded.length} video${result.succeeded.length !== 1 ? 's' : ''} deleted`)
      onClearSelection()
      onOperationComplete()
    } else if (result.succeeded.length > 0) {
      showSuccess(`${result.succeeded.length} deleted, ${result.failed.length} failed`)
      onOperationComplete()
    } else {
      showError('Failed to delete videos')
    }
    
    setActiveModal(null)
  }, [selectedVideoIds, bulkDelete, onClearSelection, onOperationComplete])

  const handleMove = useCallback(async () => {
    const result = await bulkMove(selectedVideoIds, selectedTeamId)
    
    if (result.failed.length === 0) {
      showSuccess(`${result.succeeded.length} video${result.succeeded.length !== 1 ? 's' : ''} moved`)
      onClearSelection()
      onOperationComplete()
    } else if (result.succeeded.length > 0) {
      showSuccess(`${result.succeeded.length} moved, ${result.failed.length} failed`)
      onOperationComplete()
    } else {
      showError('Failed to move videos')
    }
    
    setActiveModal(null)
    setSelectedTeamId(null)
  }, [selectedVideoIds, selectedTeamId, bulkMove, onClearSelection, onOperationComplete])

  const handleAddTags = useCallback(async () => {
    if (selectedTagIds.length === 0) return

    const result = await bulkAddTags(selectedVideoIds, selectedTagIds)
    
    if (result.failed.length === 0) {
      showSuccess(`Tags added to ${result.succeeded.length} video${result.succeeded.length !== 1 ? 's' : ''}`)
      onClearSelection()
      onOperationComplete()
    } else if (result.succeeded.length > 0) {
      showSuccess(`${result.succeeded.length} updated, ${result.failed.length} failed`)
      onOperationComplete()
    } else {
      showError('Failed to add tags')
    }
    
    setActiveModal(null)
    setSelectedTagIds([])
  }, [selectedVideoIds, selectedTagIds, bulkAddTags, onClearSelection, onOperationComplete])

  const handleRemoveTags = useCallback(async () => {
    if (selectedTagIds.length === 0) return

    const result = await bulkRemoveTags(selectedVideoIds, selectedTagIds)
    
    if (result.failed.length === 0) {
      showSuccess(`Tags removed from ${result.succeeded.length} video${result.succeeded.length !== 1 ? 's' : ''}`)
      onClearSelection()
      onOperationComplete()
    } else if (result.succeeded.length > 0) {
      showSuccess(`${result.succeeded.length} updated, ${result.failed.length} failed`)
      onOperationComplete()
    } else {
      showError('Failed to remove tags')
    }
    
    setActiveModal(null)
    setSelectedTagIds([])
  }, [selectedVideoIds, selectedTagIds, bulkRemoveTags, onClearSelection, onOperationComplete])

  if (count === 0) return null

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-40",
        "bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl",
        "px-4 py-3 flex items-center gap-4",
        className
      )}>
        {/* Selection Count */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
          <span className="text-sm font-bold">
            {count} selected
          </span>
          <button
            onClick={onClearSelection}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Clear selection"
          >
            <Icon name="close" size="text-sm" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Add Tags */}
          <button
            onClick={() => setActiveModal('addTags')}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <Icon name="label" size="text-lg" />
            Add Tags
          </button>

          {/* Remove Tags */}
          <button
            onClick={() => setActiveModal('removeTags')}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            <Icon name="label_off" size="text-lg" />
            Remove Tags
          </button>

          {/* Move */}
          {teams.length > 0 && (
            <button
              onClick={() => setActiveModal('move')}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <Icon name="drive_file_move" size="text-lg" />
              Move
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => setActiveModal('delete')}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium text-red-400 hover:text-white"
          >
            <Icon name="delete" size="text-lg" />
            Delete
          </button>
        </div>

        {/* Progress Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 pl-4 border-l border-gray-700">
            <Icon name="sync" size="text-lg" className="animate-spin" />
            <span className="text-sm">
              {progress.current} / {progress.total}
            </span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={activeModal === 'delete'}
        title={`Delete ${count} Video${count !== 1 ? 's' : ''}`}
        description="This action cannot be undone."
        confirmLabel={isProcessing ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setActiveModal(null)}
      />

      {/* Move Modal */}
      {activeModal === 'move' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Move {count} Video{count !== 1 ? 's' : ''}</h3>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                Select Team
              </label>
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(e.target.value || null)}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="">No Team (Organization Level)</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveModal(null)
                  setSelectedTeamId(null)
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleMove}
                disabled={isProcessing}
              >
                {isProcessing ? 'Moving...' : 'Move Videos'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tags Modal */}
      {activeModal === 'addTags' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Add Tags to {count} Video{count !== 1 ? 's' : ''}</h3>

            <div className="mb-6 max-h-64 overflow-auto">
              {tags.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tags available. Create tags first.
                </p>
              ) : (
                <div className="space-y-2">
                  {tags.map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <label
                        key={tag.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)]/5"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTagIds([...selectedTagIds, tag.id])
                            } else {
                              setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id))
                            }
                          }}
                          className="size-4 rounded border-gray-300 text-[var(--org-btn-primary-bg)]"
                        />
                        <span
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || '#9CA3AF' }}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveModal(null)
                  setSelectedTagIds([])
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddTags}
                disabled={isProcessing || selectedTagIds.length === 0}
              >
                {isProcessing ? 'Adding...' : `Add ${selectedTagIds.length} Tag${selectedTagIds.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Tags Modal */}
      {activeModal === 'removeTags' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Remove Tags from {count} Video{count !== 1 ? 's' : ''}</h3>

            <div className="mb-6 max-h-64 overflow-auto">
              {tags.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tags available.
                </p>
              ) : (
                <div className="space-y-2">
                  {tags.map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <label
                        key={tag.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTagIds([...selectedTagIds, tag.id])
                            } else {
                              setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id))
                            }
                          }}
                          className="size-4 rounded border-gray-300 text-red-500"
                        />
                        <span
                          className="size-3 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color || '#9CA3AF' }}
                        />
                        <span className="font-medium">{tag.name}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveModal(null)
                  setSelectedTagIds([])
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <button
                onClick={handleRemoveTags}
                disabled={isProcessing || selectedTagIds.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-sm transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Removing...' : `Remove ${selectedTagIds.length} Tag${selectedTagIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
