/**
 * AttachmentUpload Component
 * 
 * Handles file uploads with image/PDF support, validation, and progress indicators.
 */

import { useState, useRef } from 'react'
import { Channel } from 'stream-chat'
import Icon from '../portal/Icon'
import { uploadFile, uploadImage } from '../../lib/streamChat'

interface AttachmentUploadProps {
  channel: Channel
  onFileUploaded?: (url: string, type: 'image' | 'file') => void
  maxSizeMB?: number
  allowedTypes?: string[]
}

export default function AttachmentUpload({
  channel,
  onFileUploaded,
  maxSizeMB = 10,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
}: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type not allowed. Accepted: ${allowedTypes.join(', ')}`
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      return `File too large. Maximum size: ${maxSizeMB}MB`
    }

    return null
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset state
    setError(null)
    setProgress(0)

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Upload file
    setUploading(true)
    
    try {
      const isImage = file.type.startsWith('image/')
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      let result
      if (isImage) {
        result = await uploadImage(channel, file)
      } else {
        result = await uploadFile(channel, file)
      }

      clearInterval(progressInterval)
      setProgress(100)

      if (onFileUploaded) {
        onFileUploaded(result.file, isImage ? 'image' : 'file')
      }

      // Reset after short delay
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 500)
    } catch (error: any) {
      console.error('Error uploading file:', error)
      setError(error.message || 'Failed to upload file')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed p-2"
        title="Attach file"
      >
        <Icon name="attach_file" size="text-xl" />
      </button>

      {uploading && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-neutral-900 rounded shadow-lg p-3 min-w-[200px]">
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Uploading...
          </div>
          <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              className="bg-[var(--org-btn-primary-bg)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-full left-0 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 min-w-[250px]">
          <div className="flex items-start gap-2">
            <Icon name="error" size="text-base" className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900 dark:text-red-100">
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
