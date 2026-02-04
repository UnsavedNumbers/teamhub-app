/**
 * Gallery View Page
 * 
 * Displays a single gallery with photos using react-photo-album and yet-another-react-lightbox.
 * Supports both masonry (feed) and grid layouts.
 */

import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import PhotoAlbum from 'react-photo-album'
import 'react-photo-album/styles.css'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { useUserContext } from '../hooks/useUserContext'
import {
  getGalleryById,
  getPhotosForGallery,
  getGalleryPhotoUrl,
  checkCanModerateGallery,
  checkCanUploadToGallery,
  type Gallery,
  type GalleryPhoto,
} from '../data/services/galleryService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Icon from '../components/portal/Icon'
import Button from '../components/portal/Button'
import { PhotoUploader } from '../components/gallery/PhotoUploader'
import { ParentPhotoUpload } from '../components/gallery/ParentPhotoUpload'
import { ModerationQueue } from '../components/gallery/ModerationQueue'
import { AthleteTaggingSlideout } from '../components/gallery/AthleteTaggingSlideout'
import { BulkTaggingModal } from '../components/gallery/BulkTaggingModal'
import { getLink } from '../utils/routes'
import { useI18n } from '../i18n/useI18n'
import type { Photo } from 'react-photo-album'

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
  const [layout, setLayout] = useState<'masonry' | 'rows'>('masonry')
  const [canModerate, setCanModerate] = useState(false)
  const [canUpload, setCanUpload] = useState(false)
  const [showParentUpload, setShowParentUpload] = useState(false)
  const [taggingPhoto, setTaggingPhoto] = useState<GalleryPhoto | null>(null)
  const [bulkTaggingPhotos, setBulkTaggingPhotos] = useState<GalleryPhoto[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [filterAthleteId, setFilterAthleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!isReady || !id) return

    const loadGallery = async () => {
      setLoading(true)
      setError(null)

      const [galleryResult, photosResult] = await Promise.all([
        getGalleryById(context, id),
        getPhotosForGallery(context, {
          gallery_id: id,
          athlete_id: filterAthleteId || undefined,
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
  }, [context, isReady, id, filterAthleteId])

  const albumPhotos: Photo[] = useMemo(
    () =>
      photos.map((photo, index) => {
        const photoUrl = getGalleryPhotoUrl(photo.storage_path)
        return {
          src: photoUrl,
          width: 800,
          height: 600,
          key: photo.id,
          alt: `Photo ${index + 1}`,
        } as Photo
      }),
    [photos]
  )

  const handlePhotoClick = ({ index }: { index: number }) => {
    if (isManageMode && canModerate) {
      const photo = photos[index]
      setTaggingPhoto(photo)
    } else {
      setLightboxIndex(index)
    }
  }

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <PageTitle>{gallery.name}</PageTitle>
          <div className="flex items-center gap-3">
            {gallery.require_approval && (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                {t('photos.galleryView.moderationRequired')}
              </span>
            )}
            {!isManageMode && canModerate && (
              <Link to={getLink('portal.photosGalleryManage', { id: gallery.id })}>
                <Button variant="secondary">
                  <Icon name="edit" size="text-sm" className="mr-2" />
                  {t('photos.galleryView.manage')}
                </Button>
              </Link>
            )}
            {!isManageMode && gallery.allow_contributions && canUpload && (
              <Button
                variant="primary"
                onClick={() => setShowParentUpload(!showParentUpload)}
              >
                <Icon name="add" size="text-sm" className="mr-2" />
                {t('photos.galleryView.addYourPhotos')}
              </Button>
            )}
            {isManageMode && (
              <Link to={getLink('portal.photosGallery', { id: gallery.id })}>
                <Button variant="secondary">
                  <Icon name="arrow_back" size="text-sm" className="mr-2" />
                  {t('photos.galleryView.backToGallery')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

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
          {/* Filters and layout toggle */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
            {/* Athlete filter chips */}
            {photos.some((p) => p.tagged_athletes && p.tagged_athletes.length > 0) && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterAthleteId(null)}
                  className={`px-3 py-1 text-sm rounded ${
                    !filterAthleteId
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  All Athletes
                </button>
                {Array.from(
                  new Set(
                    photos.flatMap((p) => p.tagged_athletes || []).map((a) => a.id)
                  )
                )
                  .slice(0, 5)
                  .map((athleteId) => {
                    const athlete = photos
                      .flatMap((p) => p.tagged_athletes || [])
                      .find((a) => a.id === athleteId)
                    if (!athlete) return null
                    return (
                      <button
                        key={athleteId}
                        onClick={() => setFilterAthleteId(athleteId)}
                        className={`px-3 py-1 text-sm rounded ${
                          filterAthleteId === athleteId
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {athlete.first_name} {athlete.last_name}
                      </button>
                    )
                  })}
              </div>
            )}

            {/* Layout toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setLayout('masonry')}
                className={`px-3 py-1 text-sm rounded ${
                  layout === 'masonry'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Masonry
              </button>
              <button
                onClick={() => setLayout('rows')}
                className={`px-3 py-1 text-sm rounded ${
                  layout === 'rows'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Grid
              </button>
            </div>
          </div>

          {/* Selection mode controls */}
          {isManageMode && canModerate && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                {selectedPhotos.size > 0 ? (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const selected = photos.filter((p) => selectedPhotos.has(p.id))
                        setBulkTaggingPhotos(selected)
                      }}
                    >
                      <Icon name="label" size="text-sm" className="mr-2" />
                      Tag {selectedPhotos.size} Photo{selectedPhotos.size !== 1 ? 's' : ''}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedPhotos(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      // Enable selection mode
                    }}
                  >
                    <Icon name="select_all" size="text-sm" className="mr-2" />
                    Select Photos
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Photo grid: masonry (feed) or rows (grid) with layout-specific props */}
          {layout === 'masonry' ? (
            <PhotoAlbum
              photos={albumPhotos}
              layout="masonry"
              columns={1}
              onClick={handlePhotoClick}
              spacing={8}
              padding={0}
            />
          ) : (
            <PhotoAlbum
              photos={albumPhotos}
              layout="rows"
              targetRowHeight={(containerWidth) => (containerWidth >= 1200 ? 320 : containerWidth >= 600 ? 280 : containerWidth >= 300 ? 240 : 200)}
              rowConstraints={{ maxPhotos: 2, minPhotos: 1 }}
              onClick={handlePhotoClick}
              spacing={8}
              padding={0}
            />
          )}

          {/* Lightbox */}
          <Lightbox
            open={lightboxIndex >= 0}
            close={() => setLightboxIndex(-1)}
            index={lightboxIndex}
            slides={photos.map((photo) => ({
              src: getGalleryPhotoUrl(photo.storage_path),
              alt: `Gallery photo`,
            }))}
          />
        </>
      )}

      {/* Tagging slideout */}
      {taggingPhoto && (
        <AthleteTaggingSlideout
          photo={taggingPhoto}
          isOpen={!!taggingPhoto}
          onClose={() => setTaggingPhoto(null)}
          onSave={() => {
            // Reload photos to get updated tags
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
    </PortalLayout>
  )
}
