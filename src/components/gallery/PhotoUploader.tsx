/**
 * Photo Uploader Component
 * 
 * Drag-and-drop zone for uploading photos to a gallery.
 * Supports JPG, PNG, HEIC up to 50MB.
 */

import { useState, useRef, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import Icon from '../portal/Icon'
import Card from '../portal/Card'
import Button from '../portal/Button'
import { showError, showSuccess } from '../../utils/toast'
import {
  uploadPhotoToGallery,
  type Gallery,
  type PhotoStatus,
} from '../../data/services/galleryService'

interface PhotoUploaderProps {
  gallery: Gallery
  onUploadComplete?: () => void
  albumId?: string | null
  status?: PhotoStatus // 'approved' for coaches/admins, 'pending' for parents
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function PhotoUploader({
  gallery,
  onUploadComplete,
  albumId,
  status = 'approved',
}: PhotoUploaderProps) {
  const { context } = useUserContext()
  const t = useT()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic']
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (!allowedTypes.includes(file.type)) {
      return t('gallery.photoUploader.dragDropSubtitle')
    }

    if (file.size > maxSize) {
      return `File size exceeds 50MB limit. File is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    }

    return null
  }

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const newFiles: UploadFile[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      const error = validateFile(file)
      
      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      })
    }

    setFiles((prev) => [...prev, ...newFiles])
    
    // Auto-upload valid files
    newFiles.forEach((uploadFile) => {
      if (uploadFile.status === 'pending') {
        uploadPhoto(uploadFile)
      }
    })
  }, [])

  const uploadPhoto = async (uploadFile: UploadFile) => {
    if (!context.orgId) {
      showError('Organization context required')
      return
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      )
    )

    try {
      // Generate photo ID
      const photoId = crypto.randomUUID()
      const fileExt = uploadFile.file.name.split('.').pop() || 'jpg'
      const storagePath = `orgs/${context.orgId}/galleries/${gallery.id}/${photoId}.${fileExt}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('public-media')
        .upload(storagePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      // Update progress
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, progress: 50 } : f
        )
      )

      // Upload photo using service
      const { data: photo, error: uploadServiceError } = await uploadPhotoToGallery(
        context,
        gallery.id,
        uploadFile.file,
        albumId,
        status
      )

      if (uploadServiceError || !photo) {
        throw uploadServiceError || new Error('Upload failed')
      }

      // Mark as success
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      )

      showSuccess(t('gallery.photoUploader.uploadSuccess', { fileName: uploadFile.file.name }))
      onUploadComplete?.()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: errorMessage }
            : f
        )
      )
      showError(t('gallery.photoUploader.uploadError', { fileName: uploadFile.file.name, error: errorMessage }))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const retryUpload = (uploadFile: UploadFile) => {
    uploadPhoto(uploadFile)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-300 dark:border-slate-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center py-12">
          <Icon name="cloud_upload" size="text-6xl" className="text-slate-400 mb-4 mx-auto" />
          <p className="text-lg font-semibold mb-2">{t('gallery.photoUploader.dragDropTitle')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {t('gallery.photoUploader.dragDropSubtitle')}
          </p>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('gallery.photoUploader.selectFiles')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {/* Upload queue */}
      {files.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">{t('gallery.photoUploader.uploadQueue')}</h3>
          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{uploadFile.file.name}</span>
                    {uploadFile.status === 'success' && (
                      <Icon name="check_circle" className="text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <Icon name="error" className="text-red-500" />
                    )}
                    {uploadFile.status === 'uploading' && (
                      <span className="text-xs text-slate-500">{uploadFile.progress}%</span>
                    )}
                  </div>
                  {uploadFile.status === 'uploading' && (
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                  {uploadFile.error && (
                    <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {uploadFile.status === 'error' && (
                    <Button
                      variant="secondary"
                      onClick={() => retryUpload(uploadFile)}
                    >
                      Retry
                    </Button>
                  )}
                  {(uploadFile.status === 'success' || uploadFile.status === 'error') && (
                    <Button
                      variant="secondary"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
