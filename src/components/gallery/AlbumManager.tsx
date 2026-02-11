import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { showError, showSuccess } from '../../utils/toast'
import {
  createGalleryAlbum,
  deleteGalleryAlbum,
  getAlbumsForGallery,
  updateGalleryAlbum,
  type GalleryAlbum,
} from '../../data/services/galleryService'
import { useUserContext } from '../../hooks/useUserContext'

interface AlbumManagerProps {
  galleryId: string
  onAlbumsUpdated?: (albums: GalleryAlbum[]) => void
}

export function AlbumManager({ galleryId, onAlbumsUpdated }: AlbumManagerProps) {
  const { context } = useUserContext()
  const { t } = useI18n()
  const [albums, setAlbums] = useState<GalleryAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  const loadAlbums = async () => {
    if (!context) return
    setLoading(true)
    const { data, error } = await getAlbumsForGallery(context, galleryId)
    if (error) {
      showError(error.message)
    } else {
      setAlbums(data)
      onAlbumsUpdated?.(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAlbums()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId])

  const handleCreate = async () => {
    if (!context) return
    if (!newName.trim()) {
      showError(t('photos.albums.nameRequired'))
      return
    }
    setCreating(true)
    const { data, error } = await createGalleryAlbum(context, galleryId, newName.trim(), newDescription)
    if (error || !data) {
      showError(error?.message || t('photos.albums.createError'))
      setCreating(false)
      return
    }
    showSuccess(t('photos.albums.created'))
    setNewName('')
    setNewDescription('')
    await loadAlbums()
    setCreating(false)
  }

  const startEdit = (album: GalleryAlbum) => {
    setEditingId(album.id)
    setEditingName(album.name)
    setEditingDescription(album.description || '')
  }

  const handleSaveEdit = async () => {
    if (!context || !editingId) return
    if (!editingName.trim()) {
      showError(t('photos.albums.nameRequired'))
      return
    }
    const { data, error } = await updateGalleryAlbum(context, editingId, {
      name: editingName.trim(),
      description: editingDescription,
    })
    if (error || !data) {
      showError(error?.message || t('photos.albums.updateError'))
      return
    }
    showSuccess(t('photos.albums.updated'))
    setEditingId(null)
    await loadAlbums()
  }

  const handleDelete = async (albumId: string) => {
    if (!context) return
    const confirm = window.confirm(t('photos.albums.deleteConfirm'))
    if (!confirm) return
    const { error } = await deleteGalleryAlbum(context, albumId)
    if (error) {
      showError(error.message)
      return
    }
    showSuccess(t('photos.albums.deleted'))
    await loadAlbums()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{t('photos.albums.title')}</h3>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.albums.nameLabel')}
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              placeholder={t('photos.albums.namePlaceholder')}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              {t('photos.albums.descriptionLabel')}
            </label>
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
              placeholder={t('photos.albums.descriptionPlaceholder')}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
        >
          {creating ? t('photos.albums.creating') : t('photos.albums.create')}
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-slate-500">{t('common.loading')}</div>
        ) : albums.length === 0 ? (
          <div className="text-sm text-slate-500">{t('photos.albums.empty')}</div>
        ) : (
          albums.map((album) => (
            <div key={album.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              {editingId === album.id ? (
                <div className="space-y-2">
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  />
                  <input
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-3 py-2 rounded-md bg-slate-900 text-white text-xs font-semibold"
                    >
                      {t('common.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 rounded-md border border-slate-300 text-xs font-semibold"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{album.name}</div>
                    {album.description && (
                      <div className="text-xs text-slate-500">{album.description}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(album)}
                      className="px-3 py-1.5 rounded-md border border-slate-300 text-xs font-semibold"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(album.id)}
                      className="px-3 py-1.5 rounded-md border border-red-300 text-red-600 text-xs font-semibold"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
