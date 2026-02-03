/**
 * Bookmarked Events Page
 * 
 * Lists all events the user has bookmarked.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBookmarkedEvents, removeBookmark } from '../../data/services/fanService'
import { showSuccess, showError } from '../../utils/toast'
import PortalLayout from '../../components/portal/PortalLayout'
import { PageTitle } from '../../components/portal/Typography'
import Card from '../../components/portal/Card'
import Button from '../../components/portal/Button'
import Icon from '../../components/portal/Icon'
import { formatEventDate, formatEventTimeRange } from '../../types/calendar'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n'

export default function BookmarkedEvents() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ['bookmarked-events'],
    queryFn: async () => {
      const { data, error } = await getBookmarkedEvents()
      if (error) throw error
      return data || []
    },
  })

  const handleRemoveBookmark = async (eventId: string) => {
    const { error } = await removeBookmark(eventId)
    if (error) {
      showError(error.message || t('portal.fan.bookmarkedEvents.removeFailed'))
      return
    }

    showSuccess(t('portal.fan.bookmarkedEvents.removeSuccess'))
    queryClient.invalidateQueries({ queryKey: ['bookmarked-events'] })
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageTitle>{t('portal.fan.bookmarkedEvents.title')}</PageTitle>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('portal.fan.bookmarkedEvents.description')}
        </p>

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
          <div className="space-y-4">
            {bookmarks.map((bookmark) => {
              const event = bookmark.event
              if (!event) return null

              return (
                <Card key={bookmark.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {event.title}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Icon name="calendar_today" className="text-base" />
                          {formatEventDate(event.start_time, (event as any).timezone || 'UTC')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon name="schedule" className="text-base" />
                          {formatEventTimeRange(event.start_time, event.end_time, (event as any).timezone || 'UTC')}
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
                        onClick={() => navigate(`/portal/calendar/events/${event.id}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleRemoveBookmark(bookmark.event_id)}
                      >
                        <Icon name="bookmark" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Icon name="bookmark_border" className="text-6xl text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('portal.fan.bookmarkedEvents.emptyTitle')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('portal.fan.bookmarkedEvents.emptyDescription')}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/portal/calendar')}
            >
              {t('portal.fan.bookmarkedEvents.viewCalendar')}
            </Button>
          </Card>
        )}
      </div>
    </PortalLayout>
  )
}
