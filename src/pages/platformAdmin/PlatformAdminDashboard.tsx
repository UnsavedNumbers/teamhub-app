import { useAuth } from '../../hooks/useAuth'

export default function PlatformAdminDashboard() {
  const { profile } = useAuth()

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Platform Admin</h1>
      <p style={{ margin: 0 }}>
        Signed in as <strong>{profile?.email ?? 'unknown'}</strong>
      </p>
      <p style={{ marginTop: 12, color: '#555' }}>
        This is the entry point for platform-wide management (all orgs, global payments, stats, catalogs).
      </p>
    </div>
  )
}

