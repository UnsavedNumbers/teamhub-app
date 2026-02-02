import { GalleryManagementSection } from '@/components/admin/galleries/GalleryManagementSection'
import { Card, PageHeader, StatCard } from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useMemo } from 'react'

export default function AdminPhotos() {
  const { context } = useUserContext()
  const orgName = useMemo(() => context?.org?.name || 'Organization', [context])

  return (
    <div className="pa-root">
      <div className="pa-container pa-space-y-4">
        <PageHeader
          title="Media Library"
          description="Create and manage galleries across teams, athletes, events, travel, seasons, and programs."
        />

        <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-3 pa-gap-3">
          <StatCard label="Org" value={orgName} />
          <StatCard label="Roles" value={(context?.roles || []).join(', ') || '—'} />
          <Card className="pa-card pa-text-sm pa-text-muted">
            Galleries are scoped to your organization. Coaches and org admins can create and manage all galleries.
          </Card>
        </div>

        <GalleryManagementSection title="All galleries" allowCreate />
      </div>
    </div>
  )
}
