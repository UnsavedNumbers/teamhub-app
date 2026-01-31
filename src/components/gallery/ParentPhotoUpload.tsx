/**
 * Parent Photo Upload Component
 * 
 * Simplified upload UI for parents contributing photos.
 * Photos are uploaded with status='pending' and require approval.
 */

import { useState, useRef, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import Icon from '../portal/Icon'
import Card from '../portal/Card'
import Button from '../portal/Button'
import { showError, showSuccess } from '../../utils/toast'
import {
  uploadPhotoToGallery,
  type Gallery,
} from '../../data/services/galleryService'

interface ParentPhotoUploadProps {
  gallery: Gallery
  onUploadComplete?: () => void
}

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export function ParentPhotoUpload({ gallery, onUploadComplete }: ParentPhotoUploadProps) {
  const { context } = useUserContext()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic']
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload JPG, PNG, or HEIC images.'
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
  }, [])

  const uploadPhoto = async (uploadFile: UploadFile) => {
    if (!context.orgId) {
      showError('Organization context required')
      return
    }

    if (!agreedToGuidelines) {
      showError('Please agree to the media guidelines before uploading')
      return
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      )
    )

    try {
      const { data: photo, error: uploadError } = await uploadPhotoToGallery(
        context,
        gallery.id,
        uploadFile.file,
        null, // No album for parent uploads
        'pending' // Parents upload pending photos
      )

      if (uploadError || !photo) {
        throw uploadError || new Error('Upload failed')
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      )

      showSuccess(`Uploaded ${uploadFile.file.name}. Your photo is pending review.`)
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
      showError(`Failed to upload ${uploadFile.file.name}: ${errorMessage}`)
    }
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

  const handleSubmit = () => {
    if (!agreedToGuidelines) {
      showError('Please agree to the media guidelines')
      return
    }

    files
      .filter((f) => f.status === 'pending')
      .forEach((uploadFile) => uploadPhoto(uploadFile))
  }

  return (
    <div className="space-y-4">
      {/* Entry point */}
      <Card>
        <h3 className="text-lg font-bold mb-4">Share Your Highlights</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Icon name="camera_alt" size="text-lg" className="mr-2" />
            TAKE PHOTO
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Icon name="photo_library" size="text-lg" className="mr-2" />
            Upload from Gallery
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic"
            multiple
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {/* Selected photos */}
      {files.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">Selected Photos</h3>
          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div key={uploadFile.id} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  <img
                    src={URL.createObjectURL(uploadFile.file)}
                    alt={uploadFile.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{uploadFile.file.name}</span>
                    {uploadFile.status === 'pending' && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                        Pending Review
                      </span>
                    )}
                    {uploadFile.status === 'success' && (
                      <Icon name="check_circle" className="text-green-500" />
                    )}
                    {uploadFile.status === 'error' && (
                      <Icon name="error" className="text-red-500" />
                    )}
                  </div>
                  {uploadFile.error && (
                    <p className="text-xs text-red-500">{uploadFile.error}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => removeFile(uploadFile.id)}
                >
                  <Icon name="close" size="text-sm" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Moderation notice */}
      {files.length > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="guidelines-agreement"
              checked={agreedToGuidelines}
              onChange={(e) => setAgreedToGuidelines(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="guidelines-agreement" className="text-sm text-slate-700 dark:text-slate-300">
              I understand and agree to the team's media guidelines. All photos will be reviewed before being added to the gallery.
            </label>
          </div>
        </Card>
      )}

      {/* Submit button */}
      {files.length > 0 && (
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!agreedToGuidelines || files.some((f) => f.status === 'uploading')}
          className="w-full"
        >
          SUBMIT {files.filter((f) => f.status === 'pending' || f.status === 'error').length} PHOTO{files.filter((f) => f.status === 'pending' || f.status === 'error').length !== 1 ? 'S' : ''}
        </Button>
      )}
    </div>
  )
}
