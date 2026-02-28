import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import { getAthletes } from '../../data/services/familyService'
import {
  canAthleteRegisterForTryout,
  getTryoutSessions,
  registerAthleteForTryout,
  type Tryout,
  type TryoutSession,
} from '../../data/services/tryoutsService'
import Button from '../portal/Button'
import { showError, showSuccess } from '../../utils/toast'

interface TryoutRegistrationFormProps {
  tryout: Tryout
  onRegistered?: () => Promise<void> | void
}

interface AthleteOption {
  id: string
  first_name: string
  last_name: string
}

export default function TryoutRegistrationForm({ tryout, onRegistered }: TryoutRegistrationFormProps) {
  const { context, isReady } = useUserContext()
  const t = useT()

  const [athletes, setAthletes] = useState<AthleteOption[]>([])
  const [sessions, setSessions] = useState<TryoutSession[]>([])
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    setError(null)

    const [athletesResponse, sessionsResponse] = await Promise.all([
      getAthletes(context),
      getTryoutSessions(context, tryout.id),
    ])

    if (athletesResponse.error) {
      setError(athletesResponse.error.message)
      setAthletes([])
      setLoading(false)
      return
    }

    if (sessionsResponse.error) {
      setError(sessionsResponse.error.message)
      setSessions([])
    } else {
      setSessions(sessionsResponse.data ?? [])
    }

    const athleteOptions = athletesResponse.data.map((athlete) => ({
      id: athlete.id,
      first_name: athlete.first_name,
      last_name: athlete.last_name,
    }))
    setAthletes(athleteOptions)
    if (athleteOptions.length === 1) {
      setSelectedAthleteId(athleteOptions[0].id)
    }
    if ((sessionsResponse.data ?? []).length === 1) {
      setSelectedSessionId((sessionsResponse.data ?? [])[0].id)
    }
    setLoading(false)
  }, [context, isReady, tryout.id])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  )

  const registrationClosed = useMemo(() => {
    if (tryout.status !== 'open') return true
    if (!tryout.registration_close_at) return false
    return new Date(tryout.registration_close_at).getTime() < Date.now()
  }, [tryout.registration_close_at, tryout.status])

  const submit = useCallback(async () => {
    if (submitting || registrationClosed) return
    if (!selectedAthleteId) {
      setError(t('portal.tryouts.form.validation.selectAthlete' as TranslationKey))
      return
    }
    if (sessions.length > 1 && !selectedSessionId) {
      setError(t('portal.tryouts.form.validation.selectSession' as TranslationKey))
      return
    }

    setSubmitting(true)
    setError(null)

    const eligibility = await canAthleteRegisterForTryout(context, tryout.id, selectedAthleteId)
    if (eligibility.error || !eligibility.data) {
      setSubmitting(false)
      const message = eligibility.error?.message ?? t('portal.tryouts.form.validation.notEligible' as TranslationKey)
      setError(message)
      showError(message)
      return
    }

    const response = await registerAthleteForTryout(context, tryout.id, selectedAthleteId)
    setSubmitting(false)

    if (response.error) {
      setError(response.error.message)
      showError(response.error.message)
      return
    }

    showSuccess(t('portal.tryouts.form.messages.registered' as TranslationKey))
    if (onRegistered) await onRegistered()
  }, [context, onRegistered, registrationClosed, selectedAthleteId, selectedSessionId, sessions.length, submitting, t, tryout.id])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div>
        <label className="form-label">{t('portal.tryouts.form.fields.athlete' as TranslationKey)}</label>
        <select
          className="form-select"
          value={selectedAthleteId}
          onChange={(event) => setSelectedAthleteId(event.target.value)}
          disabled={registrationClosed || submitting}
        >
          <option value="">{t('portal.tryouts.form.fields.selectAthlete' as TranslationKey)}</option>
          {athletes.map((athlete) => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.first_name} {athlete.last_name}
            </option>
          ))}
        </select>
      </div>

      {sessions.length > 0 && (
        <div>
          <label className="form-label">{t('portal.tryouts.form.fields.session' as TranslationKey)}</label>
          <select
            className="form-select"
            value={selectedSessionId}
            onChange={(event) => setSelectedSessionId(event.target.value)}
            disabled={registrationClosed || submitting || sessions.length <= 1}
          >
            <option value="">{t('portal.tryouts.form.fields.selectSession' as TranslationKey)}</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.session_date} {session.start_time}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        {selectedSession
          ? t('portal.tryouts.form.sessionSummary' as TranslationKey, {
              date: selectedSession.session_date,
              time: selectedSession.start_time,
            })
          : t('portal.tryouts.form.defaultSummary' as TranslationKey)}
      </div>

      {tryout.entry_fee && tryout.entry_fee > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300">
          {t('portal.tryouts.form.paymentNotice' as TranslationKey)}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="primary"
          disabled={registrationClosed || submitting}
          onClick={() => void submit()}
        >
          {registrationClosed
            ? t('portal.tryouts.form.registrationClosed' as TranslationKey)
            : submitting
              ? t('common.processing')
              : t('portal.tryouts.form.submit' as TranslationKey)}
        </Button>
      </div>
    </div>
  )
}
