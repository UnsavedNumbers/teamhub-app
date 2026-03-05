import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import { getCoachAssignedTryouts, getCoachTryoutDashboardStats, type Tryout } from '../../data/services/tryoutsService'
import { AdminPageHeader, Badge, Button, Card } from '../../components/admin'
import { TopLevelStats } from '../../components/common/TopLevelStats'
import '../../styles/orgAdmin.css'

type StatusFilter = 'all' | 'open' | 'closed' | 'completed'

export default function CoachTryouts() {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const [rows, setRows] = useState<Tryout[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [pendingEvaluations, setPendingEvaluations] = useState<number>(0)

  const fetchData = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    setError(null)

    const [tryoutsResponse, statsResponse] = await Promise.all([
      getCoachAssignedTryouts(context),
      getCoachTryoutDashboardStats(context),
    ])

    if (tryoutsResponse.error) {
      setError(tryoutsResponse.error.message)
      setRows([])
    } else {
      setRows(tryoutsResponse.data ?? [])
    }

    if (!statsResponse.error && statsResponse.data) {
      setPendingEvaluations(statsResponse.data.pendingEvaluations)
    }

    setLoading(false)
  }, [context, isReady])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((row) => row.status === statusFilter)
  }, [rows, statusFilter])

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('admin.tryouts.coach.title' as TranslationKey)}
        subtitle={t('admin.tryouts.coach.subtitle' as TranslationKey)}
      />

      {error && <Card className="oa-text-danger oa-mb-4">{error}</Card>}

      <TopLevelStats
        className="oa-mb-4"
        ariaLabel="Coach tryout summary metrics"
        items={[
          { id: 'assignments', label: t('admin.tryouts.coach.assignments' as TranslationKey), value: rows.length },
          { id: 'pending', label: t('admin.tryouts.coach.pendingEvaluations' as TranslationKey), value: pendingEvaluations, tone: pendingEvaluations > 0 ? 'warning' : 'default' },
        ]}
      />

      <Card className="oa-mb-4">
        <label className="oa-label">{t('admin.tryouts.coach.filterLabel' as TranslationKey)}</label>
        <select
          className="oa-input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        >
          <option value="all">{t('common.all')}</option>
          <option value="open">{t('admin.tryouts.status.open' as TranslationKey)}</option>
          <option value="closed">{t('admin.tryouts.status.closed' as TranslationKey)}</option>
          <option value="completed">{t('admin.tryouts.status.completed' as TranslationKey)}</option>
        </select>
      </Card>

      <Card>
        {loading ? (
          <div className="oa-skeleton" style={{ height: '180px' }} />
        ) : filteredRows.length === 0 ? (
          <p className="oa-body-m oa-text-muted">{t('admin.tryouts.coach.empty' as TranslationKey)}</p>
        ) : (
          <div className="oa-flex oa-flex-col oa-gap-3">
            {filteredRows.map((tryout) => (
              <div
                key={tryout.id}
                className="oa-card oa-flex oa-items-center oa-justify-between oa-gap-3"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/tryouts/${tryout.id}/evaluation`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') navigate(`/admin/tryouts/${tryout.id}/evaluation`)
                }}
              >
                <div>
                  <p className="oa-body-m" style={{ fontWeight: 700 }}>{tryout.title}</p>
                  <p className="oa-body-s oa-text-muted">
                    {tryout.tryout_date ?? t('common.tbd')} | {tryout.location ?? t('common.unknown')}
                  </p>
                </div>
                <div className="oa-flex oa-items-center oa-gap-2">
                  <Badge variant={tryout.status === 'open' ? 'success' : 'neutral'}>{t(`admin.tryouts.status.${tryout.status}` as TranslationKey)}</Badge>
                  <Button variant="ghost" size="compact" onClick={() => navigate(`/admin/tryouts/${tryout.id}/evaluation`)}>
                    {t('admin.tryouts.coach.evaluate' as TranslationKey)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
