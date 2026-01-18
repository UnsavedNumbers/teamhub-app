/**
 * Seasons Management
 *
 * Table view for organization-wide time periods.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSeasons } from '../../data/services/seasonsService'
import type { Season } from '../../data/types/organization'
import { PageHeader, Card, Button } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'

export default function SeasonsManagement() {
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getSeasons(context)
        setSeasons(result.data as Season[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load seasons')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const statusBadgeStyle = (status: string) => {
    const styles = {
      upcoming: { background: 'var(--pa-n300)', color: 'var(--pa-n700)' },
      active: { background: 'var(--pa-success-bg)', color: 'var(--pa-success)' },
      locked: { background: 'var(--pa-warning-bg)', color: 'var(--pa-warning)' },
      archived: { background: 'var(--pa-n200)', color: 'var(--pa-n600)' },
    }
    return styles[status as keyof typeof styles] || styles.upcoming
  }

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <PageHeader
        title="Seasons"
        subtitle="Manage organization-wide time periods"
        breadcrumbs={[
          { label: 'Organizations', path: '/admin/organization/structure' },
          { label: 'Seasons' },
        ]}
      />

      {error && (
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{error}</div>
        </Card>
      )}

      {seasons.length === 0 ? (
        <Card>
          <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>
              calendar_month
            </span>
            <h3 className="pa-h3">No seasons yet</h3>
            <p className="pa-body-m pa-text-muted pa-mb-4">Create your first season to start organizing teams and events.</p>
            <Link to="/admin/organization/structure/forms?type=season">
              <Button>Add Season</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="pa-flex pa-justify-end pa-mb-4">
            <Link to="/admin/organization/structure/forms?type=season">
              <Button>Add Season</Button>
            </Link>
          </div>

          <Card noPadding>
            <table className="pa-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="pa-p-4">Season Name</th>
                  <th className="pa-p-4">Term</th>
                  <th className="pa-p-4">Start Date</th>
                  <th className="pa-p-4">End Date</th>
                  <th className="pa-p-4">Status</th>
                  <th className="pa-p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((season) => (
                  <tr key={season.id} style={{ borderTop: '1px solid var(--pa-n200)' }}>
                    <td className="pa-p-4 pa-font-medium">{season.name}</td>
                    <td className="pa-p-4 pa-text-muted">—</td>
                    <td className="pa-p-4 pa-text-muted">{season.start_date ? new Date(season.start_date).toLocaleDateString() : '—'}</td>
                    <td className="pa-p-4 pa-text-muted">{season.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}</td>
                    <td className="pa-p-4">
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          ...statusBadgeStyle(season.is_active ? 'active' : 'upcoming'),
                        }}
                      >
                        {season.is_active ? 'Active' : 'Upcoming'}
                      </span>
                    </td>
                    <td className="pa-p-4">
                      <Link to={`/admin/organization/structure/forms?edit=season&id=${season.id}`}>
                        <Button variant="secondary">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
