import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import {
  getAdminTryoutRegistrations,
  getTryoutById,
  getTryoutEvaluations,
  getTryoutEvaluators,
  type Tryout,
  type TryoutEvaluation,
  type TryoutEvaluator,
  type TryoutRegistration,
} from '../../data/services/tryoutsService'
import { AdminPageHeader, Badge, Button, Card } from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import { TopLevelStats } from '../../components/common/TopLevelStats'
import '../../styles/orgAdmin.css'

type DetailTab = 'overview' | 'registrations' | 'evaluators' | 'evaluations' | 'results'
interface TryoutResultRow {
  id: string
  athleteName: string
  status: TryoutRegistration['status']
  averageScore: number | null
  evaluationCount: number
  notes: string | null
}

const DETAIL_TABS: DetailTab[] = ['overview', 'registrations', 'evaluators', 'evaluations', 'results']

function formatTryoutDateValue(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return fallback
  return `${month}-${day}-${year}`
}

export default function AdminTryoutDetail() {
  const { tryoutId } = useParams<{ tryoutId: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tryout, setTryout] = useState<Tryout | null>(null)
  const [registrations, setRegistrations] = useState<TryoutRegistration[]>([])
  const [evaluators, setEvaluators] = useState<TryoutEvaluator[]>([])
  const [evaluations, setEvaluations] = useState<TryoutEvaluation[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const activeTab = (searchParams.get('tab') as DetailTab | null) ?? 'overview'

  const fetchData = useCallback(async () => {
    if (!isReady || !tryoutId) return
    setLoading(true)
    setError(null)

    const [tryoutResponse, registrationsResponse, evaluatorsResponse, evaluationsResponse] = await Promise.all([
      getTryoutById(context, tryoutId),
      getAdminTryoutRegistrations(context, tryoutId),
      getTryoutEvaluators(context, tryoutId),
      getTryoutEvaluations(context, tryoutId),
    ])

    if (tryoutResponse.error || !tryoutResponse.data) {
      setError(tryoutResponse.error?.message ?? t('common.error.notFound'))
      setLoading(false)
      return
    }

    setTryout(tryoutResponse.data)
    setRegistrations(registrationsResponse.data ?? [])
    setEvaluators(evaluatorsResponse.data ?? [])
    setEvaluations(evaluationsResponse.data ?? [])

    const firstError = registrationsResponse.error ?? evaluatorsResponse.error ?? evaluationsResponse.error
    if (firstError) setError(firstError.message)

    setLoading(false)
  }, [context, isReady, t, tryoutId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const columns: ColumnConfig<TryoutRegistration>[] = [
    {
      id: 'child',
      label: t('admin.tryouts.registrations.columns.athlete' as TranslationKey),
      render: (row: TryoutRegistration) => row.child ? `${row.child.first_name} ${row.child.last_name}` : t('common.unknown'),
    },
    {
      id: 'status',
      label: t('admin.tryouts.registrations.columns.status' as TranslationKey),
      render: (row: TryoutRegistration) => <Badge variant="neutral">{t(`admin.tryouts.registrations.statuses.${row.status}` as TranslationKey)}</Badge>,
    },
    {
      id: 'notes',
      label: t('admin.tryouts.registrations.columns.notes' as TranslationKey),
      render: (row: TryoutRegistration) => row.notes || t('common.table.emptyValue'),
    },
  ]

  const completionRate = useMemo(() => {
    if (registrations.length === 0) return 0
    const evaluatedRegistrationIds = new Set(evaluations.map((item) => item.registration_id))
    const completed = registrations.filter((registration) => evaluatedRegistrationIds.has(registration.id)).length
    return Math.round((completed / registrations.length) * 100)
  }, [evaluations, registrations])

  const resultRows = useMemo<TryoutResultRow[]>(() => {
    const evaluationsByRegistration = new Map<string, TryoutEvaluation[]>()
    for (const evaluation of evaluations) {
      const current = evaluationsByRegistration.get(evaluation.registration_id) ?? []
      current.push(evaluation)
      evaluationsByRegistration.set(evaluation.registration_id, current)
    }

    return registrations
      .map((registration) => {
        const registrationEvaluations = evaluationsByRegistration.get(registration.id) ?? []
        const averageScore = registrationEvaluations.length > 0
          ? Number((registrationEvaluations.reduce((sum, item) => sum + item.score, 0) / registrationEvaluations.length).toFixed(1))
          : null

        return {
          id: registration.id,
          athleteName: registration.child
            ? `${registration.child.first_name} ${registration.child.last_name}`
            : t('common.unknown'),
          status: registration.status,
          averageScore,
          evaluationCount: registrationEvaluations.length,
          notes: registrationEvaluations.map((item) => item.notes).find((value) => Boolean(value)) ?? registration.notes ?? null,
        }
      })
      .sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1))
  }, [evaluations, registrations, t])

  const resultsColumns: ColumnConfig<TryoutResultRow>[] = [
    {
      id: 'athlete',
      label: t('admin.tryouts.registrations.columns.athlete' as TranslationKey),
      render: (row) => row.athleteName,
    },
    {
      id: 'decision',
      label: 'Decision',
      render: (row) => (
        <Badge
          variant={
            row.status === 'accepted' || row.status === 'offered'
              ? 'success'
              : row.status === 'waitlisted'
                ? 'warning'
                : row.status === 'declined' || row.status === 'rejected' || row.status === 'not_selected'
                  ? 'danger'
                  : 'neutral'
          }
        >
          {t(`admin.tryouts.registrations.statuses.${row.status}` as TranslationKey)}
        </Badge>
      ),
    },
    {
      id: 'score',
      label: 'Avg Score',
      render: (row) => (row.averageScore != null ? row.averageScore.toFixed(1) : t('common.table.emptyValue')),
    },
    {
      id: 'evaluations',
      label: 'Evaluations',
      render: (row) => row.evaluationCount,
    },
    {
      id: 'notes',
      label: t('admin.tryouts.registrations.columns.notes' as TranslationKey),
      render: (row) => row.notes || t('common.table.emptyValue'),
    },
  ]

  const resultsSummary = useMemo(() => {
    return {
      accepted: resultRows.filter((row) => row.status === 'accepted' || row.status === 'offered').length,
      waitlisted: resultRows.filter((row) => row.status === 'waitlisted').length,
      declined: resultRows.filter((row) => ['declined', 'rejected', 'not_selected'].includes(row.status)).length,
      avgScore:
        resultRows.filter((row) => row.averageScore != null).length > 0
          ? Number(
              (
                resultRows.reduce((sum, row) => sum + (row.averageScore ?? 0), 0) /
                resultRows.filter((row) => row.averageScore != null).length
              ).toFixed(1),
            )
          : 0,
    }
  }, [resultRows])

  const setActiveTab = (tab: DetailTab) => {
    if (!DETAIL_TABS.includes(tab)) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (tab === 'overview') {
        next.delete('tab')
      } else {
        next.set('tab', tab)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="oa-root">
        <div className="oa-skeleton" style={{ height: '60px', marginBottom: '20px' }} />
        <div className="oa-skeleton" style={{ height: '300px' }} />
      </div>
    )
  }

  if (!tryout) {
    return (
      <div className="oa-root">
        <Card className="oa-text-danger">{error || t('common.error.notFound')}</Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={tryout.title}
        breadcrumbs={[
          { label: t('admin.tryouts.title'), path: '/admin/tryouts' },
          { label: tryout.title },
        ]}
        actions={
          <div className="oa-flex oa-gap-2">
            <Button variant="ghost" onClick={() => navigate('/admin/tryouts')}>
              {t('common.back')}
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/admin/tryouts/${tryout.id}/registrations`)}>
              {t('admin.tryouts.registrations.title' as TranslationKey)}
            </Button>
          </div>
        }
      />

      {error && <Card className="oa-text-danger oa-mb-4">{error}</Card>}

      <TopLevelStats
        className="oa-mb-6"
        ariaLabel="Tryout detail summary metrics"
        items={[
          { id: 'date', label: t('admin.tryouts.detail.stats.date' as TranslationKey), value: formatTryoutDateValue(tryout.tryout_date, t('common.tbd')) },
          { id: 'registrations', label: t('admin.tryouts.detail.stats.registrations' as TranslationKey), value: registrations.length },
          { id: 'evaluators', label: t('admin.tryouts.detail.stats.evaluators' as TranslationKey), value: evaluators.length },
          { id: 'completion', label: t('admin.tryouts.detail.stats.completion' as TranslationKey), value: `${completionRate}%` },
        ]}
      />

      <div className="pa-tabs-list oa-mb-4" role="tablist" aria-label={t('admin.tryouts.detail.tabs.ariaLabel' as TranslationKey)}>
        {DETAIL_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`pa-tabs-trigger ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(`admin.tryouts.detail.tabs.${tab}` as TranslationKey)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <Card>
          <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-2 oa-gap-4">
            <div>
              <p className="oa-label">{t('portal.tryouts.detail.fields.location' as TranslationKey)}</p>
              <p className="oa-body-m">{tryout.location ?? t('common.tbd')}</p>
            </div>
            <div>
              <p className="oa-label">{t('portal.tryouts.detail.fields.fee' as TranslationKey)}</p>
              <p className="oa-body-m">${((tryout.entry_fee || 0) / 100).toFixed(2)}</p>
            </div>
            <div>
              <p className="oa-label">{t('portal.tryouts.detail.fields.ageGroup' as TranslationKey)}</p>
              <p className="oa-body-m">{tryout.age_group}</p>
            </div>
            <div>
              <p className="oa-label">{t('admin.tryouts.registrations.columns.status' as TranslationKey)}</p>
              <p className="oa-body-m">{t(`admin.tryouts.status.${tryout.status}` as TranslationKey)}</p>
            </div>
          </div>
          <div className="oa-mt-4">
            <p className="oa-label">{t('portal.tryouts.detail.descriptionTitle' as TranslationKey)}</p>
            <p className="oa-body-m">{tryout.description || t('portal.tryouts.detail.defaultDescription' as TranslationKey)}</p>
          </div>
        </Card>
      )}

      {activeTab === 'registrations' && (
        <Card>
          <OrgDataTable
            columns={columns}
            rows={registrations}
            loading={loading}
            emptyMessage={t('admin.tryouts.registrations.empty' as TranslationKey)}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={registrations.length}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </Card>
      )}

      {activeTab === 'evaluators' && (
        <Card>
          <div className="oa-flex oa-justify-between oa-items-center oa-mb-3">
            <h3 className="oa-h3">{t('admin.tryouts.evaluators.assignedTitle' as TranslationKey)}</h3>
            <Button variant="secondary" onClick={() => navigate(`/admin/tryouts/${tryout.id}/evaluators`)}>
              {t('admin.tryouts.evaluators.manage' as TranslationKey)}
            </Button>
          </div>
          {evaluators.length === 0 ? (
            <p className="oa-body-m oa-text-muted">{t('admin.tryouts.evaluators.empty' as TranslationKey)}</p>
          ) : (
            <div className="oa-flex oa-flex-col oa-gap-2">
              {evaluators.map((evaluator) => (
                <div key={evaluator.id} className="oa-card oa-flex oa-justify-between">
                  <span>{evaluator.coach ? `${evaluator.coach.first_name} ${evaluator.coach.last_name}` : evaluator.coach_id}</span>
                  <Badge variant="info">{t('admin.tryouts.evaluators.assignedBadge' as TranslationKey)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'evaluations' && (
        <Card>
          <div className="oa-flex oa-justify-between oa-items-center oa-mb-3">
            <h3 className="oa-h3">{t('admin.tryouts.evaluation.title' as TranslationKey)}</h3>
            <Button variant="secondary" onClick={() => navigate(`/admin/tryouts/${tryout.id}/evaluation`)}>
              {t('admin.tryouts.evaluation.actions.open' as TranslationKey)}
            </Button>
          </div>
          <p className="oa-body-m">
            {t('admin.tryouts.detail.evaluationSummary' as TranslationKey, {
              completed: evaluations.length,
              total: registrations.length,
            })}
          </p>
        </Card>
      )}

      {activeTab === 'results' && (
        <Card>
          <h3 className="oa-h3 oa-mb-3">{t('admin.tryouts.detail.resultsTitle' as TranslationKey)}</h3>
          <p className="oa-body-m oa-mb-4">{t('admin.tryouts.detail.resultsBody' as TranslationKey)}</p>

          <TopLevelStats
            className="oa-mb-4"
            ariaLabel="Tryout results summary metrics"
            items={[
              { id: 'offers', label: 'Offers', value: resultsSummary.accepted, tone: resultsSummary.accepted > 0 ? 'success' : 'default' },
              { id: 'waitlisted', label: 'Waitlisted', value: resultsSummary.waitlisted, tone: resultsSummary.waitlisted > 0 ? 'warning' : 'default' },
              { id: 'declined', label: 'No Offer', value: resultsSummary.declined, tone: resultsSummary.declined > 0 ? 'danger' : 'default' },
              { id: 'avg', label: 'Avg Score', value: resultsSummary.avgScore > 0 ? resultsSummary.avgScore.toFixed(1) : '—' },
            ]}
          />

          <OrgDataTable
            columns={resultsColumns}
            rows={resultRows}
            loading={loading}
            emptyMessage={t('admin.tryouts.registrations.empty' as TranslationKey)}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={resultRows.length}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </Card>
      )}
    </div>
  )
}
