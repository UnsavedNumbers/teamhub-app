/**
 * EditAthletePortal Component
 *
 * DEPRECATED: This page has been replaced by the comprehensive AthleteProfile page.
 * Redirects to /portal/athletes/:id/profile
 */

import { Navigate, useParams } from 'react-router-dom'

export default function EditAthletePortal() {
  const { id } = useParams<{ id: string }>()
  
  if (!id) {
    return <Navigate to="/portal/athletes" replace />
  }
  
  return <Navigate to={`/portal/athletes/${id}/profile`} replace />
}
