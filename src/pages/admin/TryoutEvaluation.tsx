import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import {
  getAdminTryoutRegistrations,
  getTryoutById,
  getTryoutEvaluations,
  upsertTryoutEvaluation,
  type TryoutEvaluation,
  type TryoutRegistration,
} from '../../data/services/tryoutsService'
import { AdminPageHeader, Badge, Button, Card, Input } from '../../components/admin'
import { TopLevelStats } from '../../components/common/TopLevelStats'
import { showError, showSuccess } from '../../utils/toast'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/orgAdmin.css'

interface DraftEvaluation {
  score: string
  notes: string
}

const registrationStatusVariant: Record<TryoutRegistration['status'], 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  registered: 'neutral',
  checked_in: 'info',
  evaluated: 'success',
  offered: 'info',
  accepted: 'success',
  declined: 'danger',
  rejected: 'danger',
  withdrawn: 'warning',
  waitlisted: 'warning',
  not_selected: 'neutral',
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
}

function getAthleteInitials(registration: TryoutRegistration): string {
  const first = registration.child?.first_name?.trim().charAt(0) ?? ''
  const last = registration.child?.last_name?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'NA'
}

function formatScoreMarker(score: string): string {
  const numericScore = Number(score)
  if (!Number.isFinite(numericScore) || numericScore <= 0) return '--'
  return String(Math.round(numericScore)).padStart(2, '0')
}

function formatTimestamp(value: string | null | undefined): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

function buildInitialDrafts(
  registrations: TryoutRegistration[],
  existingEvaluations: TryoutEvaluation[],
): Record<string, DraftEvaluation> {
  const byRegistration = new Map<string, TryoutEvaluation>()
  for (const evaluation of existingEvaluations) {
    if (!byRegistration.has(evaluation.registration_id)) {
      byRegistration.set(evaluation.registration_id, evaluation)
    }
  }

  const drafts: Record<string, DraftEvaluation> = {}
  for (const registration of registrations) {
    const existing = byRegistration.get(registration.id)
    drafts[registration.id] = {
      score: existing ? String(existing.score) : '',
      notes: existing?.notes ?? '',
    }
  }
  return drafts
}

export default function TryoutEvaluation() {
  const { tryoutId } = useParams<{ tryoutId: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const [tryoutTitle, setTryoutTitle] = useState<string>('')
  const [registrations, setRegistrations] = useState<TryoutRegistration[]>([])
  const [evaluations, setEvaluations] = useState<TryoutEvaluation[]>([])
  const [drafts, setDrafts] = useState<Record<string, DraftEvaluation>>({})
  const [savingById, setSavingById] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isReady || !tryoutId) return
    setLoading(true)
    setError(null)

    const [tryoutResponse, registrationsResponse, evaluationsResponse] = await Promise.all([
      getTryoutById(context, tryoutId),
      getAdminTryoutRegistrations(context, tryoutId),
      getTryoutEvaluations(context, tryoutId),
    ])

    if (tryoutResponse.error || !tryoutResponse.data) {
      setError(tryoutResponse.error?.message ?? t('common.error.notFound'))
      setLoading(false)
      return
    }

    if (registrationsResponse.error) {
      setError(registrationsResponse.error.message)
      setRegistrations([])
      setLoading(false)
      return
    }

    if (evaluationsResponse.error) {
      setError(evaluationsResponse.error.message)
      setEvaluations([])
      setLoading(false)
      return
    }

    const registrationRows = registrationsResponse.data ?? []
    const evaluationRows = evaluationsResponse.data ?? []

    setTryoutTitle(tryoutResponse.data.title)
    setRegistrations(registrationRows)
    setEvaluations(evaluationRows)
    setDrafts(buildInitialDrafts(registrationRows, evaluationRows))
    setLoading(false)
  }, [context, isReady, t, tryoutId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const averageScore = useMemo(() => {
    if (evaluations.length === 0) return 0
    const total = evaluations.reduce((sum, item) => sum + item.score, 0)
    return Number((total / evaluations.length).toFixed(1))
  }, [evaluations])

  const evaluationsByRegistration = useMemo(() => {
    const entries = new Map<string, TryoutEvaluation>()
    for (const evaluation of evaluations) {
      if (!entries.has(evaluation.registration_id)) {
        entries.set(evaluation.registration_id, evaluation)
      }
    }
    return entries
  }, [evaluations])

  const saveEvaluation = useCallback(
    async (registration: TryoutRegistration) => {
      const draft = drafts[registration.id]
      const rawScore = Number(draft?.score ?? '')
      if (!Number.isFinite(rawScore) || rawScore < 1 || rawScore > 10) {
        showError(t('admin.tryouts.evaluation.validation.scoreRange' as TranslationKey))
        return
      }

      setSavingById((previous) => ({ ...previous, [registration.id]: true }))
      const response = await upsertTryoutEvaluation(context, {
        registrationId: registration.id,
        score: rawScore,
        notes: draft.notes || null,
      })
      setSavingById((previous) => ({ ...previous, [registration.id]: false }))

      if (response.error) {
        showError(response.error.message)
        return
      }

      showSuccess(t('admin.tryouts.evaluation.messages.saved' as TranslationKey))
      await fetchData()
    },
    [context, drafts, fetchData, t],
  )

  if (!tryoutId) {
    return (
      <div className="oa-root">
        <Card>{t('common.error.notFound')}</Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('admin.tryouts.evaluation.title' as TranslationKey)}
        subtitle={tryoutTitle || t('admin.tryouts.evaluation.subtitle' as TranslationKey)}
        breadcrumbs={[
          { label: t('admin.tryouts.title'), path: getLink(RouteKeys.ADMIN_TRYOUTS) },
          { label: tryoutTitle || t('admin.tryouts.evaluation.title' as TranslationKey), path: getLink(RouteKeys.ADMIN_TRYOUT_DETAIL, { tryoutId }) },
          { label: t('admin.tryouts.evaluation.title' as TranslationKey) },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate(getLink(RouteKeys.ADMIN_TRYOUT_DETAIL, { tryoutId }))}>
            {t('common.back')}
          </Button>
        }
      />

      <TopLevelStats
        className="oa-mb-4"
        ariaLabel="Tryout evaluation summary metrics"
        items={[
          { id: 'registrations', label: t('admin.tryouts.evaluation.stats.registrations' as TranslationKey), value: registrations.length },
          { id: 'completed', label: t('admin.tryouts.evaluation.stats.completed' as TranslationKey), value: evaluations.length },
          { id: 'average', label: t('admin.tryouts.evaluation.stats.average' as TranslationKey), value: averageScore },
        ]}
      />

      {error && <Card className="oa-text-danger oa-mb-4">{error}</Card>}

      {loading ? (
        <Card>
          <div className="oa-skeleton" style={{ height: '220px' }} />
        </Card>
      ) : registrations.length === 0 ? (
        <Card>
          <p className="oa-body-m oa-text-muted">{t('admin.tryouts.evaluation.empty' as TranslationKey)}</p>
        </Card>
      ) : (
        <div className="oa-card oa-shadow-sm oa-ticket-list oa-ticket-list--material oa-ticket-list--athletes">
          {registrations.map((registration) => {
            const draft = drafts[registration.id] ?? { score: '', notes: '' }
            const isSaving = Boolean(savingById[registration.id])
            const existingEvaluation = evaluationsByRegistration.get(registration.id)
            const athleteName = registration.child
              ? `${registration.child.first_name} ${registration.child.last_name}`
              : t('common.unknown')
            const hasSavedEvaluation = Boolean(existingEvaluation)
            const updatedLabel = formatTimestamp(existingEvaluation?.updated_at ?? existingEvaluation?.created_at)

            return (
              <article
                key={registration.id}
                className="oa-ticket-list__row oa-ticket-list__row--ledger oa-ticket-list__row--athlete-ledger"
              >
                <div className="oa-athlete-ledger__avatar-wrap" aria-hidden="true">
                  <div className="oa-athlete-ledger__avatar">
                    <span className="oa-athlete-ledger__initials">{getAthleteInitials(registration)}</span>
                  </div>
                </div>

                <div
                  className="oa-ticket-list__count oa-ticket-list__count--athlete"
                  aria-label={`${t('admin.tryouts.evaluation.scoreLabel' as TranslationKey)} ${formatScoreMarker(draft.score)}`}
                >
                  <span className="oa-ticket-list__count-value">{formatScoreMarker(draft.score)}</span>
                  <span className="oa-ticket-list__count-label">
                    {t('admin.tryouts.evaluation.scoreLabel' as TranslationKey)}
                  </span>
                </div>

                <div className="oa-ticket-list__content oa-ticket-list__content--ledger oa-ticket-list__content--athlete">
                  <div className="oa-ticket-list__event-name">{athleteName}</div>

                  <div className="oa-ticket-list__order-meta oa-ticket-list__order-meta--athlete">
                    <Badge variant={registrationStatusVariant[registration.status]}>
                      {t(`admin.tryouts.registrations.statuses.${registration.status}` as TranslationKey)}
                    </Badge>
                    <Badge variant={hasSavedEvaluation ? 'success' : 'neutral'}>
                      {hasSavedEvaluation ? 'Saved' : 'Pending evaluation'}
                    </Badge>
                    {registration.payment_status && (
                      <Badge variant={registration.payment_status === 'paid' ? 'success' : registration.payment_status === 'failed' ? 'danger' : 'warning'}>
                        {registration.payment_status}
                      </Badge>
                    )}
                    {updatedLabel && <span className="oa-athlete-ledger__meta-summary">Updated {updatedLabel}</span>}
                  </div>

                  <div className="oa-athlete-ledger__detail-list">
                    <div className="oa-athlete-ledger__detail-row">
                      <div className="oa-athlete-ledger__detail-label">
                        {t('admin.tryouts.evaluation.fields.score' as TranslationKey)}
                      </div>
                      <div className="oa-athlete-ledger__detail-values">
                        <div style={{ width: '112px', maxWidth: '100%' }}>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            step="1"
                            value={draft.score}
                            onChange={(event) =>
                              setDrafts((previous) => ({
                                ...previous,
                                [registration.id]: { ...draft, score: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <span className="oa-athlete-ledger__detail-chip">
                          {hasSavedEvaluation ? 'Existing evaluation on file' : 'No saved evaluation yet'}
                        </span>
                      </div>
                    </div>

                    <div className="oa-athlete-ledger__detail-row">
                      <div className="oa-athlete-ledger__detail-label">
                        {t('admin.tryouts.evaluation.fields.notes' as TranslationKey)}
                      </div>
                      <div className="oa-athlete-ledger__detail-values" style={{ width: '100%' }}>
                        <textarea
                          className="oa-input oa-textarea"
                          rows={3}
                          style={{ width: '100%', maxWidth: '560px' }}
                          value={draft.notes}
                          onChange={(event) =>
                            setDrafts((previous) => ({
                              ...previous,
                              [registration.id]: { ...draft, notes: event.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="oa-ticket-list__side oa-ticket-list__side--ledger oa-ticket-list__side--athlete">
                  <div className="oa-ticket-list__summary oa-ticket-list__summary--ledger">
                    <span className="oa-ticket-list__summary-detail">
                      {hasSavedEvaluation ? 'Ready to update' : 'Ready to save'}
                    </span>
                    <span className="oa-ticket-list__summary-detail">
                      {draft.notes.trim().length > 0 ? 'Notes added' : 'No notes'}
                    </span>
                  </div>

                  <div className="oa-ticket-list__actions oa-ticket-list__actions--ledger">
                    <Button variant="primary" disabled={isSaving} onClick={() => void saveEvaluation(registration)}>
                      {isSaving
                        ? t('common.saving')
                        : t('admin.tryouts.evaluation.actions.save' as TranslationKey)}
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
