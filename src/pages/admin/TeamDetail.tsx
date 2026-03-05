import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTeamParams } from '../../hooks/useRouteParams'
import { useCoachTeamAccess } from '../../hooks/useCoachTeamAccess'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useFeatureGate } from '../../lib/featureGate'
import { hasAnyRole } from '../../utils/roleHelpers'
import { getLink } from '../../utils/routes'
import { AddExistingAthleteModal } from '../../components/admin/AddExistingAthleteModal'
import { EmptyRosterState } from '../../components/admin/EmptyRosterState'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { Badge, Button, Card, EmptyState, Select } from '../../components/admin'
import { TeamScheduleTab } from '../../components/admin/TeamScheduleTab'
import { TeamAttendanceTab } from '../../components/admin/TeamAttendanceTab'
import { TeamPaymentsTab } from '../../components/admin/TeamPaymentsTab'
import { TeamSettingsTab } from '../../components/admin/TeamSettingsTab'
import { TeamCoachesTab } from '../../components/admin/TeamCoachesTab'
import { PhotoSection } from '@/components/galleries/PhotoSection'
import { TopLevelStats } from '../../components/common/TopLevelStats'
import { TeamRosterPanel } from '../../components/admin/teamDetail/TeamRosterPanel'
import { AthleteWorkspacePanel } from '../../components/admin/teamDetail/AthleteWorkspacePanel'
import { getTeamDetailPermissions } from '../../components/admin/teamDetail/permissions'
import { useTeamDetailWorkspace } from '../../components/admin/teamDetail/useTeamDetailWorkspace'
import { useTeamAthleteWorkspaceContext } from '../../components/admin/teamDetail/useTeamAthleteWorkspaceContext'
import { useTeamRosterSelection } from '../../components/admin/teamDetail/useTeamRosterSelection'
import type { TeamDetailPrimaryTab } from '../../components/admin/teamDetail/types'
import '../../styles/orgAdmin.css'
import '../../styles/teamDetailWorkspace.css'

function useIsMobileWorkspace() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 1023px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const query = window.matchMedia('(max-width: 1023px)')
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    setIsMobile(query.matches)

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handleChange)
      return () => query.removeEventListener('change', handleChange)
    }

    query.addListener(handleChange)
    return () => query.removeListener(handleChange)
  }, [])

  return isMobile
}

const TEAM_TABS: Array<{ id: TeamDetailPrimaryTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'payments', label: 'Payments' },
  { id: 'staff', label: 'Staff' },
  { id: 'settings', label: 'Settings' },
  { id: 'media', label: 'Media' },
]

export default function TeamDetail() {
  const { teamId } = useTeamParams()
  const navigate = useNavigate()
  const { context } = useUserContext()
  const { currentOrganization } = useOrganization()
  const medicalGate = useFeatureGate('medical_enabled')
  const isMobile = useIsMobileWorkspace()
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false)
  const [showAddExistingModal, setShowAddExistingModal] = useState(false)

  const isCoach = hasAnyRole(currentOrganization, ['coach'])
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])
  const { canAccess: canAccessTeam, isLoading: checkingAccess } = useCoachTeamAccess(teamId || undefined)

  const {
    team,
    activeSeason,
    roster,
    teamStats,
    loading,
    rosterLoading,
    error,
    refreshRoster,
  } = useTeamDetailWorkspace(teamId)

  const rosterAthleteIds = useMemo(() => roster.map((member) => member.athleteId), [roster])
  const {
    activeTab,
    activeAthleteTab,
    selectedAthleteId,
    search,
    sort,
    statusFilter,
    setActiveAthleteTab,
    setActiveTab,
    setSearch,
    setSelectedAthleteId,
    setSort,
    setStatusFilter,
  } = useTeamRosterSelection({ rosterAthleteIds })

  const permissions = getTeamDetailPermissions({
    currentOrganization,
    medicalFeatureEnabled: medicalGate.allowed && !medicalGate.loading,
  })

  const filteredRoster = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = roster.filter((member) => {
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter
      const matchesSearch = !query || [
        member.fullName,
        member.preferredName,
        member.position,
        member.displayJerseyNumber,
        member.registrationStatus,
      ].some((value) => (value || '').toString().toLowerCase().includes(query))
      return matchesStatus && matchesSearch
    })

    const rankByStatus = { active: 0, pending: 1, inactive: 2 }
    return filtered.sort((left, right) => {
      if (sort === 'jersey') {
        return Number(left.displayJerseyNumber || '9999') - Number(right.displayJerseyNumber || '9999')
      }
      if (sort === 'status') {
        return rankByStatus[left.status] - rankByStatus[right.status]
      }
      if (sort === 'attendance_risk') {
        return left.profileCompletionScore - right.profileCompletionScore
      }
      return left.fullName.localeCompare(right.fullName)
    })
  }, [roster, search, sort, statusFilter])

  const selectedRosterMember = useMemo(
    () => roster.find((member) => member.athleteId === selectedAthleteId) ?? null,
    [roster, selectedAthleteId]
  )

  const athleteWorkspace = useTeamAthleteWorkspaceContext({
    athleteId: selectedAthleteId,
    teamId,
    seasonId: activeSeason?.id,
    orgId: team?.orgId ?? context.orgId,
    permissions,
  })

  useEffect(() => {
    if (!isMobile) {
      setMobileWorkspaceOpen(false)
    }
  }, [isMobile])

  if (isCoach && !isOrgAdmin && !checkingAccess && teamId && !canAccessTeam) {
    return <Navigate to={getLink('admin.teams.list')} replace />
  }

  if (loading) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <div className="team-detail-loading-shell">
          <div className="oa-skeleton" style={{ height: 180, borderRadius: 28 }} />
          <div className="oa-skeleton" style={{ height: 520, borderRadius: 28 }} />
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <Card className="team-detail-card team-detail-card--empty">
          <EmptyState
            icon="groups"
            title="Team not found"
            description={error || 'The team may not exist or you may not have permission to view it.'}
            noCard
          />
          <div className="team-detail-action-row">
            <Button variant="primary" onClick={() => navigate(getLink('admin.teams.list'))}>
              Back to Teams
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const handleAddAthlete = () => {
    navigate(`/admin/teams/${team.id}/roster`)
  }

  const handleSelectAthlete = (athleteId: string) => {
    setSelectedAthleteId(athleteId)
    if (isMobile) {
      setMobileWorkspaceOpen(true)
    }
  }

  const renderTeamModule = () => {
    if (activeTab === 'overview') {
      if (roster.length === 0) {
        return (
          <Card className="team-detail-card team-detail-card--roster-empty">
            <EmptyRosterState
              teamId={team.id}
              seasonId={activeSeason?.id || null}
              onAddAthlete={handleAddAthlete}
              onAthleteAdded={() => void refreshRoster()}
            />
          </Card>
        )
      }

      return (
        <TeamRosterPanel
          roster={filteredRoster}
          rosterLoading={rosterLoading}
          selectedAthleteId={selectedAthleteId}
          search={search}
          statusFilter={statusFilter}
          sort={sort}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onSortChange={setSort}
          onSelectAthlete={handleSelectAthlete}
          onAddAthlete={handleAddAthlete}
          onAddExistingAthlete={() => setShowAddExistingModal(true)}
          teamStats={teamStats}
        />
      )
    }

    if (activeTab === 'schedule') {
      return <TeamScheduleTab teamId={team.id} seasonId={activeSeason?.id || null} teamName={team.name} />
    }

    if (activeTab === 'attendance') {
      return <TeamAttendanceTab teamId={team.id} seasonId={activeSeason?.id || null} teamName={team.name} />
    }

    if (activeTab === 'payments') {
      return <TeamPaymentsTab teamId={team.id} seasonId={activeSeason?.id || null} teamName={team.name} />
    }

    if (activeTab === 'staff') {
      if (!permissions.canManageCoaches) {
        return (
          <Card className="team-detail-card team-detail-card--empty">
            <EmptyState
              icon="lock"
              title="Staff management is restricted"
              description="Coach assignments can only be managed by organization administrators."
              noCard
            />
          </Card>
        )
      }
      return <TeamCoachesTab teamId={team.id} orgId={context.orgId} />
    }

    if (activeTab === 'settings') {
      return <TeamSettingsTab teamId={team.id} teamName={team.name} />
    }

    return (
      <Card className="team-detail-card">
        <PhotoSection entityType="team" entityId={team.id} title="Team Photos" context="admin" />
      </Card>
    )
  }

  const renderWorkspaceArea = () => {
    if (activeTab === 'settings' || activeTab === 'media') {
      return null
    }

    return (
      <AthleteWorkspacePanel
        team={team}
        workspace={athleteWorkspace}
        selectedRosterMember={selectedRosterMember}
        activeTab={activeAthleteTab}
        onTabChange={setActiveAthleteTab}
        permissions={permissions}
        onRefreshRoster={refreshRoster}
      />
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />

      <div className="team-detail-page">
        <header className="team-detail-hero">
          <div className="team-detail-hero-copy">
            <div className="team-detail-breadcrumbs">
              <button type="button" onClick={() => navigate(getLink('admin.teams.list'))}>Teams</button>
              <span>/</span>
              <span>{team.name}</span>
            </div>
            <div className="team-detail-kicker">Coach/Admin Team Workspace</div>
            <h1 className="team-detail-title">{team.name}</h1>
            <div className="team-detail-hero-meta">
              {team.sport?.name ? <Badge variant="neutral">{team.sport.name}</Badge> : null}
              {team.program?.name ? <Badge variant="neutral">{team.program.name}</Badge> : null}
              {team.level?.name ? <Badge variant="neutral">{team.level.name}</Badge> : null}
              {activeSeason?.name ? <Badge variant="success">{activeSeason.name}</Badge> : null}
              <Badge variant={permissions.isOrgAdmin ? 'success' : 'warning'}>{permissions.isOrgAdmin ? 'Org admin' : 'Coach scope'}</Badge>
            </div>
            <p className="team-detail-hero-summary">
              Split workspace for roster operations and athlete capabilities in current team context.
            </p>
          </div>

          <div className="team-detail-hero-actions">
            <Button variant="secondary" onClick={() => setShowAddExistingModal(true)}>
              Add Existing Athlete
            </Button>
            <Button variant="primary" onClick={handleAddAthlete}>
              Add Athlete
            </Button>
          </div>
        </header>

        <TopLevelStats
          ariaLabel="Team detail summary metrics"
          className="team-detail-top-metrics"
          items={[
            { id: 'rostered', label: 'Rostered', value: teamStats.totalAthletes.toString() },
            { id: 'active', label: 'Active', value: teamStats.activeAthletes.toString(), tone: 'success' },
            { id: 'pending', label: 'Pending', value: teamStats.pendingAthletes.toString(), tone: 'warning' },
            { id: 'vacancies', label: 'Vacancies', value: teamStats.vacancies.toString() },
          ]}
        />

        <section className="team-detail-toolbar">
          <div className="team-detail-primary-tabs pa-tabs-list" role="tablist" aria-label="Team detail tabs">
            {TEAM_TABS.filter((tab) => tab.id !== 'settings' || permissions.canManageSettings).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`team-detail-primary-tab pa-tabs-trigger ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {roster.length > 0 && activeTab !== 'settings' && activeTab !== 'media' ? (
            <div className="team-detail-focus-tools">
              <span className="team-detail-focus-label">Athlete focus</span>
              <Select
                value={selectedAthleteId || ''}
                onChange={(event) => handleSelectAthlete(event.target.value)}
                options={roster.map((member) => ({
                  value: member.athleteId,
                  label: member.fullName,
                }))}
              />
              {isMobile && selectedAthleteId ? (
                <Button variant="secondary" onClick={() => setMobileWorkspaceOpen(true)}>
                  Open Workspace
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>

        {activeTab === 'settings' || activeTab === 'media' ? (
          <section className="team-detail-single-column">{renderTeamModule()}</section>
        ) : (
          <section className="team-detail-split-layout">
            <div className="team-detail-left-column">{renderTeamModule()}</div>
            {!isMobile ? <div className="team-detail-right-column">{renderWorkspaceArea()}</div> : null}
          </section>
        )}
      </div>

      {isMobile && mobileWorkspaceOpen && activeTab !== 'settings' && activeTab !== 'media' ? (
        <div className="team-detail-mobile-sheet" role="dialog" aria-modal="true">
          <div className="team-detail-mobile-sheet-backdrop" onClick={() => setMobileWorkspaceOpen(false)} />
          <div className="team-detail-mobile-sheet-panel">
            <div className="team-detail-mobile-sheet-header">
              <div>
                <div className="team-detail-kicker">Athlete Workspace</div>
                <strong>{selectedRosterMember?.fullName || 'Roster athlete'}</strong>
              </div>
              <Button variant="secondary" onClick={() => setMobileWorkspaceOpen(false)}>
                Close
              </Button>
            </div>
            {renderWorkspaceArea()}
          </div>
        </div>
      ) : null}

      {activeSeason ? (
        <AddExistingAthleteModal
          open={showAddExistingModal}
          onClose={() => setShowAddExistingModal(false)}
          teamId={team.id}
          seasonId={activeSeason.id}
          onSuccess={() => void refreshRoster()}
        />
      ) : null}
    </div>
  )
}

