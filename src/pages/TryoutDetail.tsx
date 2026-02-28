import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useT } from '../i18n/useI18n'
import type { TranslationKey } from '../i18n'
import { getTryoutById, getTryoutSessions, type Tryout, type TryoutSession } from '../data/services/tryoutsService'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import TryoutRegistrationForm from '../components/tryouts/TryoutRegistrationForm'

function formatDate(dateValue: string | null, fallback: string): string {
  if (!dateValue) return fallback
  return new Date(dateValue).toLocaleDateString()
}

export default function TryoutDetail() {
  const { tryoutId } = useParams<{ tryoutId: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [tryout, setTryout] = useState<Tryout | null>(null)
  const [sessions, setSessions] = useState<TryoutSession[]>([])

  const fetchData = useCallback(async () => {
    if (!isReady || !tryoutId) return
    setLoading(true)
    setError(null)

    const [tryoutResponse, sessionsResponse] = await Promise.all([
      getTryoutById(context, tryoutId),
      getTryoutSessions(context, tryoutId),
    ])

    if (tryoutResponse.error || !tryoutResponse.data) {
      setError(tryoutResponse.error?.message ?? t('common.error.notFound'))
      setTryout(null)
      setSessions([])
      setLoading(false)
      return
    }

    setTryout(tryoutResponse.data)
    if (sessionsResponse.error) {
      setError(sessionsResponse.error.message)
      setSessions([])
    } else {
      setSessions(sessionsResponse.data ?? [])
    }
    setLoading(false)
  }, [context, isReady, t, tryoutId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <>
        <PortalHeader />
        <PortalLayout>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        </PortalLayout>
      </>
    )
  }

  if (!tryout) {
    return (
      <>
        <PortalHeader />
        <PortalLayout>
          <Card className="text-center py-12">
            <CardTitle>{error || t('common.error.notFound')}</CardTitle>
            <Button variant="primary" onClick={() => navigate('/portal/tryouts')} className="mt-4">
              {t('common.back')}
            </Button>
          </Card>
        </PortalLayout>
      </>
    )
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: t('common.home'), path: '/portal/dashboard' },
        { label: t('admin.tryouts.title'), path: '/portal/tryouts' },
        { label: tryout.title },
      ]}
    >
      <div className="mb-10">
        <PageTitle>{tryout.title}</PageTitle>
      </div>

      {error && (
        <Card className="mb-4 border border-amber-200 text-amber-800 dark:border-amber-800/50 dark:text-amber-300">
          {error}
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6 xl:col-span-2">
          <h3 className="text-lg font-black mb-4">{t('portal.tryouts.detail.infoTitle' as TranslationKey)}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">{t('common.date')}</label>
              <p className="font-bold">{formatDate(tryout.tryout_date, t('common.tbd'))}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">{t('portal.tryouts.detail.fields.time' as TranslationKey)}</label>
              <p className="font-bold">{tryout.start_time ?? t('common.tbd')}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">{t('portal.tryouts.detail.fields.location' as TranslationKey)}</label>
              <p className="font-bold">{tryout.location ?? t('common.tbd')}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">{t('portal.tryouts.detail.fields.ageGroup' as TranslationKey)}</label>
              <p className="font-bold">{tryout.age_group}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">{t('portal.tryouts.detail.fields.fee' as TranslationKey)}</label>
              <p className="font-bold">${((tryout.entry_fee || 0) / 100).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400">{t('admin.tryouts.registrations.columns.status' as TranslationKey)}</label>
              <p className="font-bold">{t(`admin.tryouts.status.${tryout.status}` as TranslationKey)}</p>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-black uppercase tracking-wide text-slate-400 mb-2">
              {t('portal.tryouts.detail.descriptionTitle' as TranslationKey)}
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              {tryout.description || t('portal.tryouts.detail.defaultDescription' as TranslationKey)}
            </p>
          </div>

          {sessions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-black uppercase tracking-wide text-slate-400 mb-2">
                {t('portal.tryouts.detail.sessionsTitle' as TranslationKey)}
              </h4>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 text-sm">
                    <p className="font-bold">{session.session_date} {session.start_time}</p>
                    <p className="text-slate-500 dark:text-slate-400">{session.location || t('common.unknown')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-black mb-4">{t('portal.tryouts.form.title' as TranslationKey)}</h3>
          <TryoutRegistrationForm tryout={tryout} onRegistered={fetchData} />
        </Card>
      </div>
    </PortalLayout>
  )
}
