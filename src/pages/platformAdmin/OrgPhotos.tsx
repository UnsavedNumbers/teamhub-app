/**
 * Platform Admin – Organization Galleries
 *
 * View and manage photo galleries for a specific organization in context.
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getGalleriesForUser } from '../../data/services/galleryService'
import type { Gallery } from '../../data/services/galleryService'

export default function OrgPhotos() {
  const { id: orgId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) {
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      const platformContext: UserContext = {
        userId: '',
        email: null,
        orgId: orgId ?? '',
        roles: [],
        isPlatformAdmin: true,
      }
      const { data, error } = await getGalleriesForUser(
        platformContext,
        { org_id: orgId }
      )
      if (error) {
        console.error('Error loading org galleries:', error)
      } else {
        setGalleries(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [orgId])

  return (
    <div className="pa-root">
      <div className="pa-container">
        <div style={{ marginBottom: 'var(--pa-space-6)' }}>
          <button
            className="pa-btn pa-btn--ghost"
            onClick={() => navigate(`/platform-admin/organizations/${orgId}`)}
            style={{ padding: '8px', marginBottom: 'var(--pa-space-2)' }}
            type="button"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to organization
          </button>
          <h1 className="pa-h1">Photos</h1>
          <p className="pa-body-m" style={{ color: 'var(--pa-n500)', marginTop: 'var(--pa-space-2)' }}>
            Galleries for this organization. Manage in org admin context for full editing.
          </p>
        </div>
        {loading ? (
          <div className="pa-skeleton" style={{ height: '200px' }} />
        ) : galleries.length === 0 ? (
          <div className="pa-card" style={{ padding: 'var(--pa-space-8)', textAlign: 'center' }}>
            <p className="pa-body-m" style={{ color: 'var(--pa-n500)' }}>
              No galleries yet for this organization.
            </p>
          </div>
        ) : (
          <div className="pa-card">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>Gallery</th>
                  <th>Type</th>
                  <th>Photos</th>
                </tr>
              </thead>
              <tbody>
                {galleries.map((g) => (
                  <tr key={g.id}>
                    <td>{g.name ?? g.id}</td>
                    <td>{g.gallery_type ?? '—'}</td>
                    <td>{g.photo_count ?? 0}</td>
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
