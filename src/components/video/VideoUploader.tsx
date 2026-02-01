/**
 * VideoUploader Component
 * 
 * Handles video file selection and upload to Mux via direct upload.
 * Uses the Mux UpChunk library for resumable uploads.
 */

import { useState, useCallback, useRef, ChangeEvent, DragEvent, useEffect } from 'react'
import { useVideoUpload } from '@/hooks/useVideos'
import type { CreateVideoUploadRequest, VideoCategory, VideoVisibility } from '@/types/video'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import Card from '@/components/portal/Card'
import { cn } from '@/utils/cn'
import { supabase } from '@/lib/supabase'

interface VideoUploaderProps {
  orgId: string
  teamId?: string
  defaultCategory?: VideoCategory
  defaultVisibility?: VideoVisibility
  onUploadStart?: (videoId: string) => void
  onUploadProgress?: (progress: number) => void
  onUploadComplete?: (videoId: string) => void
  onUploadError?: (error: Error) => void
  onCancel?: () => void
  className?: string
}

interface UploadForm {
  title: string
  description: string
  category: VideoCategory
  visibility: VideoVisibility
  teamId?: string
  recordedAt?: string
}

const CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: 'game', label: 'Game Film' },
  { value: 'practice', label: 'Practice' },
  { value: 'training', label: 'Training' },
  { value: 'highlight', label: 'Highlight' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' }
]

const VISIBILITIES: { value: VideoVisibility; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only you can see this video' },
  { value: 'team', label: 'Team', description: 'Team members and linked athletes' },
  { value: 'organization', label: 'Organization', description: 'All organization members' },
  { value: 'guardians', label: 'Guardians', description: 'Guardians of linked athletes' }
]

// File size and type validation
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-ms-wmv']
const ACCEPTED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.wmv']

export default function VideoUploader({
  orgId,
  teamId,
  defaultCategory = 'game',
  defaultVisibility = 'team',
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onCancel,
  className
}: VideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadStep, setUploadStep] = useState<'select' | 'details' | 'uploading'>('select')
  const [fileError, setFileError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  
  const [form, setForm] = useState<UploadForm>({
    title: '',
    description: '',
    category: defaultCategory,
    visibility: defaultVisibility,
    teamId: teamId,
    recordedAt: new Date().toISOString().split('T')[0]
  })
  
  const { createUpload, uploadProgress: muxProgress, isUploading, error: uploadError, reset } = useVideoUpload({
    orgId,
    onUploadComplete: (videoId) => {
      onUploadComplete?.(videoId)
    },
    onUploadError: (err) => {
      onUploadError?.(err)
    }
  })
  
  // Load teams for the organization
  useEffect(() => {
    if (!orgId) return
    
    const loadTeams = async () => {
      setIsLoadingTeams(true)
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('org_id', orgId)
        .order('name')
      
      if (!error && data) {
        setTeams(data)
      }
      setIsLoadingTeams(false)
    }
    
    loadTeams()
  }, [orgId])
  
  // Validate file
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return 'Invalid file type. Please select a video file (.mp4, .mov, .webm, .avi, .wmv)'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 5GB.'
    }
    return null
  }
  
  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      setFileError(error)
      return
    }
    
    setFileError(null)
    setSelectedFile(file)
    setForm(prev => ({
      ...prev,
      title: file.name.replace(/\.[^/.]+$/, '') // Remove extension for default title
    }))
    setUploadStep('details')
  }, [])
  
  // Handle input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }
  
  // Handle drag events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }
  
  // Handle form change
  const handleFormChange = (field: keyof UploadForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }
  
  // Start upload
  const handleStartUpload = async () => {
    if (!selectedFile || !form.title) return
    
    setUploadStep('uploading')
    
    const metadata: CreateVideoUploadRequest = {
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      visibility: form.visibility,
      team_id: form.teamId,
      recorded_at: form.recordedAt ? new Date(form.recordedAt).toISOString() : undefined
    }
    
    const result = await createUpload(metadata)
    if (!result) {
      setUploadStep('details')
      return
    }
    
    onUploadStart?.(result.video_id)
    
    // Use UpChunk for resumable upload
    try {
      const { createUpload: createUpChunk } = await import('@mux/upchunk')
      
      const upload = createUpChunk({
        endpoint: result.upload_url,
        file: selectedFile,
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
      })
      
      upload.on('progress', (progressEvent) => {
        const progress = Math.round(progressEvent.detail)
        setUploadProgress(progress)
        onUploadProgress?.(progress)
      })
      
      upload.on('success', () => {
        setUploadProgress(100)
      })
      
      upload.on('error', (err) => {
        console.error('Upload error:', err)
        onUploadError?.(new Error('Upload failed'))
        setUploadStep('details')
      })
    } catch (err) {
      console.error('Failed to initialize uploader:', err)
      onUploadError?.(err instanceof Error ? err : new Error('Upload initialization failed'))
      setUploadStep('details')
    }
  }
  
  // Cancel/Reset
  const handleCancel = () => {
    reset()
    setSelectedFile(null)
    setUploadStep('select')
    setUploadProgress(0)
    setForm({
      title: '',
      description: '',
      category: defaultCategory,
      visibility: defaultVisibility,
      teamId: teamId,
      recordedAt: new Date().toISOString().split('T')[0]
    })
    onCancel?.()
  }
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  
  // Step 1: File Selection
  if (uploadStep === 'select') {
    return (
      <Card className={cn("p-8", className)}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all",
            isDragging 
              ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)]/5" 
              : "border-slate-200 dark:border-slate-700 hover:border-[var(--org-btn-primary-bg)]"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className={cn(
              "size-16 rounded-full flex items-center justify-center transition-colors",
              isDragging 
                ? "bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)]"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
            )}>
              <Icon name="cloud_upload" size="text-4xl" />
            </div>
            
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                {isDragging ? 'Drop your video here' : 'Drag & drop your video'}
              </p>
              <p className="text-sm text-slate-500">
                or <span className="text-[var(--org-link-color)] font-semibold">browse</span> to upload
              </p>
            </div>
            
            <p className="text-xs text-slate-400">
              MP4, MOV, WebM, AVI, WMV • Max 5GB
            </p>
          </div>
        </div>
        
        {fileError && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Icon name="error" size="text-lg" />
              <span className="text-sm font-medium">{fileError}</span>
            </div>
          </div>
        )}
      </Card>
    )
  }
  
  // Step 2: Video Details
  if (uploadStep === 'details' && selectedFile) {
    return (
      <Card className={cn("p-6", className)}>
        {/* File Preview */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-6">
          <div className="size-12 rounded-lg bg-[var(--org-btn-primary-bg)]/10 flex items-center justify-center">
            <Icon name="videocam" size="text-2xl" className="text-[var(--org-btn-primary-bg)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white truncate">{selectedFile.name}</p>
            <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            onClick={() => { setSelectedFile(null); setUploadStep('select') }}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Icon name="close" size="text-lg" className="text-slate-400" />
          </button>
        </div>
        
        {/* Form */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
              placeholder="Enter video title"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
              placeholder="Add a description (optional)"
            />
          </div>
          
          {/* Team Selector */}
          {teams.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Team (Optional)
              </label>
              <select
                value={form.teamId || ''}
                onChange={(e) => handleFormChange('teamId', e.target.value)}
                disabled={isLoadingTeams}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent disabled:opacity-50"
              >
                <option value="">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Category & Visibility */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Visibility
              </label>
              <select
                value={form.visibility}
                onChange={(e) => handleFormChange('visibility', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
              >
                {VISIBILITIES.map(vis => (
                  <option key={vis.value} value={vis.value}>{vis.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Recorded Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Date Recorded
            </label>
            <input
              type="date"
              value={form.recordedAt}
              onChange={(e) => handleFormChange('recordedAt', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Error Display */}
        {uploadError && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Icon name="error" size="text-lg" />
              <span className="text-sm font-medium">{uploadError.message}</span>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleCancel}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <Button
            onClick={handleStartUpload}
            disabled={!form.title || isUploading}
          >
            <Icon name="upload" size="text-lg" className="mr-2" />
            Upload Video
          </Button>
        </div>
      </Card>
    )
  }
  
  // Step 3: Uploading
  return (
    <Card className={cn("p-8", className)}>
      <div className="flex flex-col items-center text-center">
        {/* Progress Circle */}
        <div className="relative size-32 mb-6">
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - uploadProgress / 100)}`}
              className="text-[var(--org-btn-primary-bg)] transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {uploadProgress}%
            </span>
          </div>
        </div>
        
        {/* Status */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {uploadProgress < 100 ? 'Uploading Video...' : 'Processing Video...'}
        </h3>
        <p className="text-sm text-slate-500 mb-6">
          {uploadProgress < 100 
            ? 'Please keep this window open until the upload completes.'
            : 'Your video is being processed. This may take a few minutes.'
          }
        </p>
        
        {/* File Info */}
        {selectedFile && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Icon name="videocam" size="text-xl" className="text-[var(--org-btn-primary-bg)]" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedFile.name}</span>
          </div>
        )}
        
        {/* Mux Progress Status */}
        {muxProgress && muxProgress.status !== 'uploading' && (
          <div className="mt-6 flex items-center gap-2 text-sm">
            {muxProgress.status === 'processing' && (
              <>
                <div className="size-4 border-2 border-[var(--org-btn-primary-bg)] border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-600 dark:text-slate-400">Processing with Mux...</span>
              </>
            )}
            {muxProgress.status === 'complete' && (
              <>
                <Icon name="check_circle" size="text-lg" className="text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Upload complete!</span>
              </>
            )}
            {muxProgress.status === 'error' && (
              <>
                <Icon name="error" size="text-lg" className="text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">{muxProgress.error || 'Upload failed'}</span>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
