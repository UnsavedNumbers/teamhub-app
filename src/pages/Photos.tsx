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

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useI18n } from '../i18n/useI18n'
import { usePhotoFilters } from '../hooks/usePhotoFilters'
import {
  getGalleriesForUser,
  type Gallery,
  type GalleryType,
} from '../data/services/galleryService'
import { getGuardianAthletes } from '../data/services/guardianService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Icon from '../components/portal/Icon'
import EmptyState from '../components/portal/EmptyState'
import { PhotoFilterBar } from '../components/gallery/PhotoFilterBar'
import { getLink } from '../utils/routes'
import type { Athlete } from '../types/family'

import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'

export default function Photos() {
  useDebugLifecycle('Photos')
  
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
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const { filters, setFilters, clearFilters } = usePhotoFilters({
    viewKey: 'portalPhotos',
    defaultSort: 'recent',
    allowedSorts: ['recent', 'oldest', 'az'],
    persistDensity: false,
    defaultHideEmpty: true,
  })

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
    // Use stable deps so the effect doesn't re-run every render (context is often a new object reference)
  }, [isReady, context.userId, context.orgId])

  const sortOptions = useMemo(
    () => [
      { value: 'recent', label: t('common.mostRecent') },
      { value: 'oldest', label: t('photos.filters.oldest') },
      { value: 'az', label: t('photos.filters.az') },
    ],
    [t]
  )

  const filteredGalleries = useMemo(() => {
    const applyFilters = (items: Gallery[]) => {
      let result = items
      
      // Filter empty galleries if hideEmpty is true
      if (filters.hideEmpty) {
        result = result.filter((gallery) => (gallery.photo_count || 0) > 0)
      }
      
      if (filters.q) {
        const term = filters.q.toLowerCase()
        result = result.filter((gallery) => {
          const nameMatch = gallery.name.toLowerCase().includes(term)
          const descMatch = gallery.description?.toLowerCase().includes(term) || false
          const entityMatch = gallery.entity_name?.toLowerCase().includes(term) || false
          return nameMatch || descMatch || entityMatch
        })
      }

      if (filters.sort === 'az') {
        result = [...result].sort((a, b) => a.name.localeCompare(b.name))
      } else if (filters.sort === 'oldest') {
        result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      } else {
        result = [...result].sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime(),
        )
      }
      return result
    }

    return {
      athlete: applyFilters(galleries.athlete),
      team: applyFilters(galleries.team),
      event: applyFilters(galleries.event),
      travel: applyFilters(galleries.travel),
      program: applyFilters(galleries.program),
      season: applyFilters(galleries.season),
      org: applyFilters(galleries.org),
    }
  }, [galleries, filters.q, filters.sort, filters.hideEmpty])

  const hasFilteredResults = useMemo(
    () => Object.values(filteredGalleries).some((items) => items.length > 0),
    [filteredGalleries],
  )

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  const renderGallerySection = (title: string, items: Gallery[], sectionKey: string) => {
    const isCollapsed = collapsedSections[sectionKey]
    const isEmpty = items.length === 0 && !loading
    
    // If hideEmpty is true and section is empty, don't render it
    if (isEmpty && filters.hideEmpty) return null
    
    // If hideEmpty is false but section is empty, still show it (but it will show empty state)
    if (isEmpty && !filters.hideEmpty && !loading) {
      return (
        <div className="mb-12">
          <button
            onClick={() => toggleSection(sectionKey)}
            className="flex items-center gap-2 w-full text-left mb-4"
          >
            <Icon 
              name={isCollapsed ? "chevron_right" : "expand_more"} 
              className="text-gray-500 transition-transform"
            />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          </button>
          {!isCollapsed && (
            <EmptyState
              icon="photo_camera"
              title={t('photos.landing.noGalleries')}
              className="py-8"
            />
          )}
        </div>
      )
    }

    return (
      <div className="mb-12">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center gap-2 w-full text-left mb-4"
        >
          <Icon 
            name={isCollapsed ? "chevron_right" : "expand_more"} 
            className="text-gray-500 transition-transform"
          />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        </button>
        {!isCollapsed && (
          <>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-700 animate-pulse" style={{ borderRadius: '2px' }}>
                    <div className="h-40 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="p-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon="photo_camera"
                title={t('photos.landing.noGalleries')}
                className="py-8"
              />
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
                  className="block border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
                  style={{ borderRadius: '2px' }}
                >
                  <div className="relative h-40 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {hasCover && mainSrc ? (
                      <picture className="w-full h-full block">
                        {gallery.cover_thumbnails?.thumb_medium?.webp && (
                          <source srcSet={gallery.cover_thumbnails.thumb_medium.webp} type="image/webp" />
                        )}
                        <img 
                          src={mainSrc} 
                          alt={t('photos.landing.coverAlt', { name: gallery.name })}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </picture>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="cloud_upload" size="text-5xl" className="text-gray-300 dark:text-gray-600" />
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
                    <h3 className="font-medium text-base text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">{gallery.name}</h3>
                  </div>
                </Link>
              );
            })}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // Loading state
  if (!isReady || loading || isLoadingAthletes) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: t('common.home'), path: getLink('portal.dashboard') },
          { label: t('nav.photos') },
        ]}
      >
        <div className="mb-8">
          <PageTitle>{t('photos.title')}</PageTitle>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-light tracking-wide">
            {t('photos.landing.subtitle')}
          </p>
        </div>

        <div className="mb-6">
          <PhotoFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            onClear={clearFilters}
            searchPlaceholder={t('photos.search.searchPlaceholder')}
            showDateRange={false}
            sortOptions={sortOptions}
          />
        </div>

        {/* Loading Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 animate-pulse" style={{ borderRadius: '2px' }}>
              <div className="h-40 bg-gray-200 dark:bg-gray-700"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
        { label: t('common.home'), path: getLink('portal.dashboard') },
        { label: t('nav.photos') },
      ]}
    >
      <div className="mb-8">
        <PageTitle>{t('photos.title')}</PageTitle>
        <p className="text-gray-500 dark:text-gray-400 text-lg font-light tracking-wide">
          {t('photos.landing.subtitle')}
        </p>
      </div>

      <div className="mb-6">
        <PhotoFilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onClear={clearFilters}
          searchPlaceholder={t('photos.search.searchPlaceholder')}
          showDateRange={false}
          sortOptions={sortOptions}
        />
      </div>

      {!loading && !hasFilteredResults ? (
        <EmptyState
          icon="photo_camera"
          title={t('photos.filters.noResults')}
          description={t('emptyStates.tryAdjusting')}
        />
      ) : (
        <>
          {renderGallerySection(t('photos.landing.sections.athletes'), filteredGalleries.athlete, 'athletes')}
          {renderGallerySection(t('photos.landing.sections.teams'), filteredGalleries.team, 'teams')}
          {renderGallerySection(t('photos.landing.sections.events'), filteredGalleries.event, 'events')}
          {renderGallerySection(t('photos.landing.sections.travel'), filteredGalleries.travel, 'travel')}
          {renderGallerySection(t('photos.landing.sections.org'), filteredGalleries.org, 'org')}
        </>
      )}
    </PortalLayout>
  )
}


