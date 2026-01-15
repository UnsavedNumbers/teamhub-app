export type HostAppContext = 'platform' | 'platform-admin' | 'unknown'

export function getHostAppContext(hostname: string = window.location.hostname): HostAppContext {
  const host = hostname.toLowerCase()

  // admin.youthsports.team => platform admins
  if (host.startsWith('admin.')) return 'platform-admin'

  // platform.youthsports.team => end-user platform (parents) + org admin at /admin
  if (host.startsWith('platform.')) return 'platform'

  return 'unknown'
}

