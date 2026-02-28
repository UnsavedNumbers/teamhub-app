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
import { showError, showSuccess } from '../../utils/toast'
import '../../styles/orgAdmin.css'

interface DraftEvaluation {
  score: string
  notes: string
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
          { label: t('admin.tryouts.title'), path: '/admin/tryouts' },
          { label: tryoutTitle || t('admin.tryouts.evaluation.title' as TranslationKey), path: `/admin/tryouts/${tryoutId}` },
          { label: t('admin.tryouts.evaluation.title' as TranslationKey) },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/admin/tryouts/${tryoutId}`)}>
            {t('common.back')}
          </Button>
        }
      />

      <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-4 oa-mb-4">
        <Card>
          <div className="oa-stat-label">{t('admin.tryouts.evaluation.stats.registrations' as TranslationKey)}</div>
          <div className="oa-stat-value">{registrations.length}</div>
        </Card>
        <Card>
          <div className="oa-stat-label">{t('admin.tryouts.evaluation.stats.completed' as TranslationKey)}</div>
          <div className="oa-stat-value">{evaluations.length}</div>
        </Card>
        <Card>
          <div className="oa-stat-label">{t('admin.tryouts.evaluation.stats.average' as TranslationKey)}</div>
          <div className="oa-stat-value">{averageScore}</div>
        </Card>
      </div>

      {error && <Card className="oa-text-danger oa-mb-4">{error}</Card>}

      <Card>
        {loading ? (
          <div className="oa-skeleton" style={{ height: '220px' }} />
        ) : registrations.length === 0 ? (
          <p className="oa-body-m oa-text-muted">{t('admin.tryouts.evaluation.empty' as TranslationKey)}</p>
        ) : (
          <div className="oa-flex oa-flex-col oa-gap-4">
            {registrations.map((registration) => {
              const draft = drafts[registration.id] ?? { score: '', notes: '' }
              const isSaving = Boolean(savingById[registration.id])
              const athleteName = registration.child
                ? `${registration.child.first_name} ${registration.child.last_name}`
                : t('common.unknown')

              return (
                <div key={registration.id} className="oa-card">
                  <div className="oa-flex oa-items-center oa-justify-between oa-gap-3 oa-mb-3">
                    <div>
                      <p className="oa-body-m" style={{ fontWeight: 700 }}>{athleteName}</p>
                      <p className="oa-body-s oa-text-muted">{t(`admin.tryouts.registrations.statuses.${registration.status}` as TranslationKey)}</p>
                    </div>
                    <Badge variant={registration.status === 'accepted' ? 'success' : 'neutral'}>
                      {t('admin.tryouts.evaluation.scoreLabel' as TranslationKey)}
                    </Badge>
                  </div>

                  <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-3">
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      step="1"
                      label={t('admin.tryouts.evaluation.fields.score' as TranslationKey)}
                      value={draft.score}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [registration.id]: { ...draft, score: event.target.value },
                        }))
                      }
                    />
                    <div className="sm:oa-col-span-2">
                      <label className="oa-label">{t('admin.tryouts.evaluation.fields.notes' as TranslationKey)}</label>
                      <textarea
                        className="oa-input oa-textarea"
                        rows={3}
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

                  <div className="oa-flex oa-justify-end oa-mt-3">
                    <Button variant="primary" disabled={isSaving} onClick={() => void saveEvaluation(registration)}>
                      {isSaving
                        ? t('common.saving')
                        : t('admin.tryouts.evaluation.actions.save' as TranslationKey)}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
