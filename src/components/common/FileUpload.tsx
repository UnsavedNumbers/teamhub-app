/**
 * FileUpload Component
 * 
 * Global, reusable file upload component that replaces all native file inputs.
 * Provides consistent styling, validation, and accessibility across the app.
 * 
 * Features:
 * - Hidden native input with styled trigger
 * - File type and size validation
 * - Multiple states (default, selected, uploading, error, read-only)
 * - Drag and drop support
 * - Keyboard accessible
 * - Screen reader friendly
 * - Responsive design
 */

import { useState, useRef, useCallback, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { Upload, X, File, Loader2, AlertCircle } from 'lucide-react'

export interface FileUploadProps {
  /** Callback when a valid file is selected */
  onFileSelect: (file: File | null) => void
  /** Currently selected file (for controlled usage) */
  value?: File | null
  /** Accepted file types (MIME types or extensions) */
  accept?: string
  /** Maximum file size in bytes */
  maxSize?: number
  /** Button text when no file is selected */
  buttonText?: string
  /** Button text when file is selected */
  replaceText?: string
  /** Helper text displayed below the input */
  helperText?: string
  /** Label for the input */
  label?: string
  /** Whether the input is required */
  required?: boolean
  /** Whether the input is disabled */
  disabled?: boolean
  /** Whether the input is read-only */
  readOnly?: boolean
  /** Whether the component is in uploading state */
  uploading?: boolean
  /** External error message to display */
  error?: string | null
  /** Whether to show drag and drop zone */
  showDropZone?: boolean
  /** Full width option for forms */
  fullWidth?: boolean
  /** Custom ID for the input (auto-generated if not provided) */
  id?: string
  /** Additional className for the container */
  className?: string
}

export function FileUpload({
  onFileSelect,
  value = null,
  accept,
  maxSize,
  buttonText = 'Choose file',
  replaceText = 'Replace file',
  helperText,
  label,
  required = false,
  disabled = false,
  readOnly = false,
  uploading = false,
  error: externalError = null,
  showDropZone = false,
  fullWidth = false,
  id,
  className = '',
}: FileUploadProps) {
  const [internalFile, setInternalFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  
  // Use controlled value if provided, otherwise use internal state
  const currentFile = value !== undefined ? value : internalFile
  const displayError = externalError || validationError
  const isInteractive = !disabled && !readOnly && !uploading
  const hasFile = !!currentFile

  // Generate unique ID if not provided
  const inputId = id || `file-upload-${Math.random().toString(36).substr(2, 9)}`
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Validate file type
    if (accept) {
      const acceptedTypes = accept.split(',').map(type => type.trim().toLowerCase())
      const fileType = file.type.toLowerCase()
      const fileName = file.name.toLowerCase()
      
      const isAccepted = acceptedTypes.some(acceptedType => {
        // Check MIME type
        if (fileType === acceptedType) return true
        // Check extension (e.g., .png, .jpg)
        if (acceptedType.startsWith('.')) {
          return fileName.endsWith(acceptedType)
        }
        // Check MIME type pattern (e.g., image/*)
        if (acceptedType.endsWith('/*')) {
          const baseType = acceptedType.slice(0, -2)
          return fileType.startsWith(baseType)
        }
        return false
      })

      if (!isAccepted) {
        const acceptedList = acceptedTypes
          .map(t => t.replace('/*', '').replace('.', '').toUpperCase())
          .join(', ')
        return `Invalid file type. Accepted types: ${acceptedList}`
      }
    }

    // Validate file size
    if (maxSize && file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`
    }

    return null
  }, [accept, maxSize])

  // Handle file selection
  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) {
      setInternalFile(null)
      setValidationError(null)
      onFileSelect(null)
      return
    }

    const error = validateFile(file)
    if (error) {
      setValidationError(error)
      setInternalFile(null)
      onFileSelect(null)
      return
    }

    setValidationError(null)
    setInternalFile(file)
    onFileSelect(file)
  }, [validateFile, onFileSelect])

  // Handle input change
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFileSelect(file)
  }, [handleFileSelect])

  // Handle drag and drop
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!isInteractive) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [isInteractive])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!isInteractive) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [isInteractive])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!isInteractive) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [isInteractive, handleFileSelect])

  // Handle trigger click
  const handleTriggerClick = useCallback(() => {
    if (!isInteractive || !fileInputRef.current) return
    fileInputRef.current.click()
  }, [isInteractive])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (!isInteractive) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleTriggerClick()
    }
  }, [isInteractive, handleTriggerClick])

  // Handle remove file
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isInteractive) return
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    handleFileSelect(null)
  }, [isInteractive, handleFileSelect])

  // Build helper text with file type and size info
  const buildHelperText = (): string => {
    if (helperText) return helperText
    
    const parts: string[] = []
    if (accept) {
      const types = accept.split(',').map(t => {
        const trimmed = t.trim()
        if (trimmed.includes('/')) {
          return trimmed.split('/')[1].toUpperCase()
        }
        return trimmed.replace('.', '').toUpperCase()
      }).join(', ')
      parts.push(types)
    }
    if (maxSize) {
      parts.push(`Max ${formatFileSize(maxSize)}`)
    }
    return parts.join('. ')
  }

  const finalHelperText = buildHelperText()

  // Render trigger button
  const renderTrigger = () => {
    const baseClasses = `
      inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed
      transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
      ${fullWidth ? 'w-full justify-center' : ''}
    `

    const stateClasses = !isInteractive
      ? 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
      : isDragging
      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
      : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'

    return (
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        disabled={!isInteractive}
        className={`${baseClasses} ${stateClasses} ${fullWidth ? 'w-full' : ''}`}
        aria-describedby={displayError ? errorId : finalHelperText ? helperId : undefined}
        aria-invalid={!!displayError}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Uploading...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">
              {hasFile ? replaceText : buttonText}
            </span>
          </>
        )}
      </button>
    )
  }

  // Render drop zone
  const renderDropZone = () => {
    if (!showDropZone) return null

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleTriggerClick}
        className={`
          flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8
          transition-all duration-200 cursor-pointer
          ${fullWidth ? 'w-full' : ''}
          ${!isInteractive
            ? 'border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed'
            : isDragging
            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
        role="button"
        tabIndex={isInteractive ? 0 : -1}
        aria-label={hasFile ? replaceText : buttonText}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleTriggerClick()
          }
        }}
      >
        <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {hasFile ? 'Drop file to replace' : 'Drag and drop file here'}
          </p>
          {finalHelperText && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {finalHelperText}
            </p>
          )}
        </div>
        {renderTrigger()}
      </div>
    )
  }

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        id={inputId}
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled || readOnly || uploading}
        className="sr-only"
        aria-describedby={displayError ? errorId : finalHelperText ? helperId : undefined}
        aria-invalid={!!displayError}
        aria-required={required}
      />

      {/* Upload UI */}
      {showDropZone ? (
        renderDropZone()
      ) : (
        <div className="flex flex-col gap-2">
          {renderTrigger()}
          {finalHelperText && (
            <p
              id={helperId}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {finalHelperText}
            </p>
          )}
        </div>
      )}

      {/* Selected file display */}
      {hasFile && !uploading && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <File className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {currentFile.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(currentFile.size)}
            </p>
          </div>
          {isInteractive && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <div
          id={errorId}
          className="mt-2 flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  )
}
