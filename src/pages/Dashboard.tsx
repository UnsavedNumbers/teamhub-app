import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import GuardianDashboardContent from './portal/GuardianDashboardContent'
import AthleteDashboardContent from './portal/AthleteDashboardContent'

/**
 * Portal dashboard: role-aware workspace content.
 * Renders Guardian or Athlete dashboard (action cards, hero, activity, charts, feed).
 * Layout (header + sidebar) is provided by PortalWorkspaceLayout in App.
 */
export default function Dashboard() {
  const { hasAnyRole } = useAuth()
  const isGuardian = hasAnyRole('parent')
  const isAthlete = hasAnyRole('athlete')

  const Content = useMemo(() => {
    if (isAthlete && !isGuardian) return AthleteDashboardContent
    return GuardianDashboardContent
  }, [isGuardian, isAthlete])

  return <Content />
}
