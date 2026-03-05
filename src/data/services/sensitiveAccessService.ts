import { supabase } from '../../lib/supabase'
import {
  createDeniedSensitiveAthleteAccess,
  type SensitiveAthleteAccess,
} from '../../utils/sensitiveAccess'

interface SensitiveAccessResponse {
  data: SensitiveAthleteAccess
  error: Error | null
}

export async function getAthleteSensitiveAccess(
  athleteId: string,
  orgId?: string | null
): Promise<SensitiveAccessResponse> {
  if (!athleteId) {
    return {
      data: createDeniedSensitiveAthleteAccess(''),
      error: new Error('athleteId is required'),
    }
  }

  try {
    const { data, error } = await supabase.rpc('get_athlete_sensitive_access' as any, {
      p_athlete_id: athleteId,
      p_org_id: orgId ?? null,
    })

    if (error) {
      throw error
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return {
        data: createDeniedSensitiveAthleteAccess(athleteId, orgId ?? null),
        error: null,
      }
    }

    return {
      data: {
        athleteId: row.athlete_id,
        orgId: row.org_id ?? null,
        orgMembershipVerified: row.org_membership_verified === true,
        teamLinked: row.team_linked === true,
        guardianLinked: row.guardian_linked === true,
        athleteLinked: row.athlete_linked === true,
        orgAdmin: row.org_admin === true,
        staffCanViewPii: row.staff_can_view_pii === true,
        staffCanViewMedical: row.staff_can_view_medical === true,
        coachCanViewPii: row.coach_can_view_pii === true,
        coachCanViewMedical: row.coach_can_view_medical === true,
        canViewPii: row.can_view_pii === true,
        canViewMedical: row.can_view_medical === true,
        canUpdateMedical: row.can_update_medical === true,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: createDeniedSensitiveAthleteAccess(athleteId, orgId ?? null),
      error: err instanceof Error ? err : new Error('Failed to load sensitive access'),
    }
  }
}
