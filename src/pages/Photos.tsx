/**
 * Photos Landing Page
 * 
 * Entry point for photo galleries. Shows galleries organized by:
 * - My Athletes (athlete galleries)
 * - My Teams (team galleries)
 * - Recent Events (event galleries)
 * - Travel (travel galleries)
 * - Organization Galleries (org galleries)
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useI18n } from '../i18n/useI18n'
import {
  getGalleriesForUser,
  type Gallery,
  type GalleryType,
} from '../data/services/galleryService'
import { getGuardianAthletes } from '../data/services/guardianService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Icon from '../components/portal/Icon'
import { getLink } from '../utils/routes'
import type { Athlete } from '../types/family'

export default function Photos() {
  const { context, isReady } = useUserContext()
  const { t } = useI18n()
  const [galleries, setGalleries] = useState<Record<GalleryType, Gallery[]>>({
    athlete: [],
    team: [],
    event: [],
    travel: [],
    program: [],
    season: [],
    org: [],
  })
  const [_athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingAthletes, setIsLoadingAthletes] = useState(true)

  // Load guardian's linked athletes using the same method as /portal/athletes
  useEffect(() => {
    if (!isReady || !context.userId || !context.orgId) return
    
    const loadAthletes = async () => {
      setIsLoadingAthletes(true)
      const { data, error } = await getGuardianAthletes(context.userId, context.orgId)
      
      if (!error && data) {
        setAthletes(data)
      }
      setIsLoadingAthletes(false)
    }
    
    loadAthletes()
  }, [context.userId, context.orgId, isReady])

  useEffect(() => {
    if (!isReady) return

    const loadGalleries = async () => {
      setLoading(true)
      
      // Load galleries by type
      const [athleteGalleries, teamGalleries, eventGalleries, travelGalleries, programGalleries, seasonGalleries, orgGalleries] = await Promise.all([
        getGalleriesForUser(context, { gallery_type: 'athlete' }),
        getGalleriesForUser(context, { gallery_type: 'team' }),
        getGalleriesForUser(context, { gallery_type: 'event' }),
        getGalleriesForUser(context, { gallery_type: 'travel' }),
        getGalleriesForUser(context, { gallery_type: 'program' }),
        getGalleriesForUser(context, { gallery_type: 'season' }),
        getGalleriesForUser(context, { gallery_type: 'org' }),
      ])

      setGalleries({
        athlete: athleteGalleries.data || [],
        team: teamGalleries.data || [],
        event: eventGalleries.data || [],
        travel: travelGalleries.data || [],
        program: programGalleries.data || [],
        season: seasonGalleries.data || [],
        org: orgGalleries.data || [],
      })
      
      setLoading(false)
    }

    loadGalleries()
  }, [context, isReady])

  const renderGallerySection = (title: string, items: Gallery[]) => {
    if (items.length === 0 && !loading) return null

    return (
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">{title}</h2>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-slate-200 dark:border-slate-700 animate-pulse" style={{ borderRadius: '2px' }}>
                <div className="h-40 bg-slate-200 dark:bg-slate-700"></div>
                <div className="p-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="border border-slate-200 dark:border-slate-700 p-4" style={{ borderRadius: '2px' }}>
            <p className="text-slate-500 dark:text-slate-400">No galleries available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {items.map((gallery) => {
              const hasCoverThumbnails = !!gallery.cover_thumbnails;
              const legacyCoverUrl = gallery.cover_url;
              const hasCover = hasCoverThumbnails || !!legacyCoverUrl;
              const mainSrc = gallery.cover_thumbnails?.thumb_medium?.jpg || legacyCoverUrl;
              const photoCount = gallery.photo_count || 0;
              
              return (
                <Link
                  key={gallery.id}
                  to={getLink('portal.photosGallery', { id: gallery.id })}
                  className="block border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group"
                  style={{ borderRadius: '2px' }}
                >
                  <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {hasCover && mainSrc ? (
                      <picture className="w-full h-full block">
                        {gallery.cover_thumbnails?.thumb_medium?.webp && (
                          <source srcSet={gallery.cover_thumbnails.thumb_medium.webp} type="image/webp" />
                        )}
                        <img 
                          src={mainSrc} 
                          alt={`Cover photo for ${gallery.name}`}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </picture>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="cloud_upload" size="text-5xl" className="text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 px-2 py-1 flex items-center gap-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: '2px' }}>
                      <Icon name={photoCount === 0 ? 'upload' : 'photo_camera'} size="text-sm" className="text-white" />
                      <span className="text-white text-sm font-normal">
                        {photoCount === 0 ? t('photos.addFirstPhoto') : `${photoCount} ${photoCount === 1 ? t('photos.photo') : t('photos.photos')}`}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-base text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">{gallery.name}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    )
  }

  // Loading state
  if (!isReady || loading || isLoadingAthletes) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Photos' },
        ]}
      >
        <div className="mb-8">
          <PageTitle>Photos</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            View and share team and athlete photos.
          </p>
        </div>

        {/* Loading Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 dark:border-slate-700 animate-pulse" style={{ borderRadius: '2px' }}>
              <div className="h-40 bg-slate-200 dark:bg-slate-700"></div>
              <div className="p-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </PortalLayout>
    )
  }

  // Even if no athletes linked, org members can still view event/org galleries
  // So we don't block access to the photos page

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Photos' },
      ]}
    >
      <div className="mb-8">
        <PageTitle>Photos</PageTitle>
        <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
          View and share team and athlete photos.
        </p>
      </div>

      {renderGallerySection('My Athletes', galleries.athlete)}
      {renderGallerySection('My Teams', galleries.team)}
      {renderGallerySection('Recent Events', galleries.event)}
      {renderGallerySection('Travel', galleries.travel)}
      {renderGallerySection('Organization Galleries', galleries.org)}
    </PortalLayout>
  )
}

