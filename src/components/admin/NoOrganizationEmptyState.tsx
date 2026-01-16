import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../platformAdmin'

export function NoOrganizationEmptyState() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: 'var(--pa-space-9) var(--pa-space-5)' }}>
      <EmptyState
        icon="business"
        title="NO ORGANIZATION FOUND"
        description="You haven't set up an organization yet. Create your first organization to get started with TeamHub."
        action={
          <div style={{ display: 'flex', gap: 'var(--pa-space-3)', justifyContent: 'center' }}>
            <button
              className="pa-btn pa-btn--primary"
              onClick={() => navigate('/admin/onboarding')}
            >
              Set Up Organization
            </button>
          </div>
        }
      />
    </div>
  )
}
