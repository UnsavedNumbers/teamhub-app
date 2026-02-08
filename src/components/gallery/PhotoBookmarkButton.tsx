import { useState } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { showError } from '../../utils/toast'
import { useUserContext } from '../../hooks/useUserContext'
import { addPhotoBookmark, removePhotoBookmark } from '../../data/services/galleryService'

interface PhotoBookmarkButtonProps {
  photoId: string
  isBookmarked: boolean
  onChanged?: (next: boolean) => void
  variant?: 'icon' | 'text'
}

export function PhotoBookmarkButton({
  photoId,
  isBookmarked,
  onChanged,
  variant = 'icon',
}: PhotoBookmarkButtonProps) {
  const { context } = useUserContext()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!context) return
    if (loading) return
    setLoading(true)
    const next = !isBookmarked
    const result = next
      ? await addPhotoBookmark(context, photoId)
      : await removePhotoBookmark(context, photoId)

    if (result.error) {
      showError(result.error.message)
      setLoading(false)
      return
    }

    onChanged?.(next)
    setLoading(false)
  }

  const label = isBookmarked ? t('photos.bookmarks.remove') : t('photos.bookmarks.add')

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 ${variant === 'icon' ? 'text-slate-500 hover:text-rose-500' : 'text-sm font-semibold'}`}
      aria-pressed={isBookmarked}
      aria-label={label}
    >
      <span className="material-symbols-outlined text-xl">
        {isBookmarked ? 'favorite' : 'favorite_border'}
      </span>
      {variant === 'text' && <span>{label}</span>}
    </button>
  )
}
