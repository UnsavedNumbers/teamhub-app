/**
 * Gallery View Page
 *
 * Displays a single gallery with photos in a grid layout, with selection, tagging,
 * and yet-another-react-lightbox for full-size viewing.
 */

import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { useUserContext } from '../hooks/useUserContext'
import {
  getGalleryById,
  getPhotosForGallery,
  getGalleryPhotoUrl,
  getGalleryPhotoThumbnailUrl,
  checkCanModerateGallery,
  checkCanUploadToGallery,
  type Gallery,
  type GalleryPhoto,
} from '../data/services/galleryService'
import PortalLayout from '../components/portal/PortalLayout'
import Card from '../components/portal/Card'
import Icon from '../components/portal/Icon'
import Button from '../components/portal/Button'
import { PhotoUploader } from '../components/gallery/PhotoUploader'
import { ParentPhotoUpload } from '../components/gallery/ParentPhotoUpload'
import { ModerationQueue } from '../components/gallery/ModerationQueue'
import { TaggingSlideout } from '../components/gallery/TaggingSlideout'
import { BulkTaggingModal } from '../components/gallery/BulkTaggingModal'
import { GalleryEditModal } from '../components/admin/galleries/GalleryEditModal'
import { getLink } from '../utils/routes'
import { useI18n } from '../i18n/useI18n'

export default function PhotosGallery() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isManageMode = location.pathname.includes('/manage')
  const { context, isReady } = useUserContext()
  const { t } = useI18n()
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [canModerate, setCanModerate] = useState(false)
  const [canUpload, setCanUpload] = useState(false)
  const [showParentUpload, setShowParentUpload] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [taggingPhoto, setTaggingPhoto] = useState<GalleryPhoto | null>(null)
  const [taggingPhotoIndex, setTaggingPhotoIndex] = useState<number>(-1)
  const [bulkTaggingPhotos, setBulkTaggingPhotos] = useState<GalleryPhoto[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<Set<string>>(new Set())
  const [showAthleteDropdown, setShowAthleteDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAthleteDropdown(false)
      }
    }

    if (showAthleteDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAthleteDropdown])

  // Extract unique athletes from all photos
  const taggedAthletes = photos.reduce((acc, photo) => {
    if (photo.tagged_athletes) {
      photo.tagged_athletes.forEach(athlete => {
        if (!acc.find(a => a.id === athlete.id)) {
          acc.push(athlete)
        }
      })
    }
    return acc
  }, [] as Array<{ id: string; first_name: string; last_name: string }>)

  // Get the currently selected athletes
  const selectedAthletes = selectedAthleteIds.size > 0
    ? taggedAthletes.filter(a => selectedAthleteIds.has(a.id))
    : []

  useEffect(() => {
    if (!isReady || !id) return

    const loadGallery = async () => {
      setLoading(true)
      setError(null)

      const [galleryResult, photosResult] = await Promise.all([
        getGalleryById(context, id),
        getPhotosForGallery(context, {
          gallery_id: id,
          athlete_id: selectedAthleteIds.size > 0 ? Array.from(selectedAthleteIds).join(',') : undefined,
        }),
      ])

      if (galleryResult.error) {
        setError(galleryResult.error.message)
        setLoading(false)
        return
      }

      if (photosResult.error) {
        setError(photosResult.error.message)
        setLoading(false)
        return
      }

      setGallery(galleryResult.data)
      setPhotos(photosResult.data || [])

      // Check permissions
      if (galleryResult.data) {
        const [moderateResult, uploadResult] = await Promise.all([
          checkCanModerateGallery(context, galleryResult.data.id),
          checkCanUploadToGallery(context, galleryResult.data.id),
        ])
        setCanModerate(moderateResult.allowed)
        setCanUpload(uploadResult.allowed)
      }

      setLoading(false)
    }

    loadGallery()
  }, [context, isReady, id, selectedAthleteIds])

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Photos', path: getLink('portal.photos') },
          { label: 'Loading...' },
        ]}
      >
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-square bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </PortalLayout>
    )
  }

  if (error || !gallery) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Photos', path: getLink('portal.photos') },
          { label: 'Error' },
        ]}
      >
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-600 dark:text-red-400">
            {error || 'Gallery not found'}
          </p>
        </Card>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Photos', path: getLink('portal.photos') },
        { label: gallery.name },
      ]}
    >
      {/* Header Section */}
      <section className="mb-16">
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl md:text-7xl font-[900] tracking-tighter text-slate-900 dark:text-white leading-none">
            {gallery.name}
          </h1>

          <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-8">
              {/* Athlete filter dropdown */}
              {taggedAthletes.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowAthleteDropdown(!showAthleteDropdown)}
                    className="group flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {selectedAthletes.length === 0 ? 'All Athletes' : `${selectedAthletes.length} Athlete${selectedAthletes.length > 1 ? 's' : ''}`}
                    <span className={`material-symbols-outlined text-sm transition-transform ${showAthleteDropdown ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Dropdown menu */}
                  {showAthleteDropdown && (
                    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[200px] z-50">
                      <button
                        onClick={() => setSelectedAthleteIds(new Set())}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Clear All
                      </button>
                      {taggedAthletes.map((athlete) => {
                        const isSelected = selectedAthleteIds.has(athlete.id)
                        return (
                          <button
                            key={athlete.id}
                            onClick={() => {
                              setSelectedAthleteIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(athlete.id)) {
                                  next.delete(athlete.id)
                                } else {
                                  next.add(athlete.id)
                                }
                                return next
                              })
                            }}
                            className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <span className={isSelected ? 'font-semibold text-black dark:text-white' : 'text-slate-600 dark:text-slate-300'}>
                              {athlete.first_name}
                            </span>
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAthleteIds((prev) => {
                                    const next = new Set(prev)
                                    next.delete(athlete.id)
                                    return next
                                  })
                                }}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">close</span>
                              </button>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {gallery.require_approval && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                  {t('photos.galleryView.moderationRequired')}
                </span>
              )}
              {!isManageMode && canModerate && (
                <Link to={getLink('portal.photosGalleryManage', { id: gallery.id })}>
                  <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors">
                    <Icon name="edit" size="text-sm" />
                    {t('photos.galleryView.manage')}
                  </button>
                </Link>
              )}
              {!isManageMode && gallery.allow_contributions && canUpload && (
                <button
                  onClick={() => setShowParentUpload(!showParentUpload)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Icon name="add" size="text-sm" />
                  {t('photos.galleryView.addYourPhotos')}
                </button>
              )}
              {canModerate && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <Icon name="edit" size="text-sm" />
                  Update Album
                </button>
              )}
            </div>

            <div className="text-sm font-medium text-slate-400 italic">
              Showing {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            </div>
          </div>
        </div>
      </section>

      {/* Parent upload (shown in view mode when allow_contributions is true) */}
      {!isManageMode && showParentUpload && gallery && gallery.allow_contributions && (
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('photos.galleryView.shareHighlights')}</h2>
            <Button
              variant="secondary"
              onClick={() => setShowParentUpload(false)}
            >
              <Icon name="close" size="text-sm" />
            </Button>
          </div>
          <ParentPhotoUpload
            gallery={gallery}
            onUploadComplete={() => {
              setShowParentUpload(false)
              // Reload photos
              if (id) {
                getPhotosForGallery(context, { gallery_id: id }).then((result) => {
                  if (result.data) {
                    setPhotos(result.data)
                  }
                })
              }
            }}
          />
        </Card>
      )}

      {/* Coach/admin upload and moderation (shown in manage mode) */}
      {isManageMode && gallery && canModerate && (
        <>
          {/* Moderation Queue */}
          {gallery.require_approval && (
            <Card className="mb-8">
              <h2 className="text-xl font-bold mb-4">Moderation Queue</h2>
              <ModerationQueue
                galleryId={gallery.id}
                onModerationComplete={() => {
                  // Reload photos
                  if (id) {
                    getPhotosForGallery(context, { gallery_id: id }).then((result) => {
                      if (result.data) {
                        setPhotos(result.data)
                      }
                    })
                  }
                }}
              />
            </Card>
          )}

          {/* Upload Photos */}
          <Card className="mb-8">
            <h2 className="text-xl font-bold mb-4">Upload Photos</h2>
            <PhotoUploader
              gallery={gallery}
              onUploadComplete={() => {
                // Reload photos
                if (id) {
                  getPhotosForGallery(context, { gallery_id: id }).then((result) => {
                    if (result.data) {
                      setPhotos(result.data)
                    }
                  })
                }
              }}
            />
          </Card>
        </>
      )}

      {photos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Icon name="photo_library" size="text-6xl" className="text-slate-300 dark:text-slate-600 mb-4 mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              No photos in this gallery yet.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 mb-32">
            {photos.map((photo, index) => {
              const isSelected = selectedPhotos.has(photo.id)
              const thumbnailUrl = getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path)
              const taggedNames = photo.tagged_athletes
                ?.map((a) => a.first_name)
                .join(' • ') || ''

              return (
                <div
                  key={photo.id}
                  className="group relative flex flex-col gap-4 cursor-pointer"
                >
                  {/* Photo Container */}
                  <div
                    className="aspect-[4/5] w-full rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50 group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500"
                    style={
                      isSelected
                        ? {
                            boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)',
                            transform: 'translateY(-4px)',
                          }
                        : {}
                    }
                    onClick={() => {
                      // Don't open tagging slideout for pending photos if user can't moderate
                      const isPending = (photo.approval_status || photo.status) === 'pending'
                      if (isPending && !canModerate) return
                      setTaggingPhoto(photo)
                      setTaggingPhotoIndex(index)
                    }}
                  >
                    <img
                      alt={photo.caption || `Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      src={thumbnailUrl}
                    />

                    {/* Checkbox Overlay - Top Right */}
                    <div
                      className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPhotos((prev) => {
                          const next = new Set(prev)
                          if (next.has(photo.id)) {
                            next.delete(photo.id)
                          } else {
                            next.add(photo.id)
                          }
                          return next
                        })
                      }}
                    >
                      {isSelected ? (
                        <div className="size-6 rounded-full bg-primary border-2 border-white flex items-center justify-center shadow-lg">
                          <span className="material-symbols-outlined text-white text-base font-bold">
                            check
                          </span>
                        </div>
                      ) : (
                        <div className="size-6 rounded-full border-2 border-white flex items-center justify-center bg-white/20 backdrop-blur-md"></div>
                      )}
                    </div>
                  </div>

                  {/* Photo Details */}
                  <div className="px-2">
                    <h4 className="text-sm font-bold text-black dark:text-white">
                      {photo.caption || `Photo ${index + 1}`}
                    </h4>
                    {taggedNames && (
                      <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                        {taggedNames}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom Action Bar - Fixed when photos are selected */}
          {selectedPhotos.size > 0 && (
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[60]">
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl px-8 py-4 rounded-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-slate-200 dark:border-slate-700 flex items-center gap-10">
                <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-700 pr-10">
                  <span className="text-black dark:text-white font-black text-sm">
                    {selectedPhotos.size} {selectedPhotos.size === 1 ? 'PHOTO' : 'PHOTOS'} SELECTED
                  </span>
                  <button
                    onClick={() => setSelectedPhotos(new Set())}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <button className="flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">ios_share</span>
                    Share
                  </button>
                  <button className="flex items-center gap-2 text-sm font-bold hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xl">favorite</span>
                    Favorite
                  </button>
                  <button className="bg-black dark:bg-primary text-white px-8 py-3 rounded-full text-sm font-black hover:bg-slate-800 dark:hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-black/10">
                    <span className="material-symbols-outlined text-xl">download</span>
                    Download Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lightbox */}
          <Lightbox
            open={lightboxIndex >= 0}
            close={() => setLightboxIndex(-1)}
            index={lightboxIndex}
            slides={photos.map((photo) => ({
              src: getGalleryPhotoUrl(photo.storage_path),
              alt: photo.caption || 'Gallery photo',
            }))}
          />
        </>
      )}

      {/* Tagging slideout */}
      {taggingPhoto && gallery && (
        <TaggingSlideout
          photo={taggingPhoto}
          gallery={gallery}
          isOpen={!!taggingPhoto}
          onClose={() => {
            setTaggingPhoto(null)
            setTaggingPhotoIndex(-1)
          }}
          onOpenLightbox={() => {
            setLightboxIndex(taggingPhotoIndex >= 0 ? taggingPhotoIndex : 0)
            setTaggingPhoto(null)
            setTaggingPhotoIndex(-1)
          }}
          onSave={async ({ advanceToNext }) => {
            // Reload photos to get updated tags
            if (id) {
              const result = await getPhotosForGallery(context, { gallery_id: id })
              if (result.data) {
                setPhotos(result.data)
                // If advancing to next, update tagging photo
                if (advanceToNext && taggingPhotoIndex >= 0) {
                  const nextIndex = taggingPhotoIndex + 1
                  if (nextIndex < result.data.length) {
                    setTaggingPhoto(result.data[nextIndex])
                    setTaggingPhotoIndex(nextIndex)
                  } else {
                    // No more photos, close slideout
                    setTaggingPhoto(null)
                    setTaggingPhotoIndex(-1)
                  }
                }
              }
            }
          }}
        />
      )}

      {/* Bulk tagging modal */}
      {bulkTaggingPhotos.length > 0 && (
        <BulkTaggingModal
          photos={bulkTaggingPhotos}
          isOpen={bulkTaggingPhotos.length > 0}
          onClose={() => {
            setBulkTaggingPhotos([])
            setSelectedPhotos(new Set())
          }}
          onComplete={() => {
            // Reload photos
            if (id) {
              getPhotosForGallery(context, { gallery_id: id }).then((result) => {
                if (result.data) {
                  setPhotos(result.data)
                }
              })
            }
          }}
        />
      )}

      {/* Gallery Edit Modal */}
      {gallery && (
        <GalleryEditModal
          open={showEditModal}
          gallery={gallery}
          photos={photos}
          onClose={() => setShowEditModal(false)}
          onSaved={(updatedGallery) => {
            setGallery(updatedGallery)
            setShowEditModal(false)
          }}
        />
      )}
    </PortalLayout>
  )
}
