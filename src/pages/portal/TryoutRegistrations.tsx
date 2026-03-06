import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import { getTryoutRegistrations, getTryouts, updateTryoutRegistrationStatus, type TryoutRegistration } from '../../data/services/tryoutsService'
import PortalLayout from '../../components/portal/PortalLayout'
import Card from '../../components/portal/Card'
import Button from '../../components/portal/Button'
import { PageTitle, CardTitle } from '../../components/portal/Typography'
import PullToRefreshContainer from '../../components/common/mobile/PullToRefreshContainer'
import CollapsibleHeader from '../../components/common/mobile/CollapsibleHeader'
import { showError, showSuccess } from '../../utils/toast'
import { getLink, RouteKeys } from '../../utils/routes'

export default function TryoutRegistrations() {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const [rows, setRows] = useState<TryoutRegistration[]>([])
  const [titlesByTryoutId, setTitlesByTryoutId] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isReady) return
    setLoading(true)
    setError(null)

    const [registrationsResponse, tryoutsResponse] = await Promise.all([
      getTryoutRegistrations(context),
      getTryouts(context),
    ])

    if (registrationsResponse.error) {
      setError(registrationsResponse.error.message)
      setRows([])
      setLoading(false)
      return
    }

    if (tryoutsResponse.error) {
      setError(tryoutsResponse.error.message)
      setRows(registrationsResponse.data ?? [])
      setLoading(false)
      return
    }

    const tryoutMap = Object.fromEntries((tryoutsResponse.data ?? []).map((item) => [item.id, item.title]))
    setTitlesByTryoutId(tryoutMap)
    setRows(registrationsResponse.data ?? [])
    setLoading(false)
  }, [context, isReady])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const canCancel = useMemo(
    () => (status: TryoutRegistration['status']) => status === 'registered' || status === 'waitlisted',
    [],
  )

  const cancelRegistration = useCallback(
    async (registration: TryoutRegistration) => {
      if (actioningId) return
      setActioningId(registration.id)
      const response = await updateTryoutRegistrationStatus(context, registration.id, 'withdrawn')
      setActioningId(null)
      if (response.error) {
        showError(response.error.message)
        return
      }
      showSuccess(t('portal.tryouts.registrations.messages.cancelled' as TranslationKey))
      await fetchData()
    },
    [actioningId, context, fetchData, t],
  )

  return (
    <PortalLayout
      breadcrumbs={[
        { label: t('common.home'), path: getLink(RouteKeys.PORTAL_DASHBOARD) },
        { label: t('portal.tryouts.registrations.title' as TranslationKey) },
      ]}
    >
      <PullToRefreshContainer onRefresh={fetchData}>
      <div className="mb-10">
        <CollapsibleHeader
          title={t('portal.tryouts.registrations.title' as TranslationKey)}
          mode="large"
          scrollContainerSelector=".portal-workspace-main"
        />
        <PageTitle className="sr-only">{t('portal.tryouts.registrations.title' as TranslationKey)}</PageTitle>
        <p className="text-gray-500 dark:text-gray-400">
          {t('portal.tryouts.registrations.subtitle' as TranslationKey)}
        </p>
      </div>

      {error && (
        <Card className="mb-4 border border-rose-200 text-rose-700 dark:border-rose-900/60 dark:text-rose-300">
          {error}
        </Card>
      )}

      {loading ? (
        <Card className="p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center">
          <CardTitle>{t('portal.tryouts.registrations.emptyTitle' as TranslationKey)}</CardTitle>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('portal.tryouts.registrations.emptyBody' as TranslationKey)}
          </p>
          <Button variant="primary" className="mt-5" onClick={() => navigate(getLink(RouteKeys.PORTAL_TRYOUTS))}>
            {t('portal.tryouts.registrations.browseAction' as TranslationKey)}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((registration) => {
            const title = titlesByTryoutId[registration.tryout_id] ?? t('admin.tryouts.title')
            const athlete = registration.child
              ? `${registration.child.first_name} ${registration.child.last_name}`
              : t('common.unknown')
            const isCancelling = actioningId === registration.id

            return (
              <Card key={registration.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{athlete}</p>
                    {registration.notes && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{registration.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {t(`admin.tryouts.registrations.statuses.${registration.status}` as TranslationKey)}
                    </span>
                    <Button variant="secondary" onClick={() => navigate(getLink(RouteKeys.PORTAL_TRYOUT_DETAIL, { tryoutId: registration.tryout_id }))}>
                      {t('common.viewDetails')}
                    </Button>
                    {canCancel(registration.status) && (
                      <Button variant="secondary" disabled={isCancelling} onClick={() => void cancelRegistration(registration)}>
                        {isCancelling
                          ? t('common.processing')
                          : t('portal.tryouts.registrations.cancelAction' as TranslationKey)}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      </PullToRefreshContainer>
    </PortalLayout>
  )
}

