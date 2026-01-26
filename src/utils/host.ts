export type HostAppContext = 'platform' | 'platform-admin' | 'unknown'

export function getHostAppContext(hostname: string = window.location.hostname): HostAppContext {
  const host = hostname.toLowerCase()

  // admin.youthsports.team => platform admins
  if (host.startsWith('admin.')) return 'platform-admin'

  // platform.youthsports.team => end-user platform (parents) + org admin at /admin
  if (host.startsWith('platform.')) return 'platform'

  return 'unknown'
}

/**
 * Get the current base URL for email redirects and links
 * Uses window.location.origin to support localhost development
 * and production domains automatically
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Fallback for SSR (shouldn't happen in this app, but safe default)
  return 'https://platform.youthsports.team'
}

