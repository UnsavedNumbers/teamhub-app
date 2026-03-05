import type { Organization } from '../../../contexts/OrganizationContext'
import { hasAnyRole } from '../../../utils/roleHelpers'
import type { TeamDetailPermissions } from './types'

interface PermissionArgs {
  currentOrganization: Organization | null | undefined
  medicalFeatureEnabled: boolean
}

export function getTeamDetailPermissions({
  currentOrganization,
  medicalFeatureEnabled,
}: PermissionArgs): TeamDetailPermissions {
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])
  const isCoach = hasAnyRole(currentOrganization, ['coach'])

  return {
    isCoach,
    isOrgAdmin,
    canEditRosterFields: isOrgAdmin || isCoach,
    canEditProfileBasics: isOrgAdmin,
    canEditUniversalFields: isOrgAdmin,
    canEditSports: isOrgAdmin,
    canViewOtherTeams: isOrgAdmin || isCoach,
    canViewOtherSports: isOrgAdmin || isCoach,
    canViewGuardians: isOrgAdmin,
    canManageGuardians: isOrgAdmin,
    canViewMedical: medicalFeatureEnabled && isOrgAdmin,
    canManageMedical: medicalFeatureEnabled && isOrgAdmin,
    canViewPayments: isOrgAdmin,
    canManageCoaches: isOrgAdmin,
    canManageSettings: isOrgAdmin,
    canViewMedia: true,
  }
}

