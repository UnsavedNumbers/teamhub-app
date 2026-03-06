import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import { createTryout, type TryoutSession } from '../../data/services/tryoutsService'
import { getErrorMessage } from '../../utils/errorUtils'
import { AdminPageHeader, Button, Card, DatePicker, Input } from '../../components/admin'
import { TimePicker } from '../../components/platformAdmin/TimePicker'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/orgAdmin.css'

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5

interface CreateTryoutDraft {
  title: string
  description: string
  sport: string
  age_group: string
  location: string
  status: 'draft' | 'open'
  eligibility_criteria: {
    minAge: string
    maxAge: string
    gender: string
  }
  sessions: Array<{
    id: string
    session_date: string
    start_time: string
    end_time: string
    location: string
    session_type: 'initial' | 'callback' | 'final'
    capacity: string
  }>
  registration_open_at: string
  registration_close_at: string
  entry_fee_dollars: string
  waitlist_enabled: boolean
  target_team_ids_csv: string
}

const STEP_KEYS: Array<TranslationKey> = [
  'admin.tryouts.wizard.steps.basic',
  'admin.tryouts.wizard.steps.eligibility',
  'admin.tryouts.wizard.steps.sessions',
  'admin.tryouts.wizard.steps.registration',
  'admin.tryouts.wizard.steps.teams',
  'admin.tryouts.wizard.steps.review',
]

const DEFAULT_DRAFT: CreateTryoutDraft = {
  title: '',
  description: '',
  sport: '',
  age_group: '',
  location: '',
  status: 'draft',
  eligibility_criteria: {
    minAge: '',
    maxAge: '',
    gender: '',
  },
  sessions: [
    {
      id: 'session-1',
      session_date: '',
      start_time: '',
      end_time: '',
      location: '',
      session_type: 'initial',
      capacity: '',
    },
  ],
  registration_open_at: '',
  registration_close_at: '',
  entry_fee_dollars: '0',
  waitlist_enabled: false,
  target_team_ids_csv: '',
}

function toSessionPayload(sessions: CreateTryoutDraft['sessions']): TryoutSession[] {
  return sessions
    .filter((session) => session.session_date && session.start_time)
    .map((session) => ({
      id: session.id,
      tryout_id: '',
      session_date: session.session_date,
      start_time: session.start_time,
      end_time: session.end_time || null,
      location: session.location || null,
      session_type: session.session_type,
      capacity: session.capacity ? Number(session.capacity) : null,
      created_at: null,
      updated_at: null,
    }))
}

export default function CreateTryout() {
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const t = useT()

  const [step, setStep] = useState<WizardStep>(0)
  const [draft, setDraft] = useState<CreateTryoutDraft>(DEFAULT_DRAFT)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const stepTitle = useMemo(() => t(STEP_KEYS[step]), [step, t])

  const canContinue = useMemo(() => {
    if (step === 0) {
      return Boolean(draft.title && draft.sport && draft.age_group && draft.location)
    }
    if (step === 2) {
      return draft.sessions.some((session) => session.session_date && session.start_time)
    }
    if (step === 3) {
      return Boolean(draft.registration_close_at)
    }
    return true
  }, [draft, step])

  const addSession = () => {
    const nextIndex = draft.sessions.length + 1
    setDraft((previous) => ({
      ...previous,
      sessions: [
        ...previous.sessions,
        {
          id: `session-${nextIndex}`,
          session_date: '',
          start_time: '',
          end_time: '',
          location: '',
          session_type: 'initial',
          capacity: '',
        },
      ],
    }))
  }

  const removeSession = (sessionId: string) => {
    setDraft((previous) => ({
      ...previous,
      sessions: previous.sessions.filter((session) => session.id !== sessionId),
    }))
  }

  const saveTryout = async () => {
    if (!isReady || !currentOrganization || saving) return
    setSaving(true)
    setError(null)

    try {
      const response = await createTryout(context, {
        org_id: currentOrganization.id,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        sport: draft.sport.trim(),
        age_group: draft.age_group.trim(),
        location: draft.location.trim(),
        status: draft.status,
        entry_fee: Math.max(0, Math.round(Number(draft.entry_fee_dollars || '0') * 100)),
        registration_open_at: draft.registration_open_at || null,
        registration_close_at: draft.registration_close_at || null,
        registration_deadline_at: draft.registration_close_at || null,
        waitlist_enabled: draft.waitlist_enabled,
        eligibility_criteria: {
          min_age: draft.eligibility_criteria.minAge || null,
          max_age: draft.eligibility_criteria.maxAge || null,
          gender: draft.eligibility_criteria.gender || null,
        },
        target_team_ids: draft.target_team_ids_csv
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        sessions: toSessionPayload(draft.sessions),
        tryout_date: draft.sessions[0]?.session_date || null,
        start_time: draft.sessions[0]?.start_time || null,
      })

      if (response.error || !response.data) {
        throw response.error ?? new Error(t('common.error.updateFailed'))
      }

      navigate(getLink(RouteKeys.ADMIN_TRYOUT_DETAIL, { tryoutId: response.data.id }))
    } catch (saveError) {
      setError(getErrorMessage(saveError) || t('common.error.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('admin.tryouts.actions.create' as TranslationKey)}
        subtitle={t('admin.tryouts.createSubtitle')}
        breadcrumbs={[
          { label: t('admin.tryouts.title'), path: getLink(RouteKeys.ADMIN_TRYOUTS) },
          { label: t('admin.tryouts.actions.create' as TranslationKey) },
        ]}
      />

      <Card className="oa-mb-4">
        <div className="oa-flex oa-items-center oa-justify-between oa-gap-3">
          <div>
            <p className="oa-body-s oa-text-muted">{t('admin.tryouts.wizard.stepLabel' as TranslationKey, { step: step + 1, total: 6 })}</p>
            <h3 className="oa-h3">{stepTitle}</h3>
          </div>
          <div className="oa-flex oa-gap-1">
            {STEP_KEYS.map((_, index) => (
              <div
                key={index}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '999px',
                  background: index <= step ? 'var(--oa-accent, #137fec)' : 'var(--oa-border-subtle, #dbe3f0)',
                }}
              />
            ))}
          </div>
        </div>
      </Card>

      {error && <Card className="oa-text-danger oa-mb-4">{error}</Card>}

      <Card>
        {step === 0 && (
          <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-2 oa-gap-4">
            <Input
              label={t('admin.tryouts.wizard.fields.title' as TranslationKey)}
              value={draft.title}
              onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
              required
            />
            <Input
              label={t('admin.tryouts.wizard.fields.sport' as TranslationKey)}
              value={draft.sport}
              onChange={(event) => setDraft((previous) => ({ ...previous, sport: event.target.value }))}
              required
            />
            <Input
              label={t('admin.tryouts.wizard.fields.ageGroup' as TranslationKey)}
              value={draft.age_group}
              onChange={(event) => setDraft((previous) => ({ ...previous, age_group: event.target.value }))}
              required
            />
            <Input
              label={t('admin.tryouts.wizard.fields.location' as TranslationKey)}
              value={draft.location}
              onChange={(event) => setDraft((previous) => ({ ...previous, location: event.target.value }))}
              required
            />
            <div className="sm:oa-col-span-2">
              <label className="oa-label">{t('admin.tryouts.wizard.fields.description' as TranslationKey)}</label>
              <textarea
                className="oa-input oa-textarea"
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-4">
            <Input
              label={t('admin.tryouts.wizard.fields.minAge' as TranslationKey)}
              type="number"
              value={draft.eligibility_criteria.minAge}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  eligibility_criteria: { ...previous.eligibility_criteria, minAge: event.target.value },
                }))
              }
            />
            <Input
              label={t('admin.tryouts.wizard.fields.maxAge' as TranslationKey)}
              type="number"
              value={draft.eligibility_criteria.maxAge}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  eligibility_criteria: { ...previous.eligibility_criteria, maxAge: event.target.value },
                }))
              }
            />
            <Input
              label={t('admin.tryouts.wizard.fields.gender' as TranslationKey)}
              value={draft.eligibility_criteria.gender}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  eligibility_criteria: { ...previous.eligibility_criteria, gender: event.target.value },
                }))
              }
            />
          </div>
        )}

        {step === 2 && (
          <div className="oa-flex oa-flex-col oa-gap-4">
            {draft.sessions.map((session) => (
              <div key={session.id} className="oa-card">
                <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-3">
                  <DatePicker
                    label={t('admin.tryouts.wizard.fields.sessionDate' as TranslationKey)}
                    value={session.session_date}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        sessions: previous.sessions.map((current) =>
                          current.id === session.id ? { ...current, session_date: event.target.value } : current,
                        ),
                      }))
                    }
                  />
                  <TimePicker
                    label={t('admin.tryouts.wizard.fields.startTime' as TranslationKey)}
                    value={session.start_time}
                    onChange={(value) =>
                      setDraft((previous) => ({
                        ...previous,
                        sessions: previous.sessions.map((current) =>
                          current.id === session.id ? { ...current, start_time: value } : current,
                        ),
                      }))
                    }
                  />
                  <TimePicker
                    label={t('admin.tryouts.wizard.fields.endTime' as TranslationKey)}
                    value={session.end_time}
                    onChange={(value) =>
                      setDraft((previous) => ({
                        ...previous,
                        sessions: previous.sessions.map((current) =>
                          current.id === session.id ? { ...current, end_time: value } : current,
                        ),
                      }))
                    }
                  />
                  <Input
                    label={t('admin.tryouts.wizard.fields.sessionLocation' as TranslationKey)}
                    value={session.location}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        sessions: previous.sessions.map((current) =>
                          current.id === session.id ? { ...current, location: event.target.value } : current,
                        ),
                      }))
                    }
                  />
                  <Input
                    label={t('admin.tryouts.wizard.fields.sessionType' as TranslationKey)}
                    value={session.session_type}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        sessions: previous.sessions.map((current) =>
                          current.id === session.id
                            ? { ...current, session_type: event.target.value as 'initial' | 'callback' | 'final' }
                            : current,
                        ),
                      }))
                    }
                  />
                  <Input
                    label={t('admin.tryouts.wizard.fields.capacity' as TranslationKey)}
                    type="number"
                    value={session.capacity}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        sessions: previous.sessions.map((current) =>
                          current.id === session.id ? { ...current, capacity: event.target.value } : current,
                        ),
                      }))
                    }
                  />
                </div>
                {draft.sessions.length > 1 && (
                  <div className="oa-mt-3">
                    <Button variant="ghost" onClick={() => removeSession(session.id)}>
                      {t('common.remove')}
                    </Button>
                  </div>
                )}
              </div>
            ))}

            <Button variant="secondary" onClick={addSession}>
              {t('admin.tryouts.wizard.actions.addSession' as TranslationKey)}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-4">
            <DatePicker
              label={t('admin.tryouts.wizard.fields.registrationOpen' as TranslationKey)}
              value={draft.registration_open_at}
              onChange={(event) => setDraft((previous) => ({ ...previous, registration_open_at: event.target.value }))}
            />
            <DatePicker
              label={t('admin.tryouts.wizard.fields.registrationClose' as TranslationKey)}
              value={draft.registration_close_at}
              onChange={(event) => setDraft((previous) => ({ ...previous, registration_close_at: event.target.value }))}
            />
            <Input
              label={t('admin.tryouts.wizard.fields.entryFee' as TranslationKey)}
              type="number"
              min="0"
              step="0.01"
              value={draft.entry_fee_dollars}
              onChange={(event) => setDraft((previous) => ({ ...previous, entry_fee_dollars: event.target.value }))}
            />
            <div className="sm:oa-col-span-3 oa-flex oa-items-center oa-gap-2">
              <input
                id="waitlistEnabled"
                className="oa-checkbox"
                type="checkbox"
                checked={draft.waitlist_enabled}
                onChange={(event) => setDraft((previous) => ({ ...previous, waitlist_enabled: event.target.checked }))}
              />
              <label htmlFor="waitlistEnabled" className="oa-label" style={{ marginBottom: 0 }}>
                {t('admin.tryouts.wizard.fields.waitlistEnabled' as TranslationKey)}
              </label>
            </div>
          </div>
        )}

        {step === 4 && (
          <Input
            label={t('admin.tryouts.wizard.fields.targetTeams' as TranslationKey)}
            value={draft.target_team_ids_csv}
            onChange={(event) => setDraft((previous) => ({ ...previous, target_team_ids_csv: event.target.value }))}
            placeholder={t('admin.tryouts.wizard.fields.targetTeamsPlaceholder' as TranslationKey)}
          />
        )}

        {step === 5 && (
          <div className="oa-flex oa-flex-col oa-gap-3">
            <p className="oa-body-m"><strong>{t('admin.tryouts.wizard.fields.title' as TranslationKey)}:</strong> {draft.title}</p>
            <p className="oa-body-m"><strong>{t('admin.tryouts.wizard.fields.sport' as TranslationKey)}:</strong> {draft.sport}</p>
            <p className="oa-body-m"><strong>{t('admin.tryouts.wizard.fields.ageGroup' as TranslationKey)}:</strong> {draft.age_group}</p>
            <p className="oa-body-m"><strong>{t('admin.tryouts.wizard.fields.sessionCount' as TranslationKey)}:</strong> {toSessionPayload(draft.sessions).length}</p>
            <p className="oa-body-m"><strong>{t('admin.tryouts.wizard.fields.entryFee' as TranslationKey)}:</strong> ${Number(draft.entry_fee_dollars || '0').toFixed(2)}</p>
          </div>
        )}

        <div className="oa-flex oa-justify-between oa-gap-3 oa-mt-6">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || saving}
            onClick={() => setStep((previous) => Math.max(0, previous - 1) as WizardStep)}
          >
            {t('common.back')}
          </Button>

          <div className="oa-flex oa-gap-2">
            {step < 5 ? (
              <Button
                type="button"
                variant="primary"
                disabled={!canContinue || saving}
                onClick={() => setStep((previous) => Math.min(5, previous + 1) as WizardStep)}
              >
                {t('common.next')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                disabled={saving}
                onClick={() => void saveTryout()}
              >
                {saving ? t('common.saving') : t('admin.tryouts.wizard.actions.publish' as TranslationKey)}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
