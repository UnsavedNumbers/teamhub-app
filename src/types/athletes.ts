import type { Athlete } from './family'

/**
 * Current team information for an athlete
 */
export interface CurrentTeam {
  teamId: string
  teamName: string
  seasonId: string
}

/**
 * Athlete with enriched team information
 */
export interface AthleteWithTeams extends Athlete {
  age: number | null
  currentTeams: CurrentTeam[]
}

/**
 * Parameters for searching athletes
 */
export interface SearchAthletesParams {
  search?: string
  limit?: number
  ageMin?: number
  ageMax?: number
  levelId?: string
  programId?: string
  seasonId?: string
  excludeTeamId?: string  // Exclude athletes already on this team
  excludeSeasonId?: string // Exclude athletes already on team for this season
}

/**
 * Response from searchAthletes service
 */
export interface SearchAthletesResponse {
  data: AthleteWithTeams[]
  error: Error | null
}

/**
 * Result from adding athletes to team
 */
export interface AddAthletesToTeamResult {
  added: string[]
  skipped: string[]
  errors: Array<{ athleteId: string; error: string }>
}

/**
 * Response from addAthletesToTeam service
 */
export interface AddAthletesToTeamResponse {
  data: AddAthletesToTeamResult | null
  error: Error | null
}

/**
 * Filter state for the modal component
 */
export interface FilterState {
  search: string
  ageMin?: number
  ageMax?: number
  levelId?: string
  programId?: string
}

/**
 * Props for AddExistingAthleteModal component
 */
export interface AddExistingAthleteModalProps {
  open: boolean
  onClose: () => void
  teamId: string
  seasonId: string
  onSuccess: () => void  // Callback to refresh roster
}
