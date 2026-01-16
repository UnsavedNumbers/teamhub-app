import { Badge } from '../platformAdmin'

interface LicenseStatusBadgeProps {
  status: string
}

export function LicenseStatusBadge({ status }: LicenseStatusBadgeProps) {
  const getVariant = (): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success'
      case 'trial':
        return 'info'
      case 'expired':
        return 'danger'
      case 'grace_period':
        return 'warning'
      case 'suspended':
        return 'danger'
      default:
        return 'neutral'
    }
  }

  return (
    <Badge variant={getVariant()} title={`License Status: ${status}`}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  )
}
