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
import { AdminPageHeader, Card, Button } from '../../components/platformAdmin'
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
      <AdminPageHeader
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

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Season Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Term</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seasons.map((season) => (
                    <tr key={season.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{season.name}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500">—</td>
                      <td className="py-4 px-6 text-sm text-slate-500">{season.start_date ? new Date(season.start_date).toLocaleDateString() : '—'}</td>
                      <td className="py-4 px-6 text-sm text-slate-500">{season.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            season.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {season.is_active ? 'Active' : 'Upcoming'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link to={`/admin/organization/structure/forms?edit=season&id=${season.id}`} className="invisible group-hover:visible focus:visible">
                          <button className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                            Edit
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
