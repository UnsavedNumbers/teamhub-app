/**
 * Public URL Banner Component
 * 
 * Displays public org-scoped URLs with copy functionality.
 * Shows loading state, handles no-slug case, and supports single or multiple URLs.
 * Used across ticketing and settings pages to show admins where to direct users.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getPublicBaseUrl } from '@/utils/publicUrls'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { getLink, RouteKeys } from '@/utils/routes'

// Query key constant for slug fetches (ensures cache consistency)
export const QUERY_KEY_ORG_SLUG = 'org-slug'

interface PublicUrlLink {
  label: string
  path: string
}

interface PublicUrlBannerProps {
  orgId: string
  title?: string
  description?: string
  // Single URL mode
  path?: string
  // Multi-URL mode (for Settings)
  links?: PublicUrlLink[]
  // Link to show when slug is not set
  setSlugLinkText?: string
}

export default function PublicUrlBanner({
  orgId,
  title = 'Direct users here',
  description,
  path,
  links,
  setSlugLinkText = 'Set your organization slug in Organization setup to get public links.',
}: PublicUrlBannerProps) {
  // Track which URL was copied (for multi-URL case)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  // Fetch org slug
  const { data: orgSlug, isLoading: slugLoading } = useQuery({
    queryKey: [QUERY_KEY_ORG_SLUG, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', orgId)
        .maybeSingle()

      if (error || !data?.slug) {
        return null
      }

      return data.slug
    },
    enabled: !!orgId,
  })

  // Determine which URLs to show
  const urlEntries: PublicUrlLink[] = links || (path ? [{ label: title, path }] : [])

  // Loading state
  if (slugLoading) {
    return (
      <div className="pa-card">
        <h3 className="pa-card-title">{title}</h3>
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    )
  }

  // No slug state
  if (!orgSlug) {
    return (
      <div className="pa-card">
        <h3 className="pa-card-title">{title}</h3>
        {description && <p className="text-gray-600 text-sm mb-4">{description}</p>}
        <p className="text-gray-500 text-sm mb-2">{setSlugLinkText}</p>
        <Link
          to={getLink(RouteKeys.ADMIN_ONBOARDING)}
          className="pa-button pa-button-sm pa-button-secondary"
        >
          Go to Organization Setup
        </Link>
      </div>
    )
  }

  // Render URL(s)
  return (
    <div className="pa-card">
      <h3 className="pa-card-title">{title}</h3>
      {description && <p className="text-gray-600 text-sm mb-4">{description}</p>}
      
      <div className="space-y-3">
        {urlEntries.map((entry) => (
          <PublicUrlRow
            key={entry.path}
            label={entry.label}
            path={entry.path}
            slug={orgSlug}
            copiedPath={copiedPath}
            onCopied={(path) => {
              setCopiedPath(path)
              setTimeout(() => setCopiedPath(null), 2000)
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface PublicUrlRowProps {
  label: string
  path: string
  slug: string
  copiedPath: string | null
  onCopied: (path: string) => void
}

function PublicUrlRow({ label, path, slug, copiedPath, onCopied }: PublicUrlRowProps) {
  const { copy } = useCopyToClipboard()
  const publicUrl = getPublicBaseUrl(slug, path)
  const isCopied = copiedPath === path

  const handleCopy = async () => {
    const success = await copy(publicUrl)
    if (success) {
      onCopied(path)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</div>
        <input
          type="text"
          readOnly
          value={publicUrl}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-mono"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className={`pa-button pa-button-sm ${isCopied ? 'pa-button-success' : 'pa-button-primary'}`}
        aria-label={`Copy ${label.toLowerCase()} URL`}
      >
        {isCopied ? (
          <>
            <span className="material-symbols-outlined text-sm mr-1">check</span>
            Copied!
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-sm mr-1">content_copy</span>
            Copy
          </>
        )}
      </button>
    </div>
  )
}
