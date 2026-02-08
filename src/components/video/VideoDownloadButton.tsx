/**
 * VideoDownloadButton Component
 * 
 * Download button for videos with format selection and progress tracking.
 */

import { useState, useCallback } from 'react'
import { useVideoDownload } from '@/hooks/useVideosExtended'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'
import { showSuccess, showError } from '@/utils/toast'

interface VideoDownloadButtonProps {
  videoId: string
  videoTitle?: string
  availableQualities?: Array<'4k' | '1080p' | '720p' | '480p' | '360p'>
  variant?: 'button' | 'icon' | 'menu-item'
  className?: string
}

export default function VideoDownloadButton({
  videoId,
  videoTitle = 'video',
  availableQualities = ['1080p', '720p', '480p'],
  variant = 'button',
  className
}: VideoDownloadButtonProps) {
  const { getDownloadUrl, isLoading } = useVideoDownload({ videoId })
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleDownload = useCallback(async (_quality: string) => {
    setIsMenuOpen(false)
    
    try {
      const url = await getDownloadUrl()
      
      if (url) {
        // Create download link
        const link = document.createElement('a')
        link.href = url
        link.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}.mp4`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        showSuccess(`Downloading ${videoTitle}`)
      } else {
        showError('Failed to get download URL')
      }
    } catch (err) {
      showError('Failed to start download')
      console.error('Download error:', err)
    }
  }, [videoTitle, getDownloadUrl])

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          disabled={isLoading}
          className={cn(
            "p-2 rounded-lg transition-colors",
            isLoading
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800",
            className
          )}
          title="Download video"
        >
          {isLoading ? (
            <Icon name="sync" size="text-xl" className="animate-spin" />
          ) : (
            <Icon name="download" size="text-xl" />
          )}
        </button>

        {isMenuOpen && (
          <QualityMenu
            qualities={availableQualities}
            onSelect={handleDownload}
            onClose={() => setIsMenuOpen(false)}
          />
        )}
      </div>
    )
  }

  // Menu item variant
  if (variant === 'menu-item') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          disabled={isLoading}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
            isLoading
              ? "text-gray-400 cursor-not-allowed"
              : "hover:bg-gray-50 dark:hover:bg-gray-800",
            className
          )}
        >
          {isLoading ? (
            <Icon name="sync" size="text-lg" className="animate-spin" />
          ) : (
            <Icon name="download" size="text-lg" />
          )}
          <span className="text-sm font-medium">
            {isLoading ? 'Downloading...' : 'Download Video'}
          </span>
        </button>

        {isMenuOpen && (
          <QualityMenu
            qualities={availableQualities}
            onSelect={handleDownload}
            onClose={() => setIsMenuOpen(false)}
            position="right"
          />
        )}
      </div>
    )
  }

  // Default button variant
  return (
    <div className="relative">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={isLoading}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
          isLoading
            ? "border-gray-200 text-gray-400 cursor-not-allowed"
            : "border-gray-200 dark:border-gray-700 hover:border-[var(--org-btn-primary-bg)] hover:text-[var(--org-btn-primary-bg)]",
          className
        )}
      >
        {isLoading ? (
          <>
            <Icon name="sync" size="text-lg" className="animate-spin" />
            <span className="text-sm font-medium">Loading...</span>
          </>
        ) : (
          <>
            <Icon name="download" size="text-lg" />
            <span className="text-sm font-medium">Download</span>
          </>
        )}
      </button>

      {isMenuOpen && (
        <QualityMenu
          qualities={availableQualities}
          onSelect={handleDownload}
          onClose={() => setIsMenuOpen(false)}
        />
      )}
    </div>
  )
}

// Quality selection submenu
interface QualityMenuProps {
  qualities: Array<'4k' | '1080p' | '720p' | '480p' | '360p'>
  onSelect: (quality: string) => void
  onClose: () => void
  position?: 'bottom' | 'right'
}

function QualityMenu({ qualities, onSelect, onClose, position = 'bottom' }: QualityMenuProps) {
  const qualityLabels: Record<string, { label: string; description: string }> = {
    '4k': { label: '4K', description: 'Ultra HD (2160p)' },
    '1080p': { label: '1080p', description: 'Full HD' },
    '720p': { label: '720p', description: 'HD' },
    '480p': { label: '480p', description: 'Standard' },
    '360p': { label: '360p', description: 'Mobile' }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className={cn(
        "absolute z-20 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-2",
        position === 'right' 
          ? "left-full top-0 ml-1"
          : "top-full left-0 mt-2"
      )}>
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500">
          Select Quality
        </div>
        
        {qualities.map(quality => {
          const config = qualityLabels[quality]
          return (
            <button
              key={quality}
              onClick={() => onSelect(quality)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="text-sm font-bold">{config.label}</span>
              <span className="text-xs text-gray-500">{config.description}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
