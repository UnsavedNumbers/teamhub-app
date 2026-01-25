/**
 * Season Detail
 *
 * Detail view for a specific season.
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSeason } from '../../data/services/seasonsService'
import type { Season } from '../../data/types/organization'
import { AdminPageHeader, Card, Button } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function SeasonDetail() {
  const { id } = useParams<{ id: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season, setSeason] = useState<Season | null>(null)

  useEffect(() => {
    if (!isReady || !id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getSeason(context, id)
        if (result.error) {
          setError(result.error.message)
        } else if (result.data) {
          setSeason(result.data)
        } else {
          setError('Season not found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load season')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, id])

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  if (error || !season) {
    return (
      <div className="pa-root">
        <OfflineBanner />
        <AdminPageHeader
          title="Season Not Found"
          subtitle={error || 'The season you are looking for does not exist'}
          breadcrumbs={[
            { label: 'Organizations', path: getLink('admin.organization.structure') },
            { label: 'Seasons', path: getLink('admin.seasons.list') },
            { label: 'Details' },
          ]}
        />
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{error || 'Season not found'}</div>
        </Card>
        <Button onClick={() => navigate(getLink('admin.seasons.list'))}>
          Back to Seasons
        </Button>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <AdminPageHeader
        title={season.name}
        subtitle="Season Details"
        breadcrumbs={[
          { label: 'Organizations', path: getLink('admin.organization.structure') },
          { label: 'Seasons', path: getLink('admin.organization.seasons') },
          { label: season.name },
        ]}
        actions={
          <Button
            variant="secondary"
            onClick={() => navigate(`${getLink('admin.organization.forms')}?edit=season&id=${season.id}&returnUrl=${encodeURIComponent(window.location.pathname)}`)}
          >
            Edit Season
          </Button>
        }
      />

      <div className="pa-grid pa-grid-2">
        <Card>
          <h3 className="pa-h3 pa-mb-4">Season Information</h3>
          <div className="pa-space-y-3">
            <div>
              <div className="pa-body-s pa-text-muted pa-mb-1">Name</div>
              <div className="pa-body-m">{season.name}</div>
            </div>
            <div>
              <div className="pa-body-s pa-text-muted pa-mb-1">Start Date</div>
              <div className="pa-body-m">
                {season.start_date ? new Date(season.start_date).toLocaleDateString() : '—'}
              </div>
            </div>
            <div>
              <div className="pa-body-s pa-text-muted pa-mb-1">End Date</div>
              <div className="pa-body-m">
                {season.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}
              </div>
            </div>
            <div>
              <div className="pa-body-s pa-text-muted pa-mb-1">Status</div>
              <div className="pa-body-m">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    season.is_active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {season.is_active ? 'Active' : 'Upcoming'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="pa-h3 pa-mb-4">Metadata</h3>
          <div className="pa-space-y-3">
            <div>
              <div className="pa-body-s pa-text-muted pa-mb-1">Created</div>
              <div className="pa-body-m">
                {season.created_at ? new Date(season.created_at).toLocaleString() : '—'}
              </div>
            </div>
            <div>
              <div className="pa-body-s pa-text-muted pa-mb-1">Last Updated</div>
              <div className="pa-body-m">
                {season.updated_at ? new Date(season.updated_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
