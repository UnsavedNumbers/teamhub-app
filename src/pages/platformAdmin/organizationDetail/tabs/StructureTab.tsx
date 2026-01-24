/**
 * StructureTab Component
 * 
 * Displays hierarchical structure (teams, seasons) for the organization.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { Card, Badge, Button, DataState } from '../../../../components/platformAdmin'
import { handleRpcError } from '../../../../utils/rpcErrorHandler'
import { safeString, safeBoolean, safeNumber } from '../../../../utils/safeAccessors'
import type { AdminStructure } from '../../../../types/platformAdmin.types'

interface StructureTabProps {
  organizationId: string
}

interface TeamWithSeasons {
  id: string
  name: string
  playerCount: number
  seasons: {
    id: string
    name: string
    active: boolean
  }[]
}

export function StructureTab({ organizationId }: StructureTabProps) {
  const isMountedRef = useRef(true)
  const [teams, setTeams] = useState<TeamWithSeasons[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchStructure = useCallback(async () => {
    if (!organizationId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('admin_structure')
        .select('*')
        .eq('org_id', organizationId)
        .order('team_name', { ascending: true })
        .order('season_name', { ascending: true })

      if (!isMountedRef.current) return

      if (fetchError) {
        const normalized = handleRpcError(fetchError, 'fetch_structure')
        setError(normalized.message)
        setTeams([])
        return
      }

      // Organize flat data into hierarchical structure
      const teamMap = new Map<string, TeamWithSeasons>()

      for (const row of (data || []) as AdminStructure[]) {
        if (row.team_id) {
          if (!teamMap.has(row.team_id)) {
            teamMap.set(row.team_id, {
              id: row.team_id,
              name: safeString(row.team_name, 'Unnamed Team'),
              playerCount: safeNumber(row.player_count, 0),
              seasons: [],
            })
          }

          const team = teamMap.get(row.team_id)!
          if (row.season_id && !team.seasons.find(s => s.id === row.season_id)) {
            team.seasons.push({
              id: row.season_id,
              name: safeString(row.season_name, 'Unnamed Season'),
              active: safeBoolean(row.season_active, false),
            })
          }
        }
      }

      setTeams(Array.from(teamMap.values()))
    } catch (err) {
      if (!isMountedRef.current) return
      const normalized = handleRpcError(err, 'fetch_structure')
      setError(normalized.message)
      setTeams([])
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [organizationId])

  useEffect(() => {
    fetchStructure()
  }, [fetchStructure])

  const handleToggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev)
      if (newSet.has(teamId)) {
        newSet.delete(teamId)
      } else {
        newSet.add(teamId)
      }
      return newSet
    })
  }

  return (
    <div>
      {/* Link to full structure page */}
      <div className="pa-flex pa-items-center pa-justify-between pa-mb-4">
        <div />
        <Button
          variant="ghost"
          size="dense"
          icon="open_in_new"
          onClick={() => window.location.href = `/platform-admin/structure?org_id=${organizationId}`}
        >
          View Full Structure
        </Button>
      </div>

      <DataState
        data={teams}
        loading={loading}
        error={error}
        onRetry={fetchStructure}
        emptyMessage="No teams found in this organization"
        emptyIcon="account_tree"
      >
        {(data) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-3)' }}>
            {data.map((team) => (
              <Card key={team.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div className="pa-flex pa-items-center pa-gap-2 pa-mb-1">
                      <h3 className="pa-h3" style={{ margin: 0 }}>{team.name}</h3>
                      <Badge variant="neutral" size="small">
                        {team.playerCount} player{team.playerCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {team.seasons.length > 0 && (
                      <div className="pa-body-s pa-text-muted">
                        {team.seasons.length} season{team.seasons.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  {team.seasons.length > 0 && (
                    <Button
                      variant="ghost"
                      size="dense"
                      icon={expandedTeams.has(team.id) ? 'expand_less' : 'expand_more'}
                      onClick={() => handleToggleTeam(team.id)}
                    >
                      {expandedTeams.has(team.id) ? 'Hide' : 'Show'} Seasons
                    </Button>
                  )}
                </div>

                {expandedTeams.has(team.id) && team.seasons.length > 0 && (
                  <div style={{ marginTop: 'var(--pa-space-4)', paddingTop: 'var(--pa-space-4)', borderTop: '1px solid var(--pa-n100)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
                      {team.seasons.map((season) => (
                        <div
                          key={season.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--pa-space-2)',
                            background: 'var(--pa-n50)',
                            borderRadius: 'var(--pa-radius-sm)',
                          }}
                        >
                          <span className="pa-body-m">{season.name}</span>
                          <Badge variant={season.active ? 'success' : 'neutral'} size="small">
                            {season.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </DataState>
    </div>
  )
}
