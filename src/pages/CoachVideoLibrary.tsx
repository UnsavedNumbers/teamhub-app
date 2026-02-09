/**
 * Coach Video Library Page
 * 
 * Video management interface for coaches - upload, organize, and review videos.
 * High-density grid layout with filtering, sorting, and batch actions.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useOrganization } from '@/contexts/OrganizationContext'
import { 
  VideoUploader, 
  VideoFilterPanel, 
  VideoSortDropdown, 
  VideoBulkActionsBar, 
  VideoShareModal, 
  VideoTagPicker 
} from '@/components/video'
import { useVideos, useVideoMutations } from '@/hooks/useVideos'
import { useBulkVideoOperations, useVideoSearch } from '@/hooks/useVideosExtended'
import { cn } from '@/utils/cn'
import type { VideoCategory, VideoStatus } from '@/types/video'
import type { VideoFilters } from '@/components/video/VideoFilterPanel'
import { supabase } from '@/lib/supabase'
import { AdminPageHeader, Card } from '@/components/platformAdmin'
import Button from '@/components/portal/Button'
import Icon from '@/components/portal/Icon'
import { t } from '@/i18n'
import { showSuccess, showError } from '@/utils/toast'
import '@/styles/orgAdmin.css'

type SortOption = 'created_at' | 'title' | 'duration' | 'view_count'

interface FilterState {
  type: VideoCategory | null
  teamId: string | null
  athleteId: string | null
  dateRange: { start: Date | null; end: Date | null }
  status: VideoStatus | null
}

export default function CoachVideoLibrary() {
  const { currentOrganization } = useOrganization()
  
  // State for filters and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [videoFilters, setVideoFilters] = useState<VideoFilters>({
    dateRange: { start: null, end: null },
    tagIds: [],
    status: [],
    type: [],
    teamId: null,
    uploadedBy: null,
    hasAthletes: null
  })
  const [filters, setFilters] = useState<FilterState>({
    type: null,
    teamId: null,
    athleteId: null,
    dateRange: { start: null, end: null },
    status: null
  })
  const [sortBy, setSortBy] = useState<SortOption>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showUploader, setShowUploader] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 12
  
  // Bulk operations state
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  
  // Advanced features
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareVideoId, setShareVideoId] = useState<string | null>(null)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagVideoIds, setTagVideoIds] = useState<string[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  
  // Active filter dropdowns
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  
  // Modal states
  const [editingVideo, setEditingVideo] = useState<string | null>(null)
  const [sharingVideo, setSharingVideo] = useState<string | null>(null)
  const [shareLink, setShareLink] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<VideoCategory | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Data for filters
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  
  // Fetch videos
  const { videos, isLoading, total, refresh } = useVideos({
    orgId: currentOrganization?.id,
    filters: {
      category: filters.type || undefined,
      team_id: filters.teamId || undefined,
      status: filters.status || undefined,
      search: searchQuery || undefined
    },
    pagination: {
      page: currentPage,
      limit: pageSize
    }
  })
  
  const { deleteVideo, updateVideo } = useVideoMutations()
  const { bulkDelete, bulkAddTags, isProcessing: isBulkLoading } = useBulkVideoOperations({ orgId: currentOrganization?.id })
  
  // Load teams for filters
  useEffect(() => {
    if (!currentOrganization?.id) return
    
    const loadTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .eq('org_id', currentOrganization.id)
        .order('name')
      
      if (data) setTeams(data)
    }
    
    loadTeams()
  }, [currentOrganization?.id])
  
  // Calculate total pages
  const totalPages = Math.ceil((total || 0) / pageSize)
  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return filters.type !== null ||
      filters.teamId !== null ||
      filters.athleteId !== null ||
      filters.status !== null ||
      filters.dateRange.start !== null
  }, [filters])
  
  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      type: null,
      teamId: null,
      athleteId: null,
      dateRange: { start: null, end: null },
      status: null
    })
    setSearchQuery('')
  }, [])
  
  // Toggle sort direction
  const handleSort = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }, [])
  
  // Handle video actions
  const handleEditVideo = useCallback((videoId: string) => {
    const video = videos.find(v => v.id === videoId)
    if (video) {
      setEditTitle(video.title)
      setEditDescription(video.description || '')
      setEditCategory(video.category || null)
      setEditingVideo(videoId)
    }
  }, [videos])
  
  const handleSaveVideo = useCallback(async () => {
    if (!editingVideo) return
    
    setIsSaving(true)
    try {
      await updateVideo(editingVideo, {
        title: editTitle,
        description: editDescription,
        category: editCategory || undefined
      })
      setEditingVideo(null)
      refresh()
    } catch (err) {
      console.error('Error saving video:', err)
    } finally {
      setIsSaving(false)
    }
  }, [editingVideo, editTitle, editDescription, editCategory, updateVideo, refresh])
  
  const handleShareVideo = useCallback((videoId: string) => {
    const link = `${window.location.origin}/admin/videos/${videoId}`
    setShareLink(link)
    setSharingVideo(videoId)
    setCopySuccess(false)
  }, [])
  
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareLink)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }, [shareLink])
  
  const handleOpenDeleteModal = useCallback((videoId: string) => {
    setVideoToDelete(videoId)
    setShowDeleteModal(true)
  }, [])

  const handleCloseDeleteModal = useCallback(() => {
    if (!isDeleting) {
      setShowDeleteModal(false)
      setVideoToDelete(null)
    }
  }, [isDeleting])

  const handleConfirmDelete = useCallback(async () => {
    if (!videoToDelete) return
    setIsDeleting(true)
    try {
      const ok = await deleteVideo(videoToDelete)
      if (ok) {
        setShowDeleteModal(false)
        setVideoToDelete(null)
        showSuccess(t('toast.success.deleted'))
        refresh()
      } else {
        showError(t('videoLibrary.errors.deleteFailed'))
      }
    } finally {
      setIsDeleting(false)
    }
  }, [videoToDelete, deleteVideo, refresh, t])
  
  // Handle upload complete
  const handleUploadComplete = useCallback(() => {
    setShowUploader(false)
    refresh()
  }, [refresh])
  
  // Bulk operations handlers
  const handleSelectAll = useCallback(() => {
    setSelectedVideoIds(videos.map(v => v.id))
  }, [videos])
  
  const handleClearSelection = useCallback(() => {
    setSelectedVideoIds([])
  }, [])
  
  const handleBulkDelete = useCallback(async () => {
    if (selectedVideoIds.length === 0) return
    if (!confirm(t('videoLibrary.bulk.confirmDelete', { count: selectedVideoIds.length }))) return
    
    const result = await bulkDelete(selectedVideoIds)
    if (result.succeeded.length > 0) {
      showSuccess(t('videoLibrary.bulk.deleteSuccess', { count: result.succeeded.length }))
      setSelectedVideoIds([])
      refresh()
    }
    if (result.failed.length > 0) {
      showError(t('videoLibrary.bulk.deleteFailed'))
    }
  }, [selectedVideoIds, bulkDelete, refresh, t])
  
  const handleBulkTag = useCallback(async (tagIds: string[]) => {
    if (selectedVideoIds.length === 0) return
    
    const result = await bulkAddTags(selectedVideoIds, tagIds)
    if (result.succeeded.length > 0) {
      showSuccess(t('videoLibrary.bulk.tagSuccess'))
      setSelectedVideoIds([])
      setShowTagPicker(false)
      refresh()
    }
    if (result.failed.length > 0) {
      showError(t('videoLibrary.bulk.tagFailed'))
    }
  }, [selectedVideoIds, bulkAddTags, refresh, t])
  
  // Video categories for filter
  const videoCategories: { value: VideoCategory; label: string }[] = [
    { value: 'game', label: 'Game' },
    { value: 'practice', label: 'Practice' },
    { value: 'highlight', label: 'Highlight' },
    { value: 'training', label: 'Training' },
    { value: 'event', label: 'Event' },
    { value: 'other', label: 'Other' }
  ]
  
  return (
    <div className="oa-theme-active pa-layout">
      {/* Page Header */}
      <AdminPageHeader
        title="Video Library"
        subtitle="Upload, organize, and manage video content"
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Videos' }
        ]}
        actions={
          <Button
            variant="primary"
            onClick={() => setShowUploader(true)}
          >
            <Icon name="upload" size="text-sm" className="mr-2" />
            Upload Video
          </Button>
        }
      />
      
      <main className="space-y-6">
        {/* Bulk Actions Bar */}
        {selectedVideoIds.length > 0 && (
          <VideoBulkActionsBar
            orgId={currentOrganization?.id || ''}
            selectedVideoIds={selectedVideoIds}
            onClearSelection={handleClearSelection}
            onOperationComplete={() => {
              setSelectedVideoIds([])
              refresh()
            }}
            teams={teams}
          />
        )}
        
        {/* Filters and Sort */}
        <div className="flex gap-4">
          <Button
            variant="secondary"
            onClick={() => setShowFilterPanel(true)}
            className="flex items-center gap-2"
          >
            <Icon name="filter_list" size="text-sm" />
            Filters
            {Object.values(videoFilters).some(v => 
              Array.isArray(v) ? v.length > 0 : 
              v !== null && (typeof v !== 'object' || v.start || v.end)
            ) && (
              <span className="ml-1 bg-[var(--org-btn-primary-bg)] text-white rounded-full px-2 py-0.5 text-xs font-bold">
                {[
                  videoFilters.tagIds.length > 0 ? 1 : 0,
                  videoFilters.status.length > 0 ? 1 : 0,
                  videoFilters.type.length > 0 ? 1 : 0,
                  videoFilters.teamId ? 1 : 0,
                  videoFilters.dateRange.start || videoFilters.dateRange.end ? 1 : 0
                ].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </Button>
          <div className="flex-1" />
          <VideoSortDropdown
            value={`${sortBy}_${sortDirection}` as any}
            onChange={(value) => {
              const [field, dir] = value.split('_')
              setSortBy(field as SortOption)
              setSortDirection(dir as 'asc' | 'desc')
            }}
          />
        </div>
      
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 mb-6">
        <h2 className="text-xl font-bold pb-4">
          Recent Studio Uploads
        </h2>
        <p className="text-xs text-gray-500 pb-4">
          Displaying {videos.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}-{Math.min(currentPage * pageSize, total || 0)} of {total || 0} videos
        </p>
      </div>
      
      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <Card className="text-center py-20">
          <Icon name="video_library" size="text-6xl" className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold mb-2">
            No videos found
          </h3>
          <p className="text-gray-500 mb-6">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Upload your first video to get started'}
          </p>
          <Button variant="primary" onClick={() => setShowUploader(true)}>
            <Icon name="upload" size="text-lg" className="mr-2" />
            Upload Video
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {videos.map((video) => (
            <CoachVideoCard
              key={video.id}
              video={video}
              isSelected={selectedVideoIds.includes(video.id)}
              onSelect={(id, selected) => {
                if (selected) {
                  setSelectedVideoIds([...selectedVideoIds, id])
                } else {
                  setSelectedVideoIds(selectedVideoIds.filter(vid => vid !== id))
                }
              }}
              onEdit={handleEditVideo}
              onShare={(id) => {
                setShareVideoId(id)
                setShowShareModal(true)
              }}
              onDelete={handleOpenDeleteModal}
            />
          ))}
          
          {/* Add New Video Placeholder */}
          <button
            onClick={() => setShowUploader(true)}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center gap-2 aspect-video group cursor-pointer hover:border-[var(--org-btn-primary-bg)] hover:bg-[var(--org-btn-primary-bg)]/5 transition-all"
          >
            <Icon name="add_circle" size="text-3xl" className="text-gray-400 group-hover:text-[var(--org-btn-primary-bg)] transition-colors" />
            <span className="text-[10px] font-black tracking-widest text-gray-400 group-hover:text-[var(--org-btn-primary-bg)] transition-colors uppercase">
              Upload New
            </span>
          </button>
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="mt-12 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4">
            <div className="flex gap-4">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
                <Icon name="folder" size="text-lg" />
                <span className="text-xs font-bold uppercase tracking-widest">Library Folders</span>
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
                <Icon name="auto_fix_high" size="text-lg" />
                <span className="text-xs font-bold uppercase tracking-widest">Auto-Tagging</span>
              </button>
            </div>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="size-8 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-[var(--org-btn-primary-bg)] transition-colors disabled:opacity-50"
              >
                <Icon name="chevron_left" size="text-sm" />
              </button>
              
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = i + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "size-8 flex items-center justify-center rounded border transition-colors",
                      currentPage === pageNum
                        ? "bg-[var(--org-btn-primary-bg)] text-white border-[var(--org-btn-primary-bg)]"
                        : "border-gray-200 dark:border-gray-700 hover:text-[var(--org-btn-primary-bg)]"
                    )}
                  >
                    <span className="text-xs font-bold">{pageNum}</span>
                  </button>
                )
              })}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="size-8 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-[var(--org-btn-primary-bg)] transition-colors disabled:opacity-50"
              >
                <Icon name="chevron_right" size="text-sm" />
              </button>
            </div>
          </div>
        </Card>
      )}
      </main>
      
      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Upload Video</h3>
              <button
                onClick={() => setShowUploader(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Icon name="close" size="text-xl" />
              </button>
            </div>
            <div className="p-6">
              <VideoUploader
                orgId={currentOrganization?.id || ''}
                onUploadComplete={handleUploadComplete}
                onCancel={() => setShowUploader(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit Video</h3>
              <button
                onClick={() => setEditingVideo(null)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Icon name="close" size="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Category
                </label>
                <select
                  value={editCategory || ''}
                  onChange={(e) => setEditCategory((e.target.value || null) as VideoCategory | null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="">Select Category</option>
                  {videoCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="secondary"
                  onClick={() => setEditingVideo(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveVideo}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Video Modal */}
      {sharingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Share Video</h3>
              <button
                onClick={() => setSharingVideo(null)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Icon name="close" size="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Share this video with your team or copy the link below:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                  <Button
                    variant="primary"
                    onClick={handleCopyLink}
                  >
                    {copySuccess ? (
                      <>
                        <Icon name="check" size="text-lg" className="mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Icon name="content_copy" size="text-lg" className="mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setSharingVideo(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Video Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">{t('videoLibrary.actions.delete')}</h3>
              <button
                onClick={handleCloseDeleteModal}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                disabled={isDeleting}
                aria-label={t('common.close')}
              >
                <Icon name="close" size="text-xl" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400">{t('videoLibrary.delete.message')}</p>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600 text-white border-red-500"
              >
                {isDeleting ? t('common.loading') : t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Close dropdown when clicking outside */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveDropdown(null)}
        />
      )}
      
      {/* Share Modal */}
      {showShareModal && shareVideoId && (
        <VideoShareModal
          videoId={shareVideoId}
          onClose={() => {
            setShowShareModal(false)
            setShareVideoId(null)
          }}
        />
      )}
      
      {/* Tag Picker for Bulk Operations */}
      {showTagPicker && currentOrganization?.id && (
        <VideoTagPicker
          orgId={currentOrganization.id}
          videoIds={tagVideoIds}
          onClose={() => {
            setShowTagPicker(false)
            setTagVideoIds([])
          }}
          onSave={handleBulkTag}
        />
      )}
      
      {/* Filter Panel Modal */}
      {showFilterPanel && (
        <VideoFilterPanel
          filters={videoFilters}
          onFiltersChange={(newFilters) => {
            setVideoFilters(newFilters)
            // Convert to old filter format for useVideos hook
            setFilters({
              type: newFilters.type.length > 0 ? newFilters.type[0] as VideoCategory : null,
              teamId: newFilters.teamId,
              athleteId: null,
              dateRange: newFilters.dateRange,
              status: newFilters.status.length > 0 ? newFilters.status[0] as VideoStatus : null
            })
          }}
          teams={teams}
          isOpen={showFilterPanel}
          onClose={() => setShowFilterPanel(false)}
        />
      )}
    </div>
  )
}

/**
 * Coach Video Card with hover actions
 */
interface CoachVideoCardProps {
  video: {
    id: string
    title: string
    thumbnail_url?: string | null
    duration?: number | null
    status: VideoStatus
    category?: VideoCategory | null
    created_at: string
    view_count?: number | null
  }
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  onEdit: (id: string) => void
  onShare: (id: string) => void
  onDelete: (id: string) => void
}

function CoachVideoCard({ video, isSelected, onSelect, onEdit, onShare, onDelete }: CoachVideoCardProps) {
  const statusColors: Record<VideoStatus, { bg: string; text: string }> = {
    pending_upload: { bg: 'bg-yellow-500', text: 'PENDING' },
    ready: { bg: 'bg-green-500', text: 'READY' },
    processing: { bg: 'bg-blue-500', text: 'PROCESSING' },
    uploading: { bg: 'bg-blue-500', text: 'UPLOADING' },
    errored: { bg: 'bg-red-500', text: 'ERROR' },
    deleted: { bg: 'bg-gray-500', text: 'DELETED' }
  }
  
  const categoryLabels: Record<VideoCategory, string> = {
    game: 'Game',
    practice: 'Practice',
    highlight: 'Highlight',
    training: 'Training',
    event: 'Event',
    other: 'Other'
  }
  
  return (
    <div className="group flex flex-col gap-3 pb-3 relative">
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-2 left-2 z-20">
          <label
            className="flex items-center justify-center size-6 bg-white dark:bg-gray-900 rounded border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:border-[var(--org-btn-primary-bg)] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onSelect(video.id, e.target.checked)
              }}
              className="sr-only"
            />
            {isSelected && <Icon name="check" size="text-sm" className="text-[var(--org-btn-primary-bg)]" />}
          </label>
        </div>
      )}
      
      <Link
        to={`/admin/videos/${video.id}`}
        className="cursor-pointer"
      >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={cn(
              "absolute inset-0 w-full h-full object-cover",
              video.status === 'processing' && "opacity-60"
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon name="movie" size="text-3xl" className="text-gray-400" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className={cn(
          "absolute top-2 left-2 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1",
          statusColors[video.status]?.bg || 'bg-gray-500'
        )}>
          {video.status === 'processing' && (
            <Icon name="sync" size="text-xs" className="animate-spin" />
          )}
          {video.status === 'uploading' && (
            <Icon name="cloud_upload" size="text-xs" className="animate-pulse" />
          )}
          {statusColors[video.status]?.text || video.status.toUpperCase()}
        </div>
        
        {/* Duration Badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {/* Hover Actions Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEdit(video.id)
            }}
            className="p-2 bg-white text-black rounded-full hover:bg-[var(--org-btn-primary-bg)] hover:text-white transition-all shadow-lg"
            title="Edit video"
          >
            <Icon name="edit" size="text-lg" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onShare(video.id)
            }}
            className="p-2 bg-white text-black rounded-full hover:bg-[var(--org-btn-primary-bg)] hover:text-white transition-all shadow-lg"
            title="Share video"
          >
            <Icon name="share" size="text-lg" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(video.id)
            }}
            className="p-2 bg-white text-black rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
            title="Delete video"
          >
            <Icon name="delete" size="text-lg" />
          </button>
        </div>
      </div>
      </Link>
      
      {/* Video Info */}
      <div className="px-1">
        <p className="text-sm font-bold leading-snug line-clamp-1 mb-1">
          {video.title}
        </p>
        <div className="flex items-center gap-2">
          {video.category && (
            <>
              <span className="text-xs font-medium text-[var(--org-btn-primary-bg)]">
                {categoryLabels[video.category]}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}
          <p className="text-gray-500 text-[11px] font-normal leading-normal">
            {formatRelativeTime(video.created_at)}
            {video.view_count != null && ` • ${formatViewCount(video.view_count)} views`}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Format duration helper
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

/**
 * Format view count
 */
function formatViewCount(count: number | null): string {
  if (count === null) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}
