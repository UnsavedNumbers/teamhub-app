/**
 * Admin Photos Page
 * 
 * Lists all galleries for the organization with photo counts and pending counts.
 * Links to gallery manage pages.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import {
  getGalleriesForUser,
  type Gallery,
} from '../../data/services/galleryService'
import { Button } from '../../components/platformAdmin'
import { getLink } from '../../utils/routes'

export default function AdminPhotos() {
  const { context, isReady } = useUserContext()
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return

    const loadGalleries = async () => {
      setLoading(true)
      const { data, error } = await getGalleriesForUser(context, {
        org_id: context.orgId,
      })

      if (error) {
        console.error('Error loading galleries:', error)
        setLoading(false)
        return
      }

      setGalleries(data || [])
      setLoading(false)
    }

    loadGalleries()
  }, [context, isReady])

  if (loading) {
    return (
      <div className="pa-skeleton" style={{ height: '400px' }} />
    )
  }

  return (
    <div className="pa-root">
      <div className="pa-container">
        <div style={{ marginBottom: 'var(--pa-space-6)' }}>
          <h1 className="pa-h1">Photo Galleries</h1>
          <p className="pa-body-m" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-2)' }}>
            Manage photo galleries for your organization
          </p>
        </div>

        {galleries.length === 0 ? (
          <div className="pa-card" style={{ padding: 'var(--pa-space-8)', textAlign: 'center' }}>
            <p className="pa-body-m" style={{ color: 'var(--pa-n500)' }}>
              No galleries yet. Galleries are created automatically when photos are uploaded.
            </p>
          </div>
        ) : (
          <div className="pa-card">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>Gallery Name</th>
                  <th>Type</th>
                  <th>Photos</th>
                  <th>Pending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {galleries.map((gallery) => (
                  <tr key={gallery.id}>
                    <td>
                      <span className="pa-body-m font-semibold">{gallery.name}</span>
                    </td>
                    <td>
                      <span className="pa-body-s" style={{ textTransform: 'capitalize' }}>
                        {gallery.gallery_type}
                      </span>
                    </td>
                    <td>
                      <span className="pa-body-s">{gallery.photo_count || 0}</span>
                    </td>
                    <td>
                      {gallery.pending_count && gallery.pending_count > 0 ? (
                        <span className="pa-body-s" style={{ color: 'var(--pa-warning)' }}>
                          {gallery.pending_count}
                        </span>
                      ) : (
                        <span className="pa-body-s" style={{ color: 'var(--pa-n400)' }}>
                          0
                        </span>
                      )}
                    </td>
                    <td>
                      <Link to={getLink('portal.photosGalleryManage', { id: gallery.id })}>
                        <Button variant="ghost" size="dense">
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
