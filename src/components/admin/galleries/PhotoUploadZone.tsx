import { useCallback, useRef, useState } from 'react'
import { uploadPhotoToGallery, type GalleryPhoto, type PhotoStatus } from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { showError, showSuccess } from '@/utils/toast'
import { Button, Card, ProgressBar } from '@/components/platformAdmin'

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
  status?: PhotoStatus
  onComplete?: (uploaded: GalleryPhoto[]) => void
}

export function PhotoUploadZone({
  galleryId,
  maxFiles = 50,
  maxSizeMB = 10,
  status = 'approved',
  onComplete,
}: PhotoUploadZoneProps) {
  const { context } = useUserContext()
  const [items, setItems] = useState<UploadItem[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported format. Use JPEG, PNG, WebP, or HEIC.'
    }
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      return `File too large. Max ${maxSizeMB}MB`
    }
    return null
  }

  const queueFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      const next: UploadItem[] = []
      const totalAllowed = Math.min(maxFiles - items.length, fileList.length)
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
    [items.length, maxFiles, maxSizeMB]
  )

  const uploadSingle = async (item: UploadItem) => {
    if (!context) return
    setIsUploading(true)
    setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, state: 'uploading', progress: 10 } : p)))
    try {
      const { data, error } = await uploadPhotoToGallery(context, galleryId, item.file, null, status)
      if (error || !data) throw error || new Error('Upload failed')
      setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, state: 'success', progress: 100 } : p)))
      onComplete?.([data])
      showSuccess(`${item.file.name} uploaded`)
    } catch (err: any) {
      setItems((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, state: 'error', progress: 0, error: err?.message || 'Upload failed' } : p
        )
      )
      showError(err?.message || 'Upload failed')
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

  return (
    <div className="pa-space-y-4">
      <Card
        className={`pa-card ${isDragging ? 'pa-border-brand' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragging(false)
        }}
        onDrop={onDrop}
        style={{ borderStyle: 'dashed' }}
      >
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <p className="pa-text-lg pa-font-semibold">Upload photos</p>
          <p className="pa-text-sm pa-text-muted">JPEG, PNG, WebP, HEIC • Up to {maxSizeMB}MB each • {maxFiles} files</p>
          <div className="pa-flex pa-justify-center pa-gap-2 pa-mt-3">
            <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              Select files
            </Button>
            <Button variant="ghost" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              Browse
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </Card>

      {items.length > 0 && (
        <Card className="pa-card">
          <div className="pa-flex pa-justify-between pa-items-center pa-mb-3">
            <h4 className="pa-text-base pa-font-semibold">Upload queue</h4>
            <Button variant="ghost" size="small" onClick={cancelQueue} disabled={isUploading === false}>
              Cancel pending
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
                      {item.state === 'success' && 'Done'}
                      {item.state === 'error' && 'Failed'}
                      {item.state === 'pending' && 'Queued'}
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
