import { useCallback, useRef, useState } from 'react'
import { uploadPhotoToGallery, type GalleryPhoto, type PhotoStatus } from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showSuccess } from '@/utils/toast'
import { Button, Card, ProgressBar, InlineNotice } from '@/components/platformAdmin'

type UploadState = 'pending' | 'uploading' | 'success' | 'error' | 'canceled'

interface UploadItem {
  id: string
  file: File
  progress: number
  state: UploadState
  error?: string
}

interface PhotoUploadZoneProps {
  galleryId: string
  maxFiles?: number
  maxSizeMB?: number
  maxPhotos?: number // Max photos remaining in gallery
  requireApproval?: boolean // If true, parent uploads need approval
  hideButton?: boolean // If true, hide the "Choose Files" button
  onComplete?: (uploaded: GalleryPhoto[]) => void
}

export function PhotoUploadZone({
  galleryId,
  maxFiles = 50,
  maxSizeMB = 10,
  maxPhotos,
  requireApproval = false,
  hideButton = false,
  onComplete,
}: PhotoUploadZoneProps) {
  const { context } = useUserContext()
  const { t } = useI18n()
  const [items, setItems] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Determine approval status based on user role
  const getApprovalStatus = (): PhotoStatus => {
    if (!requireApproval) return 'approved'
    
    // Coaches and org admins: auto-approve
    const isCoach = context?.roles?.includes('coach')
    const isOrgAdmin = context?.roles?.includes('org_admin')
    
    if (isCoach || isOrgAdmin) {
      return 'approved'
    }
    
    // Parents: pending approval
    return 'pending'
  }

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return t('photos.upload.validTypes')
    }
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return t('photos.upload.maxSize', { size: maxSizeMB })
    }
    return null
  }

  const queueFiles = useCallback(
    (fileList: FileList | null) => {
      if (USE_FAKE_DATA) {
        showError(t('photos.demoMode.uploadBlocked'))
        return
      }

      if (!fileList) return

      // Check max photos limit
      if (maxPhotos !== undefined && items.length >= maxPhotos) {
        showError(t('photos.photoLimit.reached'))
        return
      }

      const remaining = maxPhotos !== undefined ? maxPhotos - items.length : maxFiles
      const totalAllowed = Math.min(remaining, fileList.length)

      if (fileList.length > totalAllowed) {
        showError(t('photos.photoLimit.canUpload', { count: totalAllowed }))
      }

      const next: UploadItem[] = []
      for (let i = 0; i < totalAllowed; i++) {
        const file = fileList[i]
        const error = validateFile(file)
        next.push({
          id: `${Date.now()}-${i}`,
          file,
          progress: 0,
          state: error ? 'error' : 'pending',
          error: error || undefined,
        })
      }
      setItems((prev) => [...prev, ...next])
      // kick off uploads
      next.filter((f) => f.state === 'pending').forEach((f) => void uploadSingle(f))
    },
    [items.length, maxFiles, maxSizeMB, maxPhotos, USE_FAKE_DATA, t]
  )

  const uploadSingle = async (item: UploadItem) => {
    if (!context) return
    setIsUploading(true)
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, state: 'uploading', progress: 10 } : p)))
    
    try {
      const approvalStatus = getApprovalStatus()
      const { data, error } = await uploadPhotoToGallery(context, galleryId, item.file, null, approvalStatus)
      if (error || !data) throw error || new Error(t('photos.errors.uploadPhoto'))
      
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, state: 'success', progress: 100 } : p)))
      onComplete?.([data])
      
      // Show appropriate success message based on approval status
      if (approvalStatus === 'pending') {
        showSuccess(t('photos.pendingApproval.message'))
      } else {
        showSuccess(t('photos.success.photoUploaded'))
      }
    } catch (err: any) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, state: 'error', progress: 0, error: err?.message || t('photos.errors.uploadPhoto') } : p
        )
      )
      showError(err?.message || t('photos.errors.uploadPhoto'))
    } finally {
      setIsUploading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    queueFiles(e.dataTransfer.files)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    queueFiles(e.target.files)
    if (inputRef.current) inputRef.current.value = ''
  }

  const cancelQueue = () => {
    setItems((prev) =>
      prev
        .map((p) => (p.state === 'pending' ? ({ ...p, state: 'canceled' } as UploadItem) : p))
        .filter((p) => p.state !== 'canceled')
    )
  }

  const isLimitReached = maxPhotos !== undefined && maxPhotos <= 0

  return (
    <div className="pa-space-y-4">
      {/* Approval Notice */}
      {requireApproval && getApprovalStatus() === 'pending' && (
        <InlineNotice
          tone="info"
          title={t('photos.pendingApproval.message')}
          message={t('photos.pendingApproval.waitingMessage')}
        />
      )}

      {requireApproval && getApprovalStatus() === 'approved' && (
        <InlineNotice
          tone="success"
          title={t('photos.autoApproved')}
          message={t('photos.approvedByCoach')}
        />
      )}

      <Card
        className={`pa-card ${isDragging ? 'pa-border-brand' : ''} ${isLimitReached ? 'pa-opacity-50' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!isLimitReached) setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={isLimitReached ? undefined : onDrop}
        style={{ borderStyle: 'dashed', marginTop: '6px' }}
      >
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-text-muted)', marginBottom: '12px', display: 'block' }}>cloud_upload</span>
          <p className="pa-text-lg pa-font-semibold">{t('photos.upload.dragDrop')}</p>
          <p className="pa-text-sm pa-text-muted">
            {t('photos.upload.validTypes')} • {t('photos.upload.maxSize', { size: maxSizeMB })}
          </p>
          {maxPhotos !== undefined && (
            <p className="pa-text-xs pa-text-muted pa-mt-1">
              {t('photos.photoLimit.remaining', { remaining: maxPhotos, limit: maxPhotos + items.length })}
            </p>
          )}
          {!hideButton && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
              <Button 
                variant="primary" 
                onClick={() => inputRef.current?.click()} 
                disabled={isUploading || isLimitReached}
              >
                {t('photos.upload.selectFiles')}
              </Button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
            multiple
            style={{ display: 'none' }}
            onChange={onFileChange}
            disabled={isLimitReached}
          />
        </div>
      </Card>

      {items.length > 0 && (
        <Card className="pa-card">
          <div className="pa-flex pa-justify-between pa-items-center pa-mb-3">
            <h4 className="pa-text-base pa-font-semibold">{t('photos.upload.title')}</h4>
            <Button variant="ghost" size="small" onClick={cancelQueue} disabled={!isUploading}>
              {t('common.cancel')}
            </Button>
          </div>
          <div className="pa-space-y-3">
            {items.map((item) => (
              <div key={item.id} className="pa-flex pa-items-center pa-gap-3">
                <div className="pa-flex-1">
                  <div className="pa-flex pa-justify-between pa-items-center">
                    <span className="pa-text-sm">{item.file.name}</span>
                    <span className="pa-text-xs pa-text-muted">
                      {item.state === 'uploading' && `${item.progress}%`}
                      {item.state === 'success' && t('common.success')}
                      {item.state === 'error' && t('common.error.label')}
                      {item.state === 'pending' && t('common.pending')}
                    </span>
                  </div>
                  <ProgressBar value={item.state === 'success' ? 100 : item.progress} />
                  {item.error && <p className="pa-text-xs pa-text-danger pa-mt-1">{item.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
