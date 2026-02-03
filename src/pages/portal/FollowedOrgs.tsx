/**
 * Followed Organizations Page
 * 
 * Lists all organizations the user is following.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFollowedOrgs, unfollowOrg } from '../../data/services/fanService'
import { showSuccess, showError } from '../../utils/toast'
import PortalLayout from '../../components/portal/PortalLayout'
import { PageTitle } from '../../components/portal/Typography'
import Card from '../../components/portal/Card'
import Button from '../../components/portal/Button'
import Icon from '../../components/portal/Icon'
import { getLink } from '../../utils/routes'
import { useI18n } from '../../i18n/useI18n'

export default function FollowedOrgs() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { data: follows, isLoading } = useQuery({
    queryKey: ['followed-orgs'],
    queryFn: async () => {
      const { data, error } = await getFollowedOrgs()
      if (error) throw error
      return data || []
    },
  })

  const handleUnfollow = async (orgId: string) => {
    if (!confirm(t('portal.fan.followedOrgs.unfollowConfirm'))) return

    const { error } = await unfollowOrg(orgId)
    if (error) {
      showError(error.message || t('portal.fan.followedOrgs.unfollowFailed'))
      return
    }

    showSuccess(t('portal.fan.followedOrgs.unfollowSuccess'))
    queryClient.invalidateQueries({ queryKey: ['followed-orgs'] })
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageTitle>{t('portal.fan.followedOrgs.title')}</PageTitle>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('portal.fan.followedOrgs.description')}
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
        ) : follows && follows.length > 0 ? (
          <div className="space-y-4">
            {follows.map((follow) => (
              <Card key={follow.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {follow.org?.name || t('portal.fan.followedOrgs.unknownOrg')}
                    </h3>
                    {follow.org?.slug && (
                      <a
                        href={getLink('portal.orgLanding', { slug: follow.org.slug })}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        View public page →
                      </a>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleUnfollow(follow.org_id)}
                  >
                    <Icon name="close" />
                    Unfollow
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Icon name="explore" className="text-6xl text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('portal.fan.followedOrgs.emptyTitle')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('portal.fan.followedOrgs.emptyDescription')}
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.href = getLink('portal.tickets')}
            >
              {t('portal.fan.followedOrgs.browseEvents')}
            </Button>
          </Card>
        )}
      </div>
    </PortalLayout>
  )
}
