/**
 * VideoShareModal Component
 * 
 * Modal for sharing videos via link with expiration options.
 * Supports copying link, email sharing, and revoking existing shares.
 */

import { useState, useCallback, useMemo } from 'react'
import { useVideoShares, type ShareExpiration } from '@/hooks/useVideosExtended'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { cn } from '@/utils/cn'
import { showSuccess, showError } from '@/utils/toast'
import { t } from '@/i18n'
import { USE_FAKE_DATA } from '@/data/config'

interface VideoShareModalProps {
  isOpen: boolean
  onClose: () => void
  videoId: string
  videoTitle: string
}

const EXPIRATION_OPTIONS: { value: ShareExpiration; label: string }[] = [
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'Never expires' },
]

export default function VideoShareModal({
  isOpen,
  onClose,
  videoId,
  videoTitle
}: VideoShareModalProps) {
  const { shares, isLoading, createShare, revokeShare } = useVideoShares({ 
    videoId, 
    enabled: isOpen 
  })

  const [expiration, setExpiration] = useState<ShareExpiration>('7d')
  const [allowDownload, setAllowDownload] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [shareIdToRevoke, setShareIdToRevoke] = useState<string | null>(null)

  // Filter active (non-revoked, non-expired) shares
  const activeShares = useMemo(() => {
    const now = new Date()
    return shares.filter(share => 
      !share.revoked_at && 
      (!share.expires_at || new Date(share.expires_at) > now)
    )
  }, [shares])

  const handleCreateShare = useCallback(async () => {
    setIsCreating(true)
    try {
      if (USE_FAKE_DATA) {
        // Demo mode: show fake success
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate delay
        const fakeShareUrl = `${window.location.origin}/share/video/demo-token-${Date.now()}`
        await navigator.clipboard.writeText(fakeShareUrl)
        showSuccess(t('videoLibrary.shareLink.linkCopied'))
        setEmailRecipients('')
        setActiveTab('manage')
        setIsCreating(false)
        return
      }

      const emails = emailRecipients
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'))

      const share = await createShare({
        expiration,
        allowDownload,
        emailRecipients: emails.length > 0 ? emails : undefined,
      })

      if (share) {
        const shareUrl = `${window.location.origin}/share/video/${share.token}`
        await navigator.clipboard.writeText(shareUrl)
        showSuccess(t('videoLibrary.shareLink.linkCopied'))
        setEmailRecipients('')
        setActiveTab('manage')
      } else {
        showError('Failed to create share link')
      }
    } finally {
      setIsCreating(false)
    }
  }, [expiration, allowDownload, emailRecipients, createShare])

  const handleCopyLink = useCallback(async (share: typeof shares[0]) => {
    const shareUrl = `${window.location.origin}/share/video/${share.token}`
    await navigator.clipboard.writeText(shareUrl)
    setCopiedId(share.id)
    showSuccess(t('videoLibrary.shareLink.linkCopied'))
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleRevokeClick = useCallback((shareId: string) => {
    setShareIdToRevoke(shareId)
  }, [])

  const handleConfirmRevoke = useCallback(async () => {
    if (!shareIdToRevoke) return
    const success = await revokeShare(shareIdToRevoke)
    if (success) {
      showSuccess(t('videoLibrary.shareLink.revoked'))
    } else {
      showError('Failed to revoke share link')
    }
    setShareIdToRevoke(null)
  }, [shareIdToRevoke, revokeShare])

  const formatExpiration = (expiresAt: string | null): string => {
    if (!expiresAt) return 'Never'
    const date = new Date(expiresAt)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 1) return 'Expires soon'
    if (diffHours < 24) return `${diffHours}h remaining`
    if (diffDays < 7) return `${diffDays}d remaining`
    return date.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{t('videoLibrary.shareLink.title')}</h3>
            <p className="text-sm text-gray-500 mt-1 truncate max-w-xs">{videoTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Icon name="close" size="text-xl" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors",
              activeTab === 'create'
                ? "text-[var(--org-btn-primary-bg)] border-b-2 border-[var(--org-btn-primary-bg)]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Create Link
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors relative",
              activeTab === 'manage'
                ? "text-[var(--org-btn-primary-bg)] border-b-2 border-[var(--org-btn-primary-bg)]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Manage
            {activeShares.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-[var(--org-btn-primary-bg)] text-white rounded-full">
                {activeShares.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('videoLibrary.shareLink.description')}
              </p>

              {/* Expiration */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.shareLink.expiration')}
                </label>
                <select
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value as ShareExpiration)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  {EXPIRATION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allow Download */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  className="size-5 rounded border-gray-300 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)]"
                />
                <span className="text-sm font-medium">
                  {t('videoLibrary.shareLink.allowDownload')}
                </span>
              </label>

              {/* Email Recipients (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Email Recipients (Optional)
                </label>
                <input
                  type="text"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Comma-separated email addresses to notify (optional)
                </p>
              </div>

              {/* Create Button */}
              <Button
                variant="primary"
                className="w-full"
                onClick={handleCreateShare}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Icon name="sync" size="text-lg" className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Icon name="link" size="text-lg" className="mr-2" />
                    {t('videoLibrary.shareLink.generateLink')}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  ))}
                </div>
              ) : activeShares.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="link_off" size="text-4xl" className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No active share links</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-2 text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                activeShares.map(share => (
                  <div
                    key={share.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500 truncate">
                            ...{share.token.slice(-12)}
                          </span>
                          {share.allow_download && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
                              DOWNLOAD
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Icon name="schedule" size="text-xs" className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatExpiration(share.expires_at)}
                          </span>
                          {share.access_count > 0 && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs text-gray-500">
                                {share.access_count} view{share.access_count !== 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyLink(share)}
                          className="p-2 text-gray-400 hover:text-[var(--org-btn-primary-bg)] transition-colors"
                          title={t('videoLibrary.shareLink.copyLink')}
                        >
                          <Icon 
                            name={copiedId === share.id ? "check" : "content_copy"} 
                            size="text-lg" 
                          />
                        </button>
                        <button
                          onClick={() => handleRevokeClick(share.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title={t('videoLibrary.shareLink.revokeLink')}
                        >
                          <Icon name="delete" size="text-lg" />
                        </button>
                      </div>
                    </div>
                    {share.email_recipients && share.email_recipients.length > 0 && (
                      <div className="text-xs text-gray-400">
                        Shared with: {share.email_recipients.join(', ')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={shareIdToRevoke !== null}
      title={t('videoLibrary.shareLink.revokeConfirmTitle')}
      description={t('videoLibrary.shareLink.revokeConfirm')}
      confirmLabel={t('videoLibrary.shareLink.revokeLink')}
      cancelLabel={t('common.cancel')}
      variant="danger"
      onConfirm={handleConfirmRevoke}
      onCancel={() => setShareIdToRevoke(null)}
    />
    </>
  )
}
