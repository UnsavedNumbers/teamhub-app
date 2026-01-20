import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { PageHeader, Badge, Card, FilterBar, EmptyState } from '../../components/platformAdmin'
import type { AdminStructure } from '../../types/platformAdmin.types'

interface OrganizationWithStructure {
  id: string
  name: string
  teams: {
    id: string
    name: string
    playerCount: number
    seasons: {
      id: string
      name: string
      active: boolean
    }[]
  }[]
}

export default function Structure() {
  const [structures, setStructures] = useState<AdminStructure[]>([])
  const [organizedData, setOrganizedData] = useState<OrganizationWithStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set())

  const fetchStructure = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_structure')
        .select('*')
        .order('organization_name', { ascending: true })
        .order('team_name', { ascending: true })

      if (search) {
        query = query.ilike('organization_name', `%${search}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching structure:', error)
        setStructures([])
      } else {
        setStructures(data as AdminStructure[])
      }
    } catch (err) {
      console.error('Error:', err)
      setStructures([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchStructure()
  }, [fetchStructure])

  // Organize flat data into hierarchical structure
  useEffect(() => {
    const orgMap = new Map<string, OrganizationWithStructure>()

    for (const row of structures) {
      if (!orgMap.has(row.org_id)) {
        orgMap.set(row.org_id, {
          id: row.org_id,
          name: row.organization_name,
          teams: [],
        })
      }

      const org = orgMap.get(row.org_id)!
      
      if (row.team_id) {
        let team = org.teams.find(t => t.id === row.team_id)
        if (!team) {
          team = {
            id: row.team_id,
            name: row.team_name || 'Unnamed Team',
            playerCount: row.player_count || 0,
            seasons: [],
          }
          org.teams.push(team)
        }

        if (row.season_id && !team.seasons.find(s => s.id === row.season_id)) {
          team.seasons.push({
            id: row.season_id,
            name: row.season_name || 'Unnamed Season',
            active: row.season_active ?? false,
          })
        }
      }
    }

    setOrganizedData(Array.from(orgMap.values()))
  }, [structures])

  const handleToggleOrg = (orgId: string) => {
    setExpandedOrgs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orgId)) {
        newSet.delete(orgId)
      } else {
        newSet.add(orgId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Structure"
          subtitle="Hierarchical view of all organizations, teams, and seasons. Read-only."
        />
        <div className="pa-flex pa-flex-col pa-gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pa-card">
              <div className="pa-skeleton" style={{ width: '40%', height: '24px', marginBottom: '12px' }} />
              <div className="pa-skeleton" style={{ width: '60%', height: '16px' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Structure"
        subtitle="Hierarchical view of all organizations, teams, and seasons. Read-only."
      />

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by organization name..."
        onClearAll={() => setSearch('')}
      />

      {organizedData.length === 0 ? (
        <Card>
          <EmptyState
            icon="account_tree"
            title="No Structure Data"
            description="No organizations, teams, or seasons found."
          />
        </Card>
      ) : (
        <div className="pa-flex pa-flex-col pa-gap-3">
          {organizedData.map((org) => {
            const isExpanded = expandedOrgs.has(org.id)
            
            return (
              <div key={org.id} className="pa-card" style={{ padding: 0 }}>
                {/* Organization Header */}
                <button
                  onClick={() => handleToggleOrg(org.id)}
                  className="pa-flex pa-items-center pa-gap-3"
                  style={{
                    width: '100%',
                    padding: 'var(--pa-space-4) var(--pa-space-5)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '24px',
                      color: 'var(--pa-blue)',
                      transition: 'transform 0.2s ease',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    expand_more
                  </span>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-blue)' }}>
                    apartment
                  </span>
                  <span className="pa-h3" style={{ flex: 1 }}>{org.name}</span>
                  <Badge variant="neutral">{org.teams.length} teams</Badge>
                </button>

                {/* Teams */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--pa-n100)',
                      padding: 'var(--pa-space-4) var(--pa-space-5)',
                      paddingLeft: 'var(--pa-space-9)',
                      background: 'var(--pa-n25)',
                    }}
                  >
                    {org.teams.length === 0 ? (
                      <span className="pa-body-m pa-text-muted">No teams in this organization.</span>
                    ) : (
                      <div className="pa-flex pa-flex-col pa-gap-4">
                        {org.teams.map((team) => (
                          <div key={team.id}>
                            <div className="pa-flex pa-items-center pa-gap-3 pa-mb-2">
                              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-n500)' }}>
                                groups
                              </span>
                              <span className="pa-body-m" style={{ fontWeight: 500 }}>{team.name}</span>
                              <Badge variant="neutral">{team.playerCount} players</Badge>
                            </div>
                            
                            {/* Seasons */}
                            {team.seasons.length > 0 && (
                              <div
                                style={{
                                  paddingLeft: 'var(--pa-space-7)',
                                  marginTop: 'var(--pa-space-2)',
                                }}
                              >
                                {team.seasons.map((season) => (
                                  <div
                                    key={season.id}
                                    className="pa-flex pa-items-center pa-gap-2 pa-mb-1"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--pa-n400)' }}>
                                      calendar_today
                                    </span>
                                    <span className="pa-body-s">{season.name}</span>
                                    <Badge variant={season.active ? 'success' : 'neutral'}>
                                      {season.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
