import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useOrganization } from '../contexts/OrganizationContext'
import { useLicense } from '../hooks/useLicense'
import { EmptyState } from './platformAdmin'

interface LicenseGateProps {
  children: ReactNode
  requiredAction?: string
}

export function LicenseGate({ children }: LicenseGateProps) {
  const { currentOrganization } = useOrganization()
  const { summary, loading } = useLicense(currentOrganization?.id)

  if (loading) {
    return (
      <div className="pa-flex pa-items-center pa-justify-center" style={{ minHeight: '400px' }}>
        <div className="pa-skeleton" style={{ width: '100%', height: '300px' }} />
      </div>
    )
  }

  if (!summary || !summary.isValid) {
    return (
      <div style={{ padding: 'var(--pa-space-9) var(--pa-space-5)' }}>
        <EmptyState
          icon="lock"
          title="SUBSCRIPTION REQUIRED"
          description="Access to this feature requires an active subscription. Please update your billing information or start a trial."
          action={
            <Link to="/admin/organization/billing" className="pa-btn pa-btn--primary">
              View Billing & Plans
            </Link>
          }
        />
      </div>
    )
  }

  return <>{children}</>
}
