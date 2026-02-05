import { useRef, useState } from 'react'
import { uploadPhotoToGallery } from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { useT } from '@/i18n/useI18n'
import { showError, showSuccess } from '@/utils/toast'
import { Button } from '../platformAdmin'

interface PhotoUploadButtonProps {
  galleryId: string
  onUploadComplete?: () => void
  multiple?: boolean
  maxFiles?: number
  maxSizeMB?: number
}

export function PhotoUploadButton({
  galleryId,
  onUploadComplete,
  multiple = true,
  maxFiles = 20,
  maxSizeMB = 10,
}: PhotoUploadButtonProps) {
  const { context } = useUserContext()
  const t = useT()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const openPicker = () => inputRef.current?.click()

  const handleFiles = async (files: FileList | null) => {
    if (!files || !context) return
    const list = Array.from(files).slice(0, maxFiles)
    setUploading(true)
    try {
      for (const file of list) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          showError(t('photos.errors.fileTooLarge', { name: file.name, size: maxSizeMB }))
          continue
        }
        const { error } = await uploadPhotoToGallery(context, galleryId, file)
        if (error) {
          showError(error.message)
        }
      }
      showSuccess(t('photos.upload.uploadComplete'))
      onUploadComplete?.()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        variant="primary"
        icon={uploading ? undefined : 'file_upload'}
        loading={uploading}
        onClick={openPicker}
        style={{
          borderRadius: '10px',
          fontWeight: 500,
        }}
      >
        {uploading ? t('photos.upload.uploading', { current: 1, total: maxFiles }) : t('photos.uploadPhotos')}
      </Button>
    </>
  )
}
