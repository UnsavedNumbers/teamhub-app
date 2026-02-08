/**
 * VideoThumbnailSelector Component
 * 
 * Allows users to select a custom thumbnail frame from the video.
 * Provides a timeline with frame previews and ability to set custom thumbnail.
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { cn } from '@/utils/cn'
import { showSuccess, showError } from '@/utils/toast'

interface VideoThumbnailSelectorProps {
  videoId: string
  videoUrl: string
  currentThumbnailUrl?: string | null
  duration: number // in seconds
  onThumbnailSelect: (timestamp: number) => Promise<void>
  onClose: () => void
  className?: string
}

export default function VideoThumbnailSelector({
  videoId,
  videoUrl,
  currentThumbnailUrl,
  duration,
  onThumbnailSelect,
  onClose,
  className
}: VideoThumbnailSelectorProps) {
  // videoId is passed but not directly used - it's available for future API calls
  void videoId
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [frameCache, setFrameCache] = useState<Map<number, string>>(new Map())

  // Generate evenly spaced timestamps for frame previews
  const frameTimestamps = useMemo(() => {
    const count = Math.min(10, Math.floor(duration))
    if (count <= 0) return [0]
    
    const frames: number[] = []
    const interval = duration / (count + 1)
    
    for (let i = 1; i <= count; i++) {
      frames.push(Math.round(interval * i * 10) / 10)
    }
    
    return frames
  }, [duration])

  // Capture frame at specific timestamp
  const captureFrame = useCallback((timestamp: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      if (!video || !canvas) {
        resolve(null)
        return
      }

      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked)
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        resolve(dataUrl)
      }

      video.addEventListener('seeked', handleSeeked)
      video.currentTime = timestamp
    })
  }, [])

  // Handle frame selection from timeline
  const handleFrameSelect = useCallback(async (timestamp: number) => {
    setSelectedTimestamp(timestamp)
    setIsCapturing(true)
    
    // Check cache first
    if (frameCache.has(timestamp)) {
      setPreviewImage(frameCache.get(timestamp)!)
      setIsCapturing(false)
      return
    }
    
    const frame = await captureFrame(timestamp)
    if (frame) {
      setPreviewImage(frame)
      setFrameCache(prev => new Map(prev).set(timestamp, frame))
    }
    
    setIsCapturing(false)
  }, [captureFrame, frameCache])

  // Handle slider change for precise selection
  const handleSliderChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const timestamp = parseFloat(e.target.value)
    setSelectedTimestamp(timestamp)
    
    // Debounce the capture
    setIsCapturing(true)
    const frame = await captureFrame(timestamp)
    if (frame) {
      setPreviewImage(frame)
    }
    setIsCapturing(false)
  }, [captureFrame])

  // Save selected thumbnail
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onThumbnailSelect(selectedTimestamp)
      showSuccess('Thumbnail updated successfully')
      onClose()
    } catch (err) {
      showError('Failed to update thumbnail')
      console.error('Thumbnail save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [selectedTimestamp, onThumbnailSelect, onClose])

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
      className
    )}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold">Choose Thumbnail</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <Icon name="close" size="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Hidden video and canvas for frame capture */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="hidden"
            crossOrigin="anonymous"
            preload="metadata"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Preview Area */}
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Selected frame"
                className="w-full h-full object-contain"
              />
            ) : currentThumbnailUrl ? (
              <img
                src={currentThumbnailUrl}
                alt="Current thumbnail"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Icon name="image" size="text-4xl" />
                  <p className="mt-2 text-sm">Select a frame below</p>
                </div>
              </div>
            )}

            {isCapturing && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Icon name="sync" size="text-3xl" className="text-white animate-spin" />
              </div>
            )}

            {/* Timestamp Badge */}
            <div className="absolute bottom-4 right-4 bg-black/75 text-white px-3 py-1.5 rounded-lg text-sm font-mono">
              {formatTime(selectedTimestamp)}
            </div>
          </div>

          {/* Frame Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Quick Select
            </h3>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              {frameTimestamps.map((timestamp) => (
                <button
                  key={timestamp}
                  onClick={() => handleFrameSelect(timestamp)}
                  className={cn(
                    "shrink-0 w-24 h-16 rounded-lg border-2 overflow-hidden transition-all",
                    selectedTimestamp === timestamp
                      ? "border-[var(--org-btn-primary-bg)] ring-2 ring-[var(--org-btn-primary-bg)] ring-opacity-30"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  )}
                >
                  {frameCache.has(timestamp) ? (
                    <img
                      src={frameCache.get(timestamp)!}
                      alt={`Frame at ${formatTime(timestamp)}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-xs text-gray-400 font-mono">
                        {formatTime(timestamp)}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Precise Selection Slider */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Precise Selection
            </h3>
            
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono text-gray-500 w-12">0:00</span>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={selectedTimestamp}
                onChange={handleSliderChange}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--org-btn-primary-bg) 0%, var(--org-btn-primary-bg) ${(selectedTimestamp / duration) * 100}%, #e5e7eb ${(selectedTimestamp / duration) * 100}%, #e5e7eb 100%)`
                }}
              />
              <span className="text-sm font-mono text-gray-500 w-12">{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <div className="text-sm text-gray-500">
            <Icon name="info" size="text-base" className="inline mr-1" />
            Select a frame from the video to use as the thumbnail
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving || !previewImage}
            >
              {isSaving ? (
                <>
                  <Icon name="sync" size="text-lg" className="animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                'Set as Thumbnail'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
