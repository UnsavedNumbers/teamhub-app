/**
 * Organization Structure - Context & Routing
 *
 * Manages the navigation and state for the organizational hierarchy view.
 * Each section (Sports, Programs, Levels, Teams, Seasons, People) has:
 * - Contextual breadcrumbs
 * - Inherited upstream selections
 * - Guided empty states
 */

import { createContext, ReactNode, useState } from 'react'

export interface OrganizationStructureContext {
  // Current selections in the hierarchy
  selectedSportId?: string
  selectedProgramId?: string
  selectedLevelId?: string
  selectedTeamId?: string
  selectedSeasonId?: string

  // Setters
  selectSport: (id?: string) => void
  selectProgram: (id?: string) => void
  selectLevel: (id?: string) => void
  selectTeam: (id?: string) => void
  selectSeason: (id?: string) => void

  // Reset to specific level
  resetTo: (level: 'sport' | 'program' | 'level' | 'team' | 'season') => void
}

export const Context = createContext<OrganizationStructureContext | undefined>(undefined)

export function OrganizationStructureProvider({ children }: { children: ReactNode }) {
  const [selectedSportId, setSelectedSportId] = useState<string>()
  const [selectedProgramId, setSelectedProgramId] = useState<string>()
  const [selectedLevelId, setSelectedLevelId] = useState<string>()
  const [selectedTeamId, setSelectedTeamId] = useState<string>()
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>()

  const selectSport = (id?: string) => {
    setSelectedSportId(id)
    // Reset downstream selections
    setSelectedProgramId(undefined)
    setSelectedLevelId(undefined)
    setSelectedTeamId(undefined)
  }

  const selectProgram = (id?: string) => {
    setSelectedProgramId(id)
    // Reset downstream selections
    setSelectedLevelId(undefined)
    setSelectedTeamId(undefined)
  }

  const selectLevel = (id?: string) => {
    setSelectedLevelId(id)
    // Reset downstream selections
    setSelectedTeamId(undefined)
  }

  const selectTeam = (id?: string) => {
    setSelectedTeamId(id)
  }

  const selectSeason = (id?: string) => {
    setSelectedSeasonId(id)
  }

  const resetTo = (level: 'sport' | 'program' | 'level' | 'team' | 'season') => {
    switch (level) {
      case 'sport':
        selectSport()
        break
      case 'program':
        selectProgram()
        break
      case 'level':
        selectLevel()
        break
      case 'team':
        selectTeam()
        break
      case 'season':
        selectSeason()
        break
    }
  }

  return (
    <Context.Provider
      value={{
        selectedSportId,
        selectedProgramId,
        selectedLevelId,
        selectedTeamId,
        selectedSeasonId,
        selectSport,
        selectProgram,
        selectLevel,
        selectTeam,
        selectSeason,
        resetTo,
      }}
    >
      {children}
    </Context.Provider>
  )
}

// Split into separate hooks file to satisfy Fast Refresh rules
