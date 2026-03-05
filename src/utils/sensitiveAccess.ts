export type SensitiveDataKind = 'medical' | 'pii'
export type SensitiveDataAction = 'read' | 'update'

export interface SensitiveAthleteAccess {
  athleteId: string
  orgId: string | null
  orgMembershipVerified: boolean
  teamLinked: boolean
  guardianLinked: boolean
  athleteLinked: boolean
  orgAdmin: boolean
  staffCanViewPii: boolean
  staffCanViewMedical: boolean
  coachCanViewPii: boolean
  coachCanViewMedical: boolean
  canViewPii: boolean
  canViewMedical: boolean
  canUpdateMedical: boolean
}

export function createDeniedSensitiveAthleteAccess(
  athleteId: string,
  orgId: string | null = null
): SensitiveAthleteAccess {
  return {
    athleteId,
    orgId,
    orgMembershipVerified: false,
    teamLinked: false,
    guardianLinked: false,
    athleteLinked: false,
    orgAdmin: false,
    staffCanViewPii: false,
    staffCanViewMedical: false,
    coachCanViewPii: false,
    coachCanViewMedical: false,
    canViewPii: false,
    canViewMedical: false,
    canUpdateMedical: false,
  }
}

export function canAccessSensitiveData(
  access: SensitiveAthleteAccess | null | undefined,
  kind: SensitiveDataKind,
  action: SensitiveDataAction = 'read'
): boolean {
  if (!access || !access.orgMembershipVerified) {
    return false
  }

  if (kind === 'medical') {
    if (action === 'update') {
      return access.canUpdateMedical === true
    }
    return access.canViewMedical === true
  }

  if (action !== 'read') {
    return false
  }

  return access.canViewPii === true
}
