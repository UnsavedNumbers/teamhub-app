import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useTeamParams } from '../../hooks/useRouteParams'
import { getTeamDetails, getTeamRoster } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes/helpers'
import type { FakeTeamMember } from '../../data/fake/fakeTeams'
import { Button, EmptyState } from '../../components/platformAdmin'

interface Team {
  id: string
  name: string
  sport?: { name: string; id?: string }
  program?: { name: string; id?: string }
  level?: { name: string; id?: string }
  max_roster_size?: number
}

interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

interface RosterMember {
  id: string
  child_id: string
  athlete?: {
    id: string
    first_name: string
    last_name: string
    jersey_number: string | null
  }
  jersey_number?: string | null
  position?: string | null
  status: 'active' | 'inactive' | 'pending'
}

export default function TeamDetail() {
  const { teamId } = useTeamParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('roster')
  const [navigating, setNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamStats, setTeamStats] = useState({
    totalAthletes: 0,
    activeAthletes: 0,
    vacancies: 0,
    rank: 1,
  })

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchTeamAndSeasons = useCallback(async () => {
    if (!teamId || !isReady) return

    setLoading(true)
    setError(null)
    try {
      const { data: teamData, error: teamError } = await getTeamDetails(context, teamId)

      if (teamError || !teamData) {
        console.error('Error fetching team:', teamError)
        if (isMountedRef.current) {
          setError(teamError?.message || 'Failed to load team details')
          setLoading(false)
        }
        return
      }

      if (!isMountedRef.current) return

      setTeam({
        id: teamData.id,
        name: teamData.name,
        sport: (teamData as any).sport,
        program: (teamData as any).program,
        level: (teamData as any).level,
        max_roster_size: (teamData as any).max_roster_size,
      })

      // Get seasons for this team
      if (teamData.seasons && teamData.seasons.length > 0) {
        const seasonList = teamData.seasons.map((s: any) => ({
          id: s.id,
          name: s.name,
          start_date: s.start_date,
          end_date: s.end_date,
          is_active: s.is_active,
        }))
        const active = seasonList.find((s: Season) => s.is_active) || seasonList[0]
        setActiveSeason(active)
        if (active) {
          await fetchRoster(active.id)
        }
      } else {
        // Try to fetch seasons directly
        const { data: seasonsData, error: seasonsError } = await supabase
          .from('team_seasons')
          .select('season:seasons(id, name, start_date, end_date, is_active)')
          .eq('team_id', teamId)

        if (seasonsError) {
          console.error('Error fetching seasons:', seasonsError)
        } else if (seasonsData && seasonsData.length > 0) {
          const seasonList = seasonsData.map((s: any) => ({
            id: s.season.id,
            name: s.season.name,
            start_date: s.season.start_date,
            end_date: s.season.end_date,
            is_active: s.season.is_active,
          }))
          const active = seasonList.find((s: Season) => s.is_active) || seasonList[0]
          setActiveSeason(active)
          if (active) {
            await fetchRoster(active.id)
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchTeamAndSeasons:', error)
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [teamId, context, isReady])

  const fetchRoster = useCallback(
    async (seasonId: string) => {
      if (!teamId || !isReady || !seasonId) return

      setRosterLoading(true)
      try {
        const { data, error } = await getTeamRoster(context, teamId, seasonId)

        if (error) {
          console.error('Error fetching roster:', error)
          if (isMountedRef.current) {
            setRoster([])
          }
          return
        }

        if (!isMountedRef.current) return

        // Transform roster data
        const rosterMembers: RosterMember[] = data.map((member: FakeTeamMember) => ({
          id: member.id,
          child_id: member.child_id,
          jersey_number: member.jersey_number,
          position: member.position,
          status: member.status,
        }))

        // Fetch athlete details for each member
        const athleteIds = rosterMembers.map((m) => m.child_id).filter(Boolean)
        if (athleteIds.length > 0) {
          const { data: athletesData, error: athletesError } = await supabase
            .from('athletes')
            .select('id, first_name, last_name')
            .in('id', athleteIds)

          if (!athletesError && athletesData && Array.isArray(athletesData)) {
            const athleteMap = new Map(
              (athletesData as any[]).map((a) => [a.id, { id: a.id, first_name: a.first_name, last_name: a.last_name, jersey_number: null }])
            )

            rosterMembers.forEach((member) => {
              const athlete = athleteMap.get(member.child_id)
              if (athlete) {
                member.athlete = athlete
                // Use jersey_number from athlete if not in membership
                if (!member.jersey_number && athlete.jersey_number) {
                  member.jersey_number = athlete.jersey_number
                }
              }
            })
          }
        }

        setRoster(rosterMembers)

        // Calculate stats
        const activeCount = rosterMembers.filter((m) => m.status === 'active').length
        const maxRoster = team?.max_roster_size || 18
        setTeamStats({
          totalAthletes: rosterMembers.length,
          activeAthletes: activeCount,
          vacancies: Math.max(0, maxRoster - activeCount),
          rank: 1, // TODO: Calculate actual rank
        })
      } catch (error) {
        console.error('Error in fetchRoster:', error)
        if (isMountedRef.current) {
          setRoster([])
        }
      } finally {
        if (isMountedRef.current) {
          setRosterLoading(false)
        }
      }
    },
    [teamId, context, isReady, team]
  )

  useEffect(() => {
    fetchTeamAndSeasons()
  }, [fetchTeamAndSeasons])

  useEffect(() => {
    if (activeSeason) {
      fetchRoster(activeSeason.id)
    }
  }, [activeSeason, fetchRoster])

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const handleAddAthlete = useCallback(() => {
    if (!teamId || navigating) return

    setNavigating(true)
    navigate(`/admin/teams/${teamId}/roster`)
  }, [teamId, navigate, navigating])

  const handleAthleteClick = useCallback(
    (athleteId: string) => {
      if (!athleteId || navigating) return

      setNavigating(true)
      navigate(getLink('admin.athletes.detail', { id: athleteId }))
    },
    [navigate, navigating]
  )

  const handleTabChange = useCallback(
    (tab: string) => {
      if (navigating) return

      if (tab === 'schedule') {
        setNavigating(true)
        navigate(`/admin/events?teamId=${teamId}`)
      } else if (tab === 'attendance') {
        setNavigating(true)
        navigate(`/admin/attendance?teamId=${teamId}`)
      } else if (tab === 'settings') {
        // For now, navigate to teams list - in future could have team settings page
        setNavigating(true)
        navigate(getLink('admin.teams.list'))
      } else {
        setActiveTab(tab)
      }
    },
    [teamId, navigate, navigating]
  )

  const handleBreadcrumbClick = useCallback(
    (path: string, id?: string) => {
      if (navigating || !path) return

      setNavigating(true)
      if (id) {
        navigate(`${path}/${id}`)
      } else {
        navigate(path)
      }
    },
    [navigate, navigating]
  )

  if (loading) {
    return (
      <div className="pa-root">
        <div className="pa-skeleton" style={{ height: '400px' }} />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="pa-root">
        <div className="pa-page-header">
          <h1 className="pa-page-title">Team not found</h1>
          {error && <p className="pa-body-m" style={{ color: 'var(--pa-danger)', marginTop: 'var(--pa-space-2)' }}>{error}</p>}
          <div style={{ marginTop: 'var(--pa-space-4)' }}>
            <Button variant="blue" onClick={() => navigate(getLink('admin.teams.list'))}>
              Back to Teams
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const sportName = team.sport?.name || ''
  const programName = team.program?.name || ''
  const levelName = team.level?.name || ''
  const sportId = team.sport?.id
  const programId = team.program?.id

  // Get primary color for court texture and accents
  // Use CSS variable with fallback to ensure it works even if theme not loaded
  const primaryColor = 'var(--pa-theme-action-primary, #137fec)'
  const primaryColorDark = 'var(--pa-theme-action-active, #0a56a4)'

  return (
    <div className="pa-root">
      {/* Header Band with Court Texture */}
      <div
        style={{
          width: '100%',
          height: '128px',
          background: 'var(--pa-n900)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Court texture pattern using theme primary color */}
        <div
          className="court-texture"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(45deg, color-mix(in srgb, ${primaryColor} 10%, transparent) 25%, transparent 25%),
              linear-gradient(-45deg, color-mix(in srgb, ${primaryColor} 10%, transparent) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, color-mix(in srgb, ${primaryColor} 10%, transparent) 75%),
              linear-gradient(-45deg, transparent 75%, color-mix(in srgb, ${primaryColor} 10%, transparent) 75%)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--pa-surface-subtle), transparent)',
          }}
          className="dark:bg-gradient-to-t dark:from-background-dark dark:to-transparent"
        />
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          marginTop: '-64px',
          position: 'relative',
          zIndex: 10,
          padding: '0 var(--pa-space-4)',
          paddingBottom: 'var(--pa-space-10)',
        }}
        className="md:px-8"
      >
        {/* Breadcrumbs */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 'var(--pa-space-2)',
            marginBottom: 'var(--pa-space-2)',
          }}
        >
          {sportName && (
            <>
              {sportId ? (
                <button
                  onClick={() => handleBreadcrumbClick('/admin/sports', sportId)}
                  disabled={navigating}
                  style={{
                    color: primaryColor,
                    fontSize: '12px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    textDecoration: 'none',
                    background: 'none',
                    border: 'none',
                    cursor: navigating ? 'not-allowed' : 'pointer',
                    opacity: navigating ? 0.6 : 1,
                    padding: 0,
                    lineHeight: 'normal',
                  }}
                >
                  {sportName.toUpperCase()}
                </button>
              ) : (
                <Link
                  to={getLink('admin.sports.list')}
                  style={{
                    color: primaryColor,
                    fontSize: '12px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    textDecoration: 'none',
                    lineHeight: 'normal',
                  }}
                >
                  {sportName.toUpperCase()}
                </Link>
              )}
              <span style={{ color: `color-mix(in srgb, ${primaryColor} 50%, transparent)`, fontSize: '12px', fontWeight: 900, lineHeight: 'normal' }}>/</span>
            </>
          )}
          {programName && (
            <>
              {programId ? (
                <button
                  onClick={() => handleBreadcrumbClick('/admin/programs', programId)}
                  disabled={navigating}
                  style={{
                    color: primaryColor,
                    fontSize: '12px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    textDecoration: 'none',
                    background: 'none',
                    border: 'none',
                    cursor: navigating ? 'not-allowed' : 'pointer',
                    opacity: navigating ? 0.6 : 1,
                    padding: 0,
                    lineHeight: 'normal',
                  }}
                >
                  {programName.toUpperCase()}
                </button>
              ) : (
                <Link
                  to={getLink('admin.programs.list')}
                  style={{
                    color: primaryColor,
                    fontSize: '12px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    textDecoration: 'none',
                    lineHeight: 'normal',
                  }}
                >
                  {programName.toUpperCase()}
                </Link>
              )}
              <span style={{ color: `color-mix(in srgb, ${primaryColor} 50%, transparent)`, fontSize: '12px', fontWeight: 900, lineHeight: 'normal' }}>/</span>
            </>
          )}
          {levelName && (
            <span
              style={{
                color: 'var(--pa-n900)',
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                lineHeight: 'normal',
              }}
              className="dark:text-white"
            >
              {levelName.toUpperCase()}
            </span>
          )}
        </div>

        {/* Page Heading & Tactile Primary Button */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--pa-space-6)',
            marginBottom: 'var(--pa-space-8)',
          }}
          className="md:flex-row md:items-end md:justify-between"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-6)' }}>
            <div
              className="hidden md:flex dark:bg-slate-800 dark:border-slate-700"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                background: 'var(--pa-white)',
                borderRadius: 'var(--pa-radius-l)',
                border: '1px solid var(--pa-n200)',
                boxShadow: 'var(--pa-shadow-1)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: primaryColor, fontVariationSettings: "'FILL' 1" }}>
                apparel
              </span>
            </div>
            <div>
              <h1
                style={{
                  fontFamily: 'var(--pa-font-display)',
                  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--pa-n900)',
                  margin: 0,
                }}
                className="dark:text-white"
              >
                {team.name.toUpperCase()}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', marginTop: 'var(--pa-space-2)' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: primaryColor,
                  }}
                />
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--pa-n500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    margin: 0,
                  }}
                  className="dark:text-slate-400"
                >
                  TeamHub Athletic v1.0.4
                </p>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleAddAthlete}
              disabled={!teamId || navigating || loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--pa-space-2)',
                minWidth: '180px',
                height: '56px',
                padding: '0 var(--pa-space-6)',
                background: navigating || !teamId || loading ? 'var(--pa-n400)' : primaryColor,
                color: 'var(--pa-white)',
                fontSize: '14px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                borderRadius: 'var(--pa-radius-m)',
                border: 'none',
                cursor: navigating || !teamId || loading ? 'not-allowed' : 'pointer',
                boxShadow: navigating || !teamId || loading ? 'none' : `0 8px 0 0 ${primaryColorDark}`,
                transition: 'all 75ms',
                opacity: navigating || !teamId || loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!navigating && teamId && !loading) {
                  e.currentTarget.style.transform = 'translateY(2px)'
                  e.currentTarget.style.boxShadow = `0 4px 0 0 ${primaryColorDark}`
                }
              }}
              onMouseLeave={(e) => {
                if (!navigating && teamId && !loading) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = `0 8px 0 0 ${primaryColorDark}`
                }
              }}
              onMouseDown={(e) => {
                if (!navigating && teamId && !loading) {
                  e.currentTarget.style.transform = 'translateY(8px)'
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
              onMouseUp={(e) => {
                if (!navigating && teamId && !loading) {
                  e.currentTarget.style.transform = 'translateY(2px)'
                  e.currentTarget.style.boxShadow = `0 4px 0 0 ${primaryColorDark}`
                }
              }}
            >
              {navigating ? (
                <>
                  <span className="pa-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                  <span>LOADING...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    person_add
                  </span>
                  <span>ADD ATHLETE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ marginBottom: 'var(--pa-space-6)' }}>
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--pa-n200)',
              gap: 'var(--pa-space-8)',
              overflowX: 'auto',
            }}
            className="dark:border-slate-700"
          >
            {['roster', 'schedule', 'attendance', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                disabled={navigating}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: activeTab === tab ? `4px solid ${primaryColor}` : '4px solid transparent',
                  color: activeTab === tab ? 'var(--pa-n900)' : 'var(--pa-n500)',
                  paddingBottom: '14px',
                  paddingTop: 'var(--pa-space-4)',
                  fontSize: '14px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: navigating ? 'not-allowed' : 'pointer',
                  transition: 'color 200ms',
                  opacity: navigating ? 0.6 : 1,
                }}
                className={activeTab === tab ? 'dark:text-white' : 'dark:text-slate-500'}
                onMouseEnter={(e) => {
                  if (!navigating && activeTab !== tab) {
                    e.currentTarget.style.color = primaryColor
                  }
                }}
                onMouseLeave={(e) => {
                  if (!navigating && activeTab !== tab) {
                    e.currentTarget.style.color = 'var(--pa-n500)'
                  }
                }}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        {activeTab === 'roster' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--pa-space-6)',
            }}
            className="lg:flex-row"
          >
            {/* Roster Table */}
            <div style={{ flex: 1 }}>
              {rosterLoading ? (
                <div className="pa-card">
                  <div className="pa-skeleton" style={{ height: '200px' }} />
                </div>
              ) : roster.length === 0 ? (
                <div className="pa-card">
                  <EmptyState
                    icon="people"
                    title="NO ATHLETES ON ROSTER"
                    description="Add athletes to this team to start building your roster."
                    action={{
                      label: 'Add Athlete',
                      onClick: handleAddAthlete,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    overflow: 'hidden',
                    borderRadius: 'var(--pa-radius-l)',
                    border: '1px solid var(--pa-n200)',
                    background: 'var(--pa-white)',
                    boxShadow: 'var(--pa-shadow-1)',
                  }}
                  className="dark:border-slate-700 dark:bg-slate-900"
                >
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--pa-n50)' }} className="dark:bg-slate-800/50">
                        <th
                          style={{
                            padding: 'var(--pa-space-4) var(--pa-space-6)',
                            color: 'var(--pa-n500)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--pa-n200)',
                          }}
                          className="dark:text-slate-400 dark:border-slate-700"
                        >
                          Athlete Name
                        </th>
                        <th
                          style={{
                            padding: 'var(--pa-space-4) var(--pa-space-6)',
                            color: 'var(--pa-n500)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--pa-n200)',
                          }}
                          className="dark:text-slate-400 dark:border-slate-700"
                        >
                          Jersey #
                        </th>
                        <th
                          style={{
                            padding: 'var(--pa-space-4) var(--pa-space-6)',
                            color: 'var(--pa-n500)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--pa-n200)',
                          }}
                          className="dark:text-slate-400 dark:border-slate-700"
                        >
                          Position
                        </th>
                        <th
                          style={{
                            padding: 'var(--pa-space-4) var(--pa-space-6)',
                            color: 'var(--pa-n500)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--pa-n200)',
                          }}
                          className="dark:text-slate-400 dark:border-slate-700"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cfdbe7] dark:divide-slate-700">
                      {roster.map((member) => {
                        const firstName = member.athlete?.first_name || ''
                        const lastName = member.athlete?.last_name || ''
                        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Athlete'
                        const initials = firstName && lastName ? getInitials(firstName, lastName) : '??'
                        const jerseyNumber = member.jersey_number || member.athlete?.jersey_number || '—'
                        const position = member.position || '—'
                        const isActive = member.status === 'active'
                        const athleteId = member.athlete?.id || member.child_id

                        return (
                          <tr
                            key={member.id}
                            onClick={() => athleteId && handleAthleteClick(athleteId)}
                            style={{
                              transition: 'background-color 200ms',
                              cursor: athleteId && !navigating ? 'pointer' : 'default',
                            }}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                            onMouseEnter={(e) => {
                              if (athleteId && !navigating) {
                                e.currentTarget.style.background = 'var(--pa-n50)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <td style={{ padding: 'var(--pa-space-5) var(--pa-space-6)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: isActive ? `color-mix(in srgb, ${primaryColor} 10%, transparent)` : 'var(--pa-n200)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isActive ? primaryColor : 'var(--pa-n500)',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                  }}
                                  className={!isActive ? 'dark:bg-slate-700 dark:text-slate-400' : ''}
                                >
                                  {initials}
                                </div>
                                <span style={{ color: 'var(--pa-n900)', fontWeight: 700 }} className="dark:text-white">
                                  {fullName}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: 'var(--pa-space-5) var(--pa-space-6)', color: primaryColor, fontWeight: 900, letterSpacing: '-0.02em' }}>
                              {jerseyNumber !== '—' ? `#${jerseyNumber}` : jerseyNumber}
                            </td>
                            <td style={{ padding: 'var(--pa-space-5) var(--pa-space-6)', color: 'var(--pa-n600)', fontWeight: 500 }} className="dark:text-slate-400">
                              {position}
                            </td>
                            <td style={{ padding: 'var(--pa-space-5) var(--pa-space-6)' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 12px',
                                  borderRadius: '9999px',
                                  background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'var(--pa-n100)',
                                  color: isActive ? 'rgb(16, 185, 129)' : 'var(--pa-n500)',
                                  fontSize: '10px',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                }}
                                className={isActive ? 'dark:bg-emerald-900/30 dark:text-emerald-400' : 'dark:bg-slate-800 dark:text-slate-400'}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isActive ? 'rgb(16, 185, 129)' : 'var(--pa-n400)',
                                    marginRight: '8px',
                                  }}
                                  className={!isActive ? 'dark:bg-slate-400' : ''}
                                />
                                {isActive ? 'ACTIVE' : 'INACTIVE'}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div
              className="w-full lg:w-80"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--pa-space-6)',
              }}
            >
              {/* Team Summary Card */}
              <div
                style={{
                  padding: 'var(--pa-space-6)',
                  borderRadius: 'var(--pa-radius-l)',
                  border: `1px solid color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                  background: `color-mix(in srgb, ${primaryColor} 5%, transparent)`,
                }}
                className="dark:bg-primary/10"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-4)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: primaryColor, fontWeight: 700 }}>
                    analytics
                  </span>
                  <h3
                    style={{
                      fontSize: '12px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--pa-n700)',
                      margin: 0,
                    }}
                    className="dark:text-slate-300"
                  >
                    Team Summary
                  </h3>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--pa-space-4)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: primaryColor, letterSpacing: '-0.02em' }}>
                      {teamStats.totalAthletes}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--pa-n500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                      className="dark:text-slate-400"
                    >
                      Athletes
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: primaryColor, letterSpacing: '-0.02em' }}>
                      {teamStats.activeAthletes}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--pa-n500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                      className="dark:text-slate-400"
                    >
                      Active
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: primaryColor, letterSpacing: '-0.02em' }}>
                      {teamStats.vacancies}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--pa-n500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                      className="dark:text-slate-400"
                    >
                      Vacancies
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: primaryColor, letterSpacing: '-0.02em' }}>
                      #{teamStats.rank}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--pa-n500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                      className="dark:text-slate-400"
                    >
                      Rank
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div
                style={{
                  padding: 'var(--pa-space-6)',
                  borderRadius: 'var(--pa-radius-l)',
                  border: '1px solid var(--pa-n200)',
                  background: 'var(--pa-white)',
                }}
                className="dark:border-slate-700 dark:bg-slate-900"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-4)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-n400)', fontWeight: 700 }}>
                    notifications
                  </span>
                  <h3
                    style={{
                      fontSize: '12px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--pa-n700)',
                      margin: 0,
                    }}
                    className="dark:text-slate-300"
                  >
                    Recent Activity
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-4)' }}>
                  <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        marginTop: '6px',
                        borderRadius: '50%',
                        background: primaryColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2, margin: 0, color: 'var(--pa-n900)' }} className="dark:text-white">
                        New athlete added to roster
                      </p>
                      <p
                        style={{
                          fontSize: '10px',
                          color: 'var(--pa-n400)',
                          textTransform: 'uppercase',
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          marginTop: '4px',
                        }}
                        className="dark:text-slate-400"
                      >
                        2 hours ago
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--pa-space-3)' }}>
                    <div
                      style={{
                        width: '6px',
                        height: '6px',
                        marginTop: '6px',
                        borderRadius: '50%',
                        background: primaryColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2, margin: 0, color: 'var(--pa-n900)' }} className="dark:text-white">
                        Jersey # assignment updated
                      </p>
                      <p
                        style={{
                          fontSize: '10px',
                          color: 'var(--pa-n400)',
                          textTransform: 'uppercase',
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          marginTop: '4px',
                        }}
                        className="dark:text-slate-400"
                      >
                        Yesterday
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
