/**
 * Follow Button Component
 * 
 * Button to follow/unfollow an organization.
 */

import { useState } from 'react'
import { followOrg, unfollowOrg } from '../../data/services/fanService'
import { showSuccess, showError } from '../../utils/toast'
import Button from '../portal/Button'
import { useI18n } from '../../i18n/useI18n'

interface FollowButtonProps {
  orgId: string
  isFollowing: boolean
  onToggle?: (isFollowing: boolean) => void
  variant?: 'default' | 'compact'
  className?: string
}

export default function FollowButton({ 
  orgId, 
  isFollowing: initialFollowing, 
  onToggle,
  variant = 'default',
  className = ''
}: FollowButtonProps) {
  const { t } = useI18n()
  const [isFollowing, setIsFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)

    try {
      if (isFollowing) {
        const { error } = await unfollowOrg(orgId)
        if (error) {
          showError(error.message || t('portal.fan.followedOrgs.unfollowFailed'))
          return
        }
        setIsFollowing(false)
        showSuccess(t('portal.fan.followedOrgs.unfollowSuccess'))
        onToggle?.(false)
      } else {
        const { error } = await followOrg(orgId, 'manual')
        if (error) {
          showError(error.message || t('portal.fan.followedOrgs.followFailed'))
          return
        }
        setIsFollowing(true)
        showSuccess(t('portal.fan.followedOrgs.followSuccess'))
        onToggle?.(true)
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('portal.fan.followedOrgs.updateStatusFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'primary'}
      onClick={handleToggle}
      disabled={loading}
      className={`${variant === 'compact' ? 'px-4 py-2 text-xs' : ''} ${className}`}
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined animate-spin inline-block mr-1">hourglass_empty</span>
          {isFollowing ? t('portal.fan.followedOrgs.unfollowing') : t('portal.fan.followedOrgs.followingLoading')}
        </>
      ) : isFollowing ? (
        <>
          <span className="material-symbols-outlined inline-block mr-1">check</span>
          {t('portal.fan.followedOrgs.following')}
        </>
      ) : (
        <>
          <span className="material-symbols-outlined inline-block mr-1">add</span>
          {t('portal.fan.followedOrgs.follow')}
        </>
      )}
    </Button>
  )
}
