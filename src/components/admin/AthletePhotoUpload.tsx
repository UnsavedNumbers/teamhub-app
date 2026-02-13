/**
 * Athlete Photo Upload Component
 *
 * Reusable component for uploading athlete profile photos with:
 * - File selection (jpg, png, webp)
 * - Image preview
 * - Client-side validation (type, size, dimensions)
 * - Error handling
 * - Remove photo button
 */

import { useState, useCallback } from 'react'
import { X, Image as ImageIcon } from 'lucide-react'
import { FileUpload } from '../common/FileUpload'

interface AthletePhotoUploadProps {
    /** Current photo file (for preview before upload) */
    photoFile: File | null
    /** Current photo URL (for existing photos) */
    photoUrl: string | null
    /** Callback when photo file is selected */
    onPhotoSelect: (file: File | null) => void
    /** Callback when photo should be removed */
    onPhotoRemove: () => void
    /** Whether the component is disabled */
    disabled?: boolean
    /** Error message to display */
    error?: string | null
    /** Label for the upload section */
    label?: string
}

export function AthletePhotoUpload({
    photoFile,
    photoUrl,
    onPhotoSelect,
    onPhotoRemove,
    disabled = false,
    error = null,
    label = 'Profile Photo'
}: AthletePhotoUploadProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)

    // Generate preview URL from file
    const generatePreview = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string)
        }
        reader.onerror = () => {
            setValidationError('Failed to read image file')
            setPreviewUrl(null)
        }
        reader.readAsDataURL(file)
    }, [])

    // Handle file selection (with dimension validation)
    const handleFileSelect = useCallback((file: File | null) => {
        if (!file) {
            onPhotoSelect(null)
            setPreviewUrl(null)
            setValidationError(null)
            return
        }

        // FileUpload component handles type and size validation
        // Here we only need to validate dimensions and generate preview
        const img = new Image()
        img.onload = () => {
            const maxDimension = 2000
            if (img.width > maxDimension || img.height > maxDimension) {
                setValidationError(`Image dimensions exceed ${maxDimension}x${maxDimension}px. Please upload a smaller image.`)
                setPreviewUrl(null)
                onPhotoSelect(null)
                return
            }

            // All validations passed
            setValidationError(null)
            generatePreview(file)
            onPhotoSelect(file)
        }
        img.onerror = () => {
            setValidationError('Invalid image file. Please try a different image.')
            setPreviewUrl(null)
            onPhotoSelect(null)
        }
        img.src = URL.createObjectURL(file)
    }, [onPhotoSelect, generatePreview])

    // Handle remove photo
    const handleRemove = useCallback(() => {
        setPreviewUrl(null)
        setValidationError(null)
        onPhotoSelect(null)
        onPhotoRemove()
    }, [onPhotoSelect, onPhotoRemove])

    // Determine which image to show (preview from file, existing URL, or placeholder)
    const displayImage = previewUrl || photoUrl
    const hasPhoto = !!photoFile || !!photoUrl
    const displayError = error || validationError

    return (
        <div className="pa-form-group">
            <label className="oa-label">{label}</label>
            
            <div className="flex flex-col gap-4">
                {/* Photo Preview/Display */}
                <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                        {displayImage ? (
                            <img
                                src={displayImage}
                                alt="Profile photo preview"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                <ImageIcon className="w-8 h-8 mb-2" />
                                <span className="text-xs">No photo</span>
                            </div>
                        )}
                    </div>
                    
                    {/* Remove button (only show if there's a photo) */}
                    {hasPhoto && !disabled && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                            aria-label="Remove photo"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* File Input */}
                <FileUpload
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    maxSize={5 * 1024 * 1024}
                    helperText="JPG, PNG, or WebP. Max 5MB. Recommended: 2000x2000px or smaller."
                    value={photoFile}
                    onFileSelect={handleFileSelect}
                    disabled={disabled}
                    buttonText="Upload Photo"
                    replaceText="Replace Photo"
                    error={displayError}
                />
            </div>
        </div>
    )
}

