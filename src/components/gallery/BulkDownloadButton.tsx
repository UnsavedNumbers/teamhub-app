import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useI18n } from '../../i18n/useI18n'
import { showError } from '../../utils/toast'

interface BulkDownloadButtonProps {
  galleryId: string
  photoIds?: string[]
  disabled?: boolean
  label?: string
  onComplete?: () => void
}

export function BulkDownloadButton({
  galleryId,
  photoIds,
  disabled = false,
  label,
  onComplete,
}: BulkDownloadButtonProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    if (disabled || loading) return
    setLoading(true)
    const { data, error } = await supabase.functions.invoke('generate-gallery-download', {
      body: {
        gallery_id: galleryId,
        photo_ids: photoIds && photoIds.length > 0 ? photoIds : undefined,
      },
    })

    if (error || !data?.url) {
      showError(error?.message || t('photos.download.error'))
      setLoading(false)
      return
    }

    const link = document.createElement('a')
    link.href = data.url as string
    link.download = data.filename || 'gallery-download.zip'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setLoading(false)
    onComplete?.()
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled || loading}
      className="flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors disabled:opacity-60"
    >
      <span className="material-symbols-outlined text-xl">download</span>
      {loading ? t('photos.download.generating') : label || t('photos.download.download')}
    </button>
  )
}
