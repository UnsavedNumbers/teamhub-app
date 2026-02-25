/**
 * Followed Organizations Page
 * 
 * Lists all organizations the user is following.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFollowedOrgs, unfollowOrg } from '../../data/services/fanService'
import { showSuccess, showError } from '../../utils/toast'
import PortalLayout from '../../components/portal/PortalLayout'
import { PageTitle } from '../../components/portal/Typography'
import Card from '../../components/portal/Card'
import Button from '../../components/portal/Button'
import Icon from '../../components/portal/Icon'
import EmptyState from '../../components/portal/EmptyState'
import { getLink } from '../../utils/routes'
import { useI18n } from '../../i18n/useI18n'
import type { FanOrgFollow } from '../../types/staffAndFan'

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FollowedOrgs() {
  useDebugLifecycle('FollowedOrgs')
  
  const { t } = useI18n()
  const tAny = t as any
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [orgToUnfollow, setOrgToUnfollow] = useState<{id: string, name: string} | null>(null)
  const [unfollowLoading, setUnfollowLoading] = useState(false)

  // Data Query
  const { data: follows, isLoading } = useQuery({
    queryKey: ['followed-orgs'],
    queryFn: async () => {
      const { data, error } = await getFollowedOrgs()
      if (error) throw error
      return data || []
    },
  })

  // Handlers
  const initiateUnfollow = (follow: FanOrgFollow) => {
    setOrgToUnfollow({ 
      id: follow.org_id, 
      name: follow.org?.name || t('portal.fan.followedOrgs.unknownOrg') 
    })
    setConfirmOpen(true)
  }

  const handleConfirmUnfollow = async () => {
    if (!orgToUnfollow) return
    
    setUnfollowLoading(true)
    try {
      const { error } = await unfollowOrg(orgToUnfollow.id)
      
      if (error) {
        showError(error.message || t('portal.fan.followedOrgs.unfollowFailed'))
        // Keep modal open on error to allow retry
      } else {
        showSuccess(t('portal.fan.followedOrgs.unfollowSuccess'))
        queryClient.invalidateQueries({ queryKey: ['followed-orgs'] })
        setConfirmOpen(false)
        setOrgToUnfollow(null)
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('portal.fan.followedOrgs.unfollowFailed'))
    } finally {
      setUnfollowLoading(false)
    }
  }

  const handleCloseModal = () => {
    if (unfollowLoading) return
    setConfirmOpen(false)
    setOrgToUnfollow(null)
  }

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 relative">
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
              <Card key={follow.id} className="p-6 transition-shadow hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {follow.org?.name || t('portal.fan.followedOrgs.unknownOrg')}
                    </h3>
                    {follow.org?.slug && (
                      <Link
                        to={getLink('portal.orgLanding', { orgSlug: follow.org.slug })}
                        className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                      >
                        {tAny('View public page') || 'View public page'} <Icon name="arrow_forward" className="ml-1 text-base" />
                      </Link>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => initiateUnfollow(follow)}
                    className="flex-shrink-0"
                  >
                    <Icon name="close" className="mr-2" />
                    {t('portal.fan.followedOrgs.unfollow') || 'Unfollow'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon="explore"
              title={t('portal.fan.followedOrgs.emptyTitle')}
              description={t('portal.fan.followedOrgs.emptyDescription')}
              action={{
                label: t('portal.fan.followedOrgs.browseEvents'),
                onClick: () => navigate(getLink('portal.tickets')),
                icon: 'search',
              }}
            />
          </Card>
        )}

        {/* Confirmation Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={handleCloseModal}
            />
            
            {/* Modal Content */}
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Unfollow Organization
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to unfollow <span className="font-semibold text-gray-900 dark:text-white">{orgToUnfollow?.name}</span>? 
                You will stop receiving updates and notifications from this organization.
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="secondary" 
                  onClick={handleCloseModal}
                  disabled={unfollowLoading}
                >
                  Cancel
                </Button>
                <button
                  className="px-6 py-2 rounded font-bold text-sm tracking-wide transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                  onClick={handleConfirmUnfollow}
                  disabled={unfollowLoading}
                >
                  {unfollowLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin mr-2 text-sm">rotate_right</span>
                      Unfollowing...
                    </>
                  ) : (
                    'Unfollow'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
