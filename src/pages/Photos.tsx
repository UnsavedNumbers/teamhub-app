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
import {
  getGalleriesForUser,
  type Gallery,
  type GalleryType,
} from '../data/services/galleryService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Icon from '../components/portal/Icon'
import { getLink } from '../utils/routes'

export default function Photos() {
  const { context, isReady } = useUserContext()
  const [galleries, setGalleries] = useState<Record<GalleryType, Gallery[]>>({
    athlete: [],
    team: [],
    event: [],
    travel: [],
    org: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return

    const loadGalleries = async () => {
      setLoading(true)
      
      // Load galleries by type
      const [athleteGalleries, teamGalleries, eventGalleries, travelGalleries, orgGalleries] = await Promise.all([
        getGalleriesForUser(context, { gallery_type: 'athlete' }),
        getGalleriesForUser(context, { gallery_type: 'team' }),
        getGalleriesForUser(context, { gallery_type: 'event' }),
        getGalleriesForUser(context, { gallery_type: 'travel' }),
        getGalleriesForUser(context, { gallery_type: 'org' }),
      ])

      setGalleries({
        athlete: athleteGalleries.data || [],
        team: teamGalleries.data || [],
        event: eventGalleries.data || [],
        travel: travelGalleries.data || [],
        org: orgGalleries.data || [],
      })
      
      setLoading(false)
    }

    loadGalleries()
  }, [context, isReady])

  const renderGallerySection = (title: string, type: GalleryType, items: Gallery[]) => {
    if (items.length === 0 && !loading) return null

    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">{title}</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mt-4"></div>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <p className="text-slate-500 dark:text-slate-400">No galleries available.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((gallery) => (
              <Link
                key={gallery.id}
                to={getLink('portal.photosGallery', { id: gallery.id })}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-lg mb-4 flex items-center justify-center">
                    <Icon name="photo_library" size="text-4xl" className="text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{gallery.name}</h3>
                  {gallery.photo_count !== undefined && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {gallery.photo_count} {gallery.photo_count === 1 ? 'photo' : 'photos'}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

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

      {renderGallerySection('My Athletes', 'athlete', galleries.athlete)}
      {renderGallerySection('My Teams', 'team', galleries.team)}
      {renderGallerySection('Recent Events', 'event', galleries.event)}
      {renderGallerySection('Travel', 'travel', galleries.travel)}
      {renderGallerySection('Organization Galleries', 'org', galleries.org)}
    </PortalLayout>
  )
}
