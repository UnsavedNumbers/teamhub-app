import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import {
  assignTryoutEvaluator,
  getTryoutById,
  getTryoutEvaluators,
  removeTryoutEvaluator,
  type TryoutEvaluator,
} from '../../data/services/tryoutsService'
import { AdminPageHeader, Badge, Button, Card } from '../../components/admin'
import { showError, showSuccess } from '../../utils/toast'
import '../../styles/orgAdmin.css'

interface CoachOption {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

interface OrganizationCoachRow {
  user_id: string
  role: string
  user: {
    id: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

export default function AdminTryoutEvaluators() {
  const { tryoutId } = useParams<{ tryoutId: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const [tryoutTitle, setTryoutTitle] = useState<string>('')
  const [orgId, setOrgId] = useState<string>('')
  const [evaluators, setEvaluators] = useState<TryoutEvaluator[]>([])
  const [coaches, setCoaches] = useState<CoachOption[]>([])
  const [selectedCoachId, setSelectedCoachId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const assignedCoachIds = useMemo(() => new Set(evaluators.map((item) => item.coach_id)), [evaluators])

  const fetchData = useCallback(async () => {
    if (!isReady || !tryoutId) return
    setLoading(true)
    setError(null)

    const tryoutResponse = await getTryoutById(context, tryoutId)
    if (tryoutResponse.error || !tryoutResponse.data) {
      setError(tryoutResponse.error?.message ?? t('common.error.notFound'))
      setLoading(false)
      return
    }

    setTryoutTitle(tryoutResponse.data.title)
    setOrgId(tryoutResponse.data.org_id)

    const [evaluatorsResponse, coachesResponse] = await Promise.all([
      getTryoutEvaluators(context, tryoutId),
      supabase
        .from('organization_members')
        .select('user_id, role, user:users!organization_members_user_id_fkey(id, first_name, last_name, email)')
        .eq('org_id', tryoutResponse.data.org_id)
        .eq('role', 'coach'),
    ])

    if (evaluatorsResponse.error) {
      setError(evaluatorsResponse.error.message)
      setEvaluators([])
    } else {
      setEvaluators(evaluatorsResponse.data ?? [])
    }

    if (coachesResponse.error) {
      setError(coachesResponse.error.message)
      setCoaches([])
    } else {
      const rows = (coachesResponse.data ?? []) as OrganizationCoachRow[]
      const mapped = rows
        .map((entry) => entry.user)
        .filter((user): user is NonNullable<OrganizationCoachRow['user']> => Boolean(user?.id))
        .map((user) => ({
          id: String(user.id),
          first_name: String(user.first_name ?? ''),
          last_name: String(user.last_name ?? ''),
          email: user.email ?? null,
        }))
      setCoaches(mapped)
    }

    setLoading(false)
  }, [context, isReady, t, tryoutId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const assignSelectedCoach = useCallback(async () => {
    if (!tryoutId || !selectedCoachId || saving) return
    setSaving(true)

    const response = await assignTryoutEvaluator(context, tryoutId, selectedCoachId)
    setSaving(false)
    if (response.error) {
      showError(response.error.message)
      return
    }

    showSuccess(t('admin.tryouts.evaluators.messages.assigned' as TranslationKey))
    setSelectedCoachId('')
    await fetchData()
  }, [context, fetchData, saving, selectedCoachId, t, tryoutId])

  const unassignCoach = useCallback(
    async (coachId: string) => {
      if (!tryoutId || saving) return
      setSaving(true)
      const response = await removeTryoutEvaluator(context, tryoutId, coachId)
      setSaving(false)
      if (response.error) {
        showError(response.error.message)
        return
      }
      showSuccess(t('admin.tryouts.evaluators.messages.removed' as TranslationKey))
      await fetchData()
    },
    [context, fetchData, saving, t, tryoutId],
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
        title={t('admin.tryouts.evaluators.title' as TranslationKey)}
        subtitle={tryoutTitle || t('admin.tryouts.evaluators.subtitle' as TranslationKey)}
        breadcrumbs={[
          { label: t('admin.tryouts.title'), path: '/admin/tryouts' },
          { label: tryoutTitle || t('admin.tryouts.evaluators.title' as TranslationKey), path: `/admin/tryouts/${tryoutId}` },
          { label: t('admin.tryouts.evaluators.title' as TranslationKey) },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/admin/tryouts/${tryoutId}`)}>
            {t('common.back')}
          </Button>
        }
      />

      {error && <Card className="oa-text-danger oa-mb-4">{error}</Card>}

      <Card className="oa-mb-4">
        <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-3">
          <div className="sm:oa-col-span-2">
            <label className="oa-label">{t('admin.tryouts.evaluators.addLabel' as TranslationKey)}</label>
            <select
              className="oa-input"
              value={selectedCoachId}
              onChange={(event) => setSelectedCoachId(event.target.value)}
              disabled={loading || saving}
            >
              <option value="">{t('admin.tryouts.evaluators.selectCoach' as TranslationKey)}</option>
              {coaches.map((coach) => (
                <option key={coach.id} value={coach.id} disabled={assignedCoachIds.has(coach.id)}>
                  {coach.first_name} {coach.last_name} {assignedCoachIds.has(coach.id) ? `(${t('admin.tryouts.evaluators.alreadyAssigned' as TranslationKey)})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="oa-flex oa-items-end">
            <Button
              variant="primary"
              disabled={loading || saving || !selectedCoachId || !orgId}
              onClick={() => void assignSelectedCoach()}
            >
              {t('admin.tryouts.evaluators.assign' as TranslationKey)}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="oa-h3 oa-mb-3">{t('admin.tryouts.evaluators.assignedTitle' as TranslationKey)}</h3>
        {loading ? (
          <div className="oa-skeleton" style={{ height: '120px' }} />
        ) : evaluators.length === 0 ? (
          <p className="oa-body-m oa-text-muted">{t('admin.tryouts.evaluators.empty' as TranslationKey)}</p>
        ) : (
          <div className="oa-flex oa-flex-col oa-gap-3">
            {evaluators.map((evaluator) => (
              <div key={evaluator.id} className="oa-flex oa-items-center oa-justify-between oa-gap-2 oa-card">
                <div>
                  <p className="oa-body-m" style={{ fontWeight: 600 }}>
                    {evaluator.coach ? `${evaluator.coach.first_name} ${evaluator.coach.last_name}` : evaluator.coach_id}
                  </p>
                  <p className="oa-body-s oa-text-muted">{evaluator.coach?.email ?? ''}</p>
                </div>
                <div className="oa-flex oa-items-center oa-gap-2">
                  <Badge variant="info">{t('admin.tryouts.evaluators.assignedBadge' as TranslationKey)}</Badge>
                  <Button variant="ghost" size="compact" disabled={saving} onClick={() => void unassignCoach(evaluator.coach_id)}>
                    {t('common.remove')}
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
