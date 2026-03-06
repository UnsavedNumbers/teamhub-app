/**
 * Bookmarked Events Page
 * 
 * Lists all events the user has bookmarked.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { getBookmarkedEvents, removeBookmark } from '../../data/services/fanService'
import { showSuccess, showError } from '../../utils/toast'
import PortalLayout from '../../components/portal/PortalLayout'
import { PageTitle } from '../../components/portal/Typography'
import Card from '../../components/portal/Card'
import Button from '../../components/portal/Button'
import Icon from '../../components/portal/Icon'
import EmptyState from '../../components/portal/EmptyState'
import PullToRefreshContainer from '../../components/common/mobile/PullToRefreshContainer'
import CollapsibleHeader from '../../components/common/mobile/CollapsibleHeader'
import GroupedList from '../../components/common/mobile/GroupedList'
import SwipeableRow from '../../components/common/mobile/SwipeableRow'
import { useMobile } from '../../hooks/useMobile'
import { formatEventDate, formatEventTimeRange } from '../../types/calendar'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n'
import { getLink, RouteKeys } from '../../utils/routes'
import { FanEventBookmark } from '../../types/staffAndFan'

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function BookmarkedEvents() {
  useDebugLifecycle('BookmarkedEvents')
  
  const { t } = useI18n()
  const tAny = t as any
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isMobile = useMobile()
  
  const { data: bookmarks, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bookmarked-events'],
    queryFn: async () => {
      const { data, error } = await getBookmarkedEvents()
      if (error) throw error
      return data || []
    },
  })

  const { mutate: deleteBookmark, isPending: isDeleting } = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await removeBookmark(eventId)
      if (error) throw error
    },
    onSuccess: () => {
      showSuccess(t('portal.fan.bookmarkedEvents.removeSuccess'))
      queryClient.invalidateQueries({ queryKey: ['bookmarked-events'] })
    },
    onError: (error) => {
      showError(error instanceof Error ? error.message : t('portal.fan.bookmarkedEvents.removeFailed'))
    },
  })

  const handleRetry = () => {
    refetch()
  }

  if (isError) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: t('common.home'), path: getLink('portal.dashboard') },
          { label: t('portal.fan.bookmarkedEvents.title') },
        ]}
      >
        <div className="mb-6 sm:mb-8">
          <PageTitle>{t('portal.fan.bookmarkedEvents.title')}</PageTitle>
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide mt-1">
            {t('portal.fan.bookmarkedEvents.description')}
          </p>
        </div>
        <Card className="p-8 text-center border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <Icon name="error_outline" className="text-4xl text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
            {t('toast.error.loadFailed')}
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-6">
            {error instanceof Error ? error.message : t('errors.unknownError')}
          </p>
          <Button variant="primary" onClick={handleRetry}>
            {tAny('common.actions.retry')}
          </Button>
        </Card>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: t('common.home'), path: getLink('portal.dashboard') },
        { label: t('portal.fan.bookmarkedEvents.title') },
      ]}
    >
      <PullToRefreshContainer onRefresh={async () => { await refetch() }}>
      <div className="mb-6 sm:mb-8">
        {isMobile ? (
          <CollapsibleHeader
            title={t('portal.fan.bookmarkedEvents.title')}
            mode="large"
            scrollContainerSelector=".portal-workspace-main"
          />
        ) : (
          <PageTitle>{t('portal.fan.bookmarkedEvents.title')}</PageTitle>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide mt-1">
          {t('portal.fan.bookmarkedEvents.description')}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      ) : bookmarks && bookmarks.length > 0 ? (
        <GroupedList
          stickyHeaders
          sections={[{ id: 'bookmarks', header: t('portal.fan.bookmarkedEvents.title'), items: bookmarks as FanEventBookmark[] }]}
          renderItem={(bookmark) => {
            const event = bookmark.event
            if (!event) return null

            return (
              <SwipeableRow
                key={bookmark.id}
                rightActions={[
                  {
                    id: `${bookmark.id}-remove`,
                    label: t('common.remove'),
                    tone: 'danger',
                    onSelect: () => deleteBookmark(bookmark.event_id),
                  },
                ]}
              >
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-2 leading-[1.2]">
                      {event.title}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Icon name="calendar_today" className="text-base" />
                        {formatEventDate(event.start_time, event.timezone || 'UTC')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="schedule" className="text-base" />
                        {formatEventTimeRange(event.start_time, event.end_time, event.timezone || 'UTC')}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <Icon name="location_on" className="text-base" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="primary"
                      onClick={() => navigate(getLink(RouteKeys.PORTAL_EVENT_DETAIL, { eventId: event.id }))}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={isDeleting}
                      onClick={() => deleteBookmark(bookmark.event_id)}
                    >
                      <Icon name="bookmark" />
                    </Button>
                  </div>
                </div>
              </Card>
              </SwipeableRow>
            )
          }}
        />
      ) : (
        <Card>
          <EmptyState
            icon="bookmark_border"
            title={t('portal.fan.bookmarkedEvents.emptyTitle')}
            description={t('portal.fan.bookmarkedEvents.emptyDescription')}
            action={{
              label: t('portal.fan.bookmarkedEvents.viewCalendar'),
              onClick: () => navigate(getLink(RouteKeys.PORTAL_CALENDAR)),
            }}
          />
        </Card>
      )}
      </PullToRefreshContainer>
    </PortalLayout>
  )
}

