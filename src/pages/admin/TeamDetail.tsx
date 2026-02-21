import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useTeamParams } from '../../hooks/useRouteParams'
import { getTeamDetails, getTeamRoster } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes'
import type { FakeTeamMember } from '../../data/fake/fakeTeams'
import { Button } from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { AddExistingAthleteModal } from '../../components/admin/AddExistingAthleteModal'
import { EmptyRosterState } from '../../components/admin/EmptyRosterState'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { TeamOverviewTab } from '../../components/admin/TeamOverviewTab'
import { TeamScheduleTab } from '../../components/admin/TeamScheduleTab'
import { TeamAttendanceTab } from '../../components/admin/TeamAttendanceTab'
import { TeamPaymentsTab } from '../../components/admin/TeamPaymentsTab'
import { TeamSettingsTab } from '../../components/admin/TeamSettingsTab'
import { TeamCoachesTab } from '../../components/admin/TeamCoachesTab'
import { PhotoSection } from '@/components/galleries/PhotoSection'
import '../../styles/orgAdmin.css'

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
  athlete_id: string
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

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function TeamDetail() {
  useDebugLifecycle('TeamDetail')
  const { teamId } = useTeamParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [activeSeason, setActiveSeason] = useState<Season | null>(null)
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const [navigating, setNavigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamStats, setTeamStats] = useState({
    totalAthletes: 0,
    activeAthletes: 0,
    vacancies: 0,
    rank: 1,
  })
  const [showAddExistingModal, setShowAddExistingModal] = useState(false)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchTeamAndSeasons = useCallback(async () => {
    console.log('[TeamDetail] fetchTeamAndSeasons called:', { teamId, isReady, orgId: context.orgId })
    
    if (!teamId || !isReady) {
      console.log('[TeamDetail] Early return - teamId or not ready')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: teamData, error: teamError } = await getTeamDetails(context, teamId)
      
      console.log('[TeamDetail] getTeamDetails response:', { 
        hasTeamData: !!teamData, 
        teamError: teamError ? { message: teamError.message } : null 
      })

      if (teamError || !teamData) {
        console.error('Error fetching team:', {
          teamError,
          teamId,
          orgId: context.orgId,
          hasData: !!teamData,
          errorMessage: teamError?.message
        })
        if (isMountedRef.current) {
          // Provide more specific error message
          const errorMessage = teamError?.message || 'Team not found. The team may not exist or you may not have permission to view it.'
          setError(errorMessage)
          setLoading(false)
        }
        return
      }

      if (!isMountedRef.current) {
        setLoading(false)
        return
      }

      const teamInfo = {
        id: teamData.id,
        name: teamData.name,
        sport: (teamData as any).sport,
        program: (teamData as any).program,
        level: (teamData as any).level,
        max_roster_size: (teamData as any).max_roster_size,
      }
      setTeam(teamInfo)

      // Get seasons for this team
      let activeSeason: Season | null = null
      
      if (teamData.seasons && teamData.seasons.length > 0) {
        const seasonList = teamData.seasons.map((s: any) => ({
          id: s.id,
          name: s.name,
          start_date: s.start_date,
          end_date: s.end_date,
          is_active: s.is_active,
        }))
        activeSeason = seasonList.find((s: Season) => s.is_active) || seasonList[0]
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
          activeSeason = seasonList.find((s: Season) => s.is_active) || seasonList[0]
        }
      }

      // Set active season - this will trigger the useEffect to fetch roster
      if (activeSeason) {
        setActiveSeason(activeSeason)
      } else {
        // No season found, ensure loading is set to false
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    } catch (error) {
      console.error('Error in fetchTeamAndSeasons:', error)
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'An unexpected error occurred')
        setLoading(false)
      }
    }
  }, [teamId, context, isReady])

  const fetchRoster = useCallback(
    async (seasonId: string) => {
      if (!teamId || !isReady || !seasonId) {
        setRosterLoading(false)
        return
      }

      setRosterLoading(true)
      try {
        const { data, error } = await getTeamRoster(context, teamId, seasonId)

        if (error) {
          console.error('Error fetching roster:', error)
          if (isMountedRef.current) {
            setRoster([])
            setRosterLoading(false)
          }
          return
        }

        if (!isMountedRef.current) {
          setRosterLoading(false)
          return
        }

        // Transform roster data
        const rosterMembers: RosterMember[] = (data || []).map((member: FakeTeamMember) => ({
          id: member.id,
          athlete_id: member.athlete_id ?? (member as { child_id?: string }).child_id,
          jersey_number: member.jersey_number,
          position: member.position,
          status: member.status,
        }))

        // Fetch athlete details for each member
        const athleteIds = rosterMembers.map((m) => m.athlete_id).filter(Boolean)
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
              const athlete = athleteMap.get(member.athlete_id)
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

        if (isMountedRef.current) {
          setRoster(rosterMembers)

          // Calculate stats - use current team state or fallback
          const currentTeam = team || { max_roster_size: 18 }
          const activeCount = rosterMembers.filter((m) => m.status === 'active').length
          setTeamStats({
            totalAthletes: rosterMembers.length,
            activeAthletes: activeCount,
            vacancies: Math.max(0, (currentTeam.max_roster_size || 18) - activeCount),
            rank: 1, // TODO: Calculate actual rank
          })
        }
      } catch (error) {
        console.error('Error in fetchRoster:', error)
        if (isMountedRef.current) {
          setRoster([])
        }
      } finally {
        if (isMountedRef.current) {
          setRosterLoading(false)
          // Also ensure main loading is false after roster loads
          setLoading(false)
        }
      }
    },
    [teamId, context, isReady, team]
  )

  useEffect(() => {
    if (teamId && isReady) {
      fetchTeamAndSeasons()
    } else if (!isReady) {
      setLoading(true)
    } else {
      setLoading(false)
    }
  }, [teamId, isReady, fetchTeamAndSeasons])

  useEffect(() => {
    if (activeSeason && teamId && isReady) {
      fetchRoster(activeSeason.id)
    }
  }, [activeSeason, teamId, isReady, fetchRoster])

  // Initialize tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['overview', 'roster', 'coaches', 'schedule', 'attendance', 'payments', 'settings', 'galleries'].includes(tabParam)) {
      // Tab is already set in URL, no need to update
    } else if (!tabParam) {
      // No tab in URL, set default to overview
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('tab', 'overview')
      setSearchParams(newSearchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - intentionally excluding searchParams/setSearchParams to avoid loops

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const handleAddAthlete = useCallback(() => {
    if (!teamId || navigating) return

    setNavigating(true)
    navigate(`/admin/teams/${teamId}/roster`)
  }, [teamId, navigate, navigating])

  const handleAddExistingAthlete = useCallback(() => {
    if (!teamId || navigating) return
    setShowAddExistingModal(true)
  }, [teamId, navigating])

  const handleAddExistingSuccess = useCallback(() => {
    // Refresh roster after adding athletes
    if (activeSeason) {
      fetchRoster(activeSeason.id)
    }
  }, [activeSeason, fetchRoster])

  // Check if user is org admin
  const isOrgAdmin = context.roles.includes('org_admin')

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

      // Update URL with tab state while preserving team context
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.set('tab', tab)
      setSearchParams(newSearchParams, { replace: true })
    },
    [searchParams, setSearchParams, navigating]
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
      <div className="oa-root">
        <OfflineBanner />
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div className="oa-skeleton" style={{ height: '200px', borderRadius: '8px', marginBottom: '24px' }} />
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '40px', width: '100px' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '250px' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="oa-root">
        <div className="oa-page-header">
          <h1 className="oa-page-title">Team not found</h1>
          {error && <p className="oa-body-m" style={{ color: 'var(--oa-danger)', marginTop: 'var(--oa-space-2)' }}>{error}</p>}
          <div style={{ marginTop: 'var(--oa-space-4)' }}>
            <OrgAdminButton variant="primary" onClick={() => navigate(getLink('admin.teams.list'))}>
              Back to Teams
            </OrgAdminButton>
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
  const primaryColor = 'var(--oa-theme-action-primary, var(--org-btn-primary-bg, #137fec))'

  return (
    <div className="oa-root">
      {/* Header */}
      <div
        style={{
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Header content constrained to main content width */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            padding: 'var(--oa-space-6) var(--oa-space-4)',
          }}
          className="md:px-8"
        >
          {/* Breadcrumbs */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--oa-space-2)',
              marginBottom: 'var(--oa-space-4)',
            }}
          >
            {sportName && (
              <>
                {sportId ? (
                  <button
                    onClick={() => handleBreadcrumbClick('/admin/sports', sportId)}
                    disabled={navigating}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textDecoration: 'none',
                      background: 'none',
                      border: 'none',
                      cursor: navigating ? 'not-allowed' : 'pointer',
                      opacity: navigating ? 0.6 : 1,
                      padding: 0,
                      lineHeight: 'normal',
                      color: 'var(--pa-text-muted)'
                    }}
                  >
                    {sportName}
                  </button>
                ) : (
                  <Link
                    to={getLink('admin.sports.list')}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textDecoration: 'none',
                      lineHeight: 'normal',
                      color: 'var(--pa-text-muted)'
                    }}
                  >
                    {sportName}
                  </Link>
                )}
                <span style={{ fontSize: '12px', fontWeight: 500, lineHeight: 'normal' }} className="text-[var(--org-text-muted)] dark:text-slate-400">/</span>
              </>
            )}
            {programName && (
              <>
                {programId ? (
                  <button
                    onClick={() => handleBreadcrumbClick('/admin/programs', programId)}
                    disabled={navigating}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textDecoration: 'none',
                      background: 'none',
                      border: 'none',
                      cursor: navigating ? 'not-allowed' : 'pointer',
                      opacity: navigating ? 0.6 : 1,
                      padding: 0,
                      lineHeight: 'normal',
                      color: 'var(--pa-text-muted)'
                    }}
                  >
                    {programName}
                  </button>
                ) : (
                  <Link
                    to={getLink('admin.programs.list')}
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      textDecoration: 'none',
                      lineHeight: 'normal',
                      color: 'var(--pa-text-muted)'
                    }}
                  >
                    {programName}
                  </Link>
                )}
                <span style={{ fontSize: '12px', fontWeight: 500, lineHeight: 'normal' }} className="text-[var(--org-text-muted)] dark:text-slate-400">/</span>
              </>
            )}
            {levelName && (
              <>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    lineHeight: 'normal',
                  }}
                  className="text-[var(--org-text-muted)] dark:text-slate-400"
                >
                  {levelName}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500, lineHeight: 'normal' }} className="text-[var(--org-text-muted)] dark:text-slate-400">/</span>
              </>
            )}
            {team && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  lineHeight: 'normal',
                }}
                className="text-[var(--org-text-muted)] dark:text-slate-400"
              >
                {team.name}
              </span>
            )}
          </div>

          {/* Page title with optional icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--oa-space-4)', marginBottom: 'var(--oa-space-6)' }}>
            <span
              className="material-symbols-outlined"
              style={{
                color: 'var(--pa-text-muted)',
                fontSize: '32px',
                fontVariationSettings: "'FILL' 1"
              }}
            >
              groups
            </span>
            <h1
              style={{
                fontFamily: 'var(--oa-font-display)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 700,
                lineHeight: 1.2,
                margin: 0,
              }}
              className="text-[var(--org-text-primary)] dark:text-white"
            >
              {team.name}
            </h1>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 'var(--oa-space-3)' }}>
            {isOrgAdmin && (
              <Button
                onClick={handleAddExistingAthlete}
                disabled={!teamId || navigating || loading || !activeSeason}
                variant="secondary"
                icon="group_add"
              >
                ADD EXISTING
              </Button>
            )}
            <Button
              onClick={handleAddAthlete}
              disabled={!teamId || navigating || loading}
              loading={navigating}
              icon="person_add"
            >
              ADD ATHLETE
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: 'var(--oa-space-6) var(--oa-space-4)',
        }}
        className="md:px-8"
      >

        {/* Navigation Tabs */}
        <div style={{ marginBottom: 'var(--oa-space-6)' }}>
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--oa-n200)',
              gap: 'var(--oa-space-8)',
              overflowX: 'auto',
            }}
            className="dark:border-slate-700"
          >
            {['overview', 'roster', 'coaches', 'schedule', 'attendance', 'payments', 'settings', 'galleries'].map((tab) => (
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
                  paddingBottom: '14px',
                  paddingTop: 'var(--oa-space-4)',
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
                  color: activeTab === tab ? 'var(--pa-text-primary)' : 'var(--pa-text-muted)'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.color = 'var(--org-btn-primary-bg)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.color = 'var(--pa-text-muted)'
                  }
                }}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Tabs */}
        {activeTab === 'overview' && (
          <TeamOverviewTab
            teamId={teamId}
            teamName={team.name}
            sportName={sportName}
            programName={programName}
            levelName={levelName}
            seasonName={activeSeason?.name || null}
            totalAthletes={teamStats.totalAthletes}
            activeAthletes={teamStats.activeAthletes}
          />
        )}

        {activeTab === 'coaches' && team && (
          <TeamCoachesTab teamId={teamId || ''} orgId={context.orgId} />
        )}

        {activeTab === 'roster' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--oa-space-6)',
            }}
            className="lg:flex-row"
          >
            {/* Roster Table */}
            <div style={{ flex: 1 }}>
              {/* Top row with title and org-level link */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--oa-space-4)' }}>
                <div>
                  <h3 className="oa-h3" style={{ margin: 0 }}>
                    Roster
                  </h3>
                  <p className="oa-body-s dark:text-slate-400" style={{ color: 'var(--oa-n500)', margin: 'var(--oa-space-1) 0 0 0' }}>
                    {roster.length} athlete{roster.length !== 1 ? 's' : ''} on team
                  </p>
                </div>
                <Button variant="secondary" size="compact" onClick={() => navigate('/admin/athletes')}>  
                  View organization roster
                </Button>
              </div>

              {rosterLoading ? (
                <div className="oa-card">
                  <div className="oa-skeleton" style={{ height: '200px' }} />
                </div>
              ) : roster.length === 0 ? (
                <div className="oa-card">
                  <EmptyRosterState
                    teamId={teamId || ''}
                    seasonId={activeSeason?.id || null}
                    onAddAthlete={handleAddAthlete}
                    onAthleteAdded={handleAddExistingSuccess}
                  />
                </div>
              ) : (
                <div
                  className="oa-card oa-card--no-padding"
                >
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--pa-surface-panel)' }}>
                        <th
                          style={{
                            padding: 'var(--oa-space-4) var(--oa-space-6)',
                            color: 'var(--pa-text-secondary)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--oa-n200)',
                            borderBottomColor: 'var(--pa-border-default)'
                          }}
                        >
                          Athlete Name
                        </th>
                        <th
                          style={{
                            padding: 'var(--oa-space-4) var(--oa-space-6)',
                            color: 'var(--pa-text-secondary)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--oa-n200)',
                            borderBottomColor: 'var(--pa-border-default)'
                          }}
                        >
                          Jersey #
                        </th>
                        <th
                          style={{
                            padding: 'var(--oa-space-4) var(--oa-space-6)',
                            color: 'var(--pa-text-secondary)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--oa-n200)',
                            borderBottomColor: 'var(--pa-border-default)'
                          }}
                        >
                          Position
                        </th>
                        <th
                          style={{
                            padding: 'var(--oa-space-4) var(--oa-space-6)',
                            color: 'var(--pa-text-secondary)',
                            fontSize: '12px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderBottom: '1px solid var(--oa-n200)',
                            borderBottomColor: 'var(--pa-border-default)'
                          }}
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
                        const athleteId = member.athlete?.id || member.athlete_id || (member as { child_id?: string }).child_id

                        return (
                          <tr
                            key={member.id}
                            onClick={() => athleteId && handleAthleteClick(athleteId)}
                            style={{
                              transition: 'background-color 200ms',
                              cursor: athleteId && !navigating ? 'pointer' : 'default',
                              background: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (athleteId && !navigating) {
                                e.currentTarget.style.background = 'var(--oa-n50)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <td style={{ padding: 'var(--oa-space-5) var(--oa-space-6)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--oa-space-3)' }}>
                                <div
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: isActive ? `color-mix(in srgb, ${primaryColor} 10%, transparent)` : 'var(--oa-n200)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isActive ? primaryColor : 'var(--oa-n500)',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    ...(!isActive ? { background: 'var(--pa-surface-panel)', color: 'var(--pa-text-muted)' } : {})
                                  }}
                                >
                                  {initials}
                                </div>
                                <span 
                                  style={{ 
                                    color: 'var(--pa-text-primary)', 
                                    fontWeight: 700 
                                  }}
                                >
                                  {fullName}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: 'var(--oa-space-5) var(--oa-space-6)', color: primaryColor, fontWeight: 900, letterSpacing: '-0.02em' }}>
                              {jerseyNumber !== '—' ? `#${jerseyNumber}` : jerseyNumber}
                            </td>
                            <td style={{ padding: 'var(--oa-space-5) var(--oa-space-6)', color: 'var(--oa-n600)', fontWeight: 500 }} className="dark:text-slate-400">
                              {position}
                            </td>
                            <td style={{ padding: 'var(--oa-space-5) var(--oa-space-6)' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 12px',
                                  borderRadius: '9999px',
                                  background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'var(--pa-surface-panel)',
                                  color: isActive ? 'rgb(16, 185, 129)' : 'var(--pa-text-muted)',
                                  fontSize: '10px',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em'
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isActive ? 'rgb(16, 185, 129)' : 'var(--oa-n400)',
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
                gap: 'var(--oa-space-6)',
              }}
            >
              {/* Team Summary Card */}
              <div
                style={{
                  padding: 'var(--oa-space-6)',
                  borderRadius: 'var(--oa-radius-l)',
                  border: `1px solid color-mix(in srgb, ${primaryColor} 20%, transparent)`,
                  borderColor: 'var(--pa-border-default)',
                  background: 'var(--pa-surface-panel)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--oa-space-3)', marginBottom: 'var(--oa-space-4)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: primaryColor, fontWeight: 700 }}>
                    analytics
                  </span>
                  <h3
                    style={{
                      fontSize: '12px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--pa-text-secondary)',
                      margin: 0,
                    }}
                  >
                    Team Summary
                  </h3>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--oa-space-4)',
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
                        color: 'var(--oa-n500)',
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
                        color: 'var(--oa-n500)',
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
                        color: 'var(--oa-n500)',
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
                        color: 'var(--oa-n500)',
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
                  padding: 'var(--oa-space-6)',
                  borderRadius: 'var(--oa-radius-l)',
                  border: '1px solid var(--oa-n200)',
                  borderColor: 'var(--pa-border-default)',
                  background: 'var(--pa-surface-panel)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--oa-space-3)', marginBottom: 'var(--oa-space-4)' }}>
                  <span className="material-symbols-outlined dark:text-slate-400" style={{ fontSize: '20px', color: 'var(--oa-n400)', fontWeight: 700 }}>
                    notifications
                  </span>
                  <h3
                    style={{
                      fontSize: '12px',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--pa-text-secondary)',
                      margin: 0,
                    }}
                  >
                    Recent Activity
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--oa-space-4)' }}>
                  <div style={{ display: 'flex', gap: 'var(--oa-space-3)' }}>
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
                      <p style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2, margin: 0, color: 'var(--oa-n900)' }} className="dark:text-white">
                        New athlete added to roster
                      </p>
                      <p
                        style={{
                          fontSize: '10px',
                          color: 'var(--pa-text-muted)',
                          textTransform: 'uppercase',
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          marginTop: '4px',
                        }}
                      >
                        2 hours ago
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--oa-space-3)' }}>
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
                      <p style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2, margin: 0, color: 'var(--oa-n900)' }} className="dark:text-white">
                        Jersey # assignment updated
                      </p>
                      <p
                        style={{
                          fontSize: '10px',
                          color: 'var(--pa-text-muted)',
                          textTransform: 'uppercase',
                          fontWeight: 900,
                          letterSpacing: '0.1em',
                          marginTop: '4px',
                        }}
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

        {activeTab === 'schedule' && (
          <TeamScheduleTab
            teamId={teamId}
            seasonId={activeSeason?.id || null}
            teamName={team.name}
          />
        )}

        {activeTab === 'attendance' && (
          <TeamAttendanceTab
            teamId={teamId}
            seasonId={activeSeason?.id || null}
            teamName={team.name}
          />
        )}

        {activeTab === 'payments' && (
          <TeamPaymentsTab
            teamId={teamId}
            seasonId={activeSeason?.id || null}
            teamName={team.name}
          />
        )}

        {activeTab === 'settings' && (
          <TeamSettingsTab
            teamId={teamId}
            teamName={team.name}
          />
        )}

        {activeTab === 'galleries' && (
          <div className="oa-mt-4">
            <PhotoSection
              entityType="team"
              entityId={teamId}
              title="Team Photos"
              context="admin"
            />
          </div>
        )}
      </div>

      {/* Add Existing Athlete Modal */}
      {activeSeason && (
        <AddExistingAthleteModal
          open={showAddExistingModal}
          onClose={() => setShowAddExistingModal(false)}
          teamId={teamId}
          seasonId={activeSeason.id}
          onSuccess={handleAddExistingSuccess}
        />
      )}
    </div>
  )
}
