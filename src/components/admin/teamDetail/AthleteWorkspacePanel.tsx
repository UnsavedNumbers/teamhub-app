import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AthleteAvatar from '../../portal/AthleteAvatar'
import { Badge, Button, Card, EmptyState, Input, Select } from '..'
import { BasicInfoForm } from '../../athleteProfiles/BasicInfoForm'
import { UniversalFieldsForm } from '../../athleteProfiles/UniversalFieldsForm'
import { SportProfileCard } from '../../athleteProfiles/SportProfileCard'
import { MedicalInfoForm } from '../../athleteProfiles/MedicalInfoForm'
import { PhotoSection } from '../../galleries/PhotoSection'
import { calculateAge, getDisplayName } from '../../../utils/athleteHelpers'
import { getLink } from '../../../utils/routes'
import { showError, showSuccess } from '../../../utils/toast'
import { supabase } from '../../../lib/supabase'
import { useUserContext } from '../../../hooks/useUserContext'
import { useSportFieldDefinitions } from '../../../hooks/useSportFieldDefinitions'
import { useAthleteSportProfile } from '../../../hooks/useAthleteSportProfile'
import type { SportCode } from '../../../types/sports'
import type { TeamAthleteWorkspaceData, AthleteWorkspaceTab, TeamDetailPermissions, TeamDetailSummary, TeamRosterMemberSummary } from './types'

interface AthleteWorkspacePanelProps {
  team: TeamDetailSummary
  workspace: TeamAthleteWorkspaceData
  selectedRosterMember: TeamRosterMemberSummary | null
  activeTab: AthleteWorkspaceTab
  onTabChange: (tab: AthleteWorkspaceTab) => void
  permissions: TeamDetailPermissions
  onRefreshRoster: () => Promise<void>
}

function toMembershipStatus(status: TeamRosterMemberSummary['status']): 'active' | 'invited' | 'removed' {
  if (status === 'pending') return 'invited'
  if (status === 'inactive') return 'removed'
  return 'active'
}

const WORKSPACE_TABS: Array<{ id: AthleteWorkspaceTab; label: string }> = [
  { id: 'summary', label: 'Summary' },
  { id: 'profile', label: 'Profile' },
  { id: 'sports', label: 'Sports' },
  { id: 'teams', label: 'Teams' },
  { id: 'guardians', label: 'Guardians' },
  { id: 'medical', label: 'Medical' },
  { id: 'media', label: 'Media' },
]

function normalizeSportCode(value: string | null | undefined): SportCode | null {
  const normalized = (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  if (!normalized) return null
  const aliases: Record<string, SportCode> = {
    soccer: 'soccer',
    basketball: 'basketball',
    baseball: 'baseball',
    football: 'football',
    flag_football: 'football',
    softball: 'softball' as SportCode,
    volleyball: 'volleyball' as SportCode,
    lacrosse: 'lacrosse' as SportCode,
    wrestling: 'wrestling' as SportCode,
    tennis: 'tennis' as SportCode,
    golf: 'golf' as SportCode,
    hockey: 'ice_hockey' as SportCode,
    ice_hockey: 'ice_hockey' as SportCode,
    field_hockey: 'field_hockey' as SportCode,
    track_and_field: 'track' as SportCode,
    track: 'track' as SportCode,
    cross_country: 'cross_country' as SportCode,
  }
  return aliases[normalized] ?? (normalized as SportCode)
}

export function AthleteWorkspacePanel({
  team,
  workspace,
  selectedRosterMember,
  activeTab,
  onTabChange,
  permissions,
  onRefreshRoster,
}: AthleteWorkspacePanelProps) {
  const { context } = useUserContext()
  const [rosterForm, setRosterForm] = useState({ jerseyNumber: '', position: '', status: 'active' as TeamRosterMemberSummary['status'] })
  const [savingRoster, setSavingRoster] = useState(false)
  const [selectedSportCode, setSelectedSportCode] = useState<SportCode | null>(null)

  const athlete = workspace.athlete
  const canViewWorkspacePii = workspace.sensitiveAccess?.canViewPii === true
  const canViewWorkspaceMedical = workspace.sensitiveAccess?.canViewMedical === true
  const teamSportCode = normalizeSportCode(team.sport?.name)
  const availableSportCodes = useMemo(
    () => workspace.sports
      .map((sport) => normalizeSportCode(sport.sport_name))
      .filter((sport): sport is SportCode => Boolean(sport)),
    [workspace.sports]
  )

  const visibleTabs = WORKSPACE_TABS.filter((tab) => {
    if (tab.id === 'guardians') return permissions.canViewGuardians && canViewWorkspacePii
    if (tab.id === 'medical') return permissions.canViewMedical && canViewWorkspaceMedical
    if (tab.id === 'media') return permissions.canViewMedia
    return true
  })

  useEffect(() => {
    if (selectedRosterMember) {
      setRosterForm({
        jerseyNumber: selectedRosterMember.jerseyNumber || selectedRosterMember.fallbackJerseyNumber || '',
        position: selectedRosterMember.position || '',
        status: selectedRosterMember.status,
      })
    }
  }, [selectedRosterMember])

  useEffect(() => {
    const preferred = teamSportCode && availableSportCodes.includes(teamSportCode)
      ? teamSportCode
      : availableSportCodes[0] ?? teamSportCode
    setSelectedSportCode(preferred ?? null)
  }, [availableSportCodes, teamSportCode])

  const canShowEditableProfile = permissions.canEditProfileBasics && athlete
  const canShowEditableUniversal = permissions.canEditUniversalFields && athlete
  const canShowEditableSports = permissions.canEditSports && athlete && selectedSportCode

  const handleSaveRosterContext = async () => {
    if (!selectedRosterMember) return

    setSavingRoster(true)
    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({
          jersey_number: rosterForm.jerseyNumber.trim() || null,
          position: rosterForm.position.trim() || null,
          status: toMembershipStatus(rosterForm.status),
          updated_at: new Date().toISOString(),
          updated_by_user_id: context.userId,
        })
        .eq('id', selectedRosterMember.membershipId)

      if (error) throw error

      showSuccess('Team athlete details updated')
      await Promise.all([workspace.refresh(), onRefreshRoster()])
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update roster details')
    } finally {
      setSavingRoster(false)
    }
  }

  if (!athlete && workspace.loading) {
    return (
      <Card className="team-detail-card team-detail-card--workspace">
        <div className="team-detail-workspace-loading">
          <div className="oa-skeleton" style={{ height: 140, borderRadius: 24 }} />
          <div className="oa-skeleton" style={{ height: 240, borderRadius: 24 }} />
          <div className="oa-skeleton" style={{ height: 240, borderRadius: 24 }} />
        </div>
      </Card>
    )
  }

  if (!athlete) {
    return (
      <Card className="team-detail-card team-detail-card--workspace">
        <EmptyState
          icon="person_search"
          title="Select an athlete"
          description="Choose a roster member to open the embedded athlete workspace."
          noCard
        />
      </Card>
    )
  }

  const displayName = getDisplayName(athlete)
  const athleteAge = athlete.date_of_birth ? calculateAge(athlete.date_of_birth) : null

  return (
    <div className="team-detail-workspace-panel">
      <Card className="team-detail-card team-detail-card--workspace">
        <div className="team-detail-athlete-header">
          <div className="team-detail-athlete-identity">
            <div className="team-detail-athlete-avatar">
              <AthleteAvatar athlete={athlete} photoSize="512" className="team-detail-athlete-avatar-image" />
            </div>
            <div>
              <div className="team-detail-kicker">Current Team Athlete</div>
              <h2 className="team-detail-athlete-name">{displayName}</h2>
              <div className="team-detail-athlete-meta">
                {athleteAge ? <span>{athleteAge} years old</span> : null}
                {selectedRosterMember?.displayJerseyNumber ? <span>#{selectedRosterMember.displayJerseyNumber}</span> : null}
                {selectedRosterMember?.position ? <span>{selectedRosterMember.position}</span> : null}
                <Badge variant={selectedRosterMember?.status === 'active' ? 'success' : selectedRosterMember?.status === 'pending' ? 'warning' : 'neutral'}>
                  {selectedRosterMember?.status || 'active'}
                </Badge>
              </div>
              <div className="team-detail-scope-pills">
                <span className="team-detail-scope-pill">Current Team</span>
                {permissions.canViewOtherTeams && workspace.teamMemberships.length > 1 ? (
                  <span className="team-detail-scope-pill">Other Teams In Org</span>
                ) : null}
                {permissions.canViewOtherSports && workspace.sports.length > 1 ? (
                  <span className="team-detail-scope-pill">Other Sports</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="team-detail-header-actions">
            <Link className="oa-btn oa-btn--secondary" to={`${getLink('admin.athletes.detail', { id: athlete.id })}?tab=overview`}>
              Full Athlete Detail
            </Link>
          </div>
        </div>

        <div className="team-detail-athlete-tabs pa-tabs-list" role="tablist" aria-label="Athlete workspace tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`team-detail-athlete-tab pa-tabs-trigger ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {workspace.error ? (
          <div className="team-detail-inline-error">{workspace.error}</div>
        ) : null}

        {activeTab === 'summary' && (
          <div className="team-detail-tab-panel team-detail-tab-panel--summary">
            <Card title="Team Context" className="team-detail-subcard">
              <div className="team-detail-grid-two">
                <div>
                  <label className="team-detail-field-label">Jersey Number</label>
                  <Input
                    value={rosterForm.jerseyNumber}
                    onChange={(event) => setRosterForm((previous) => ({ ...previous, jerseyNumber: event.target.value }))}
                    disabled={!permissions.canEditRosterFields || savingRoster}
                    placeholder="No jersey"
                  />
                </div>
                <div>
                  <label className="team-detail-field-label">Position</label>
                  <Input
                    value={rosterForm.position}
                    onChange={(event) => setRosterForm((previous) => ({ ...previous, position: event.target.value }))}
                    disabled={!permissions.canEditRosterFields || savingRoster}
                    placeholder="Position"
                  />
                </div>
                <div>
                  <label className="team-detail-field-label">Status</label>
                  <Select
                    value={rosterForm.status}
                    onChange={(event) => setRosterForm((previous) => ({ ...previous, status: event.target.value as TeamRosterMemberSummary['status'] }))}
                    disabled={!permissions.canEditRosterFields || savingRoster}
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
              </div>
              {permissions.canEditRosterFields ? (
                <div className="team-detail-action-row">
                  <Button variant="primary" onClick={handleSaveRosterContext} disabled={savingRoster}>
                    {savingRoster ? 'Saving...' : 'Save team context'}
                  </Button>
                </div>
              ) : null}
            </Card>

            <div className="team-detail-summary-grid">
              <SummaryMetric label="Recorded Attendance" value={workspace.attendanceSummary.totalRecordedEvents.toString()} tone="neutral" />
              <SummaryMetric label="Attendance Rate" value={workspace.attendanceSummary.attendanceRate != null ? `${workspace.attendanceSummary.attendanceRate}%` : 'No data'} tone="success" />
              <SummaryMetric label="Sports" value={workspace.sports.length.toString()} tone="neutral" />
              <SummaryMetric label="Guardians" value={permissions.canViewGuardians && canViewWorkspacePii ? workspace.guardians.length.toString() : 'Restricted'} tone="neutral" />
            </div>

            <Card title="Upcoming Team Events" className="team-detail-subcard">
              {workspace.upcomingEvents.length === 0 ? (
                <p className="team-detail-muted-copy">No upcoming team events loaded for this athlete.</p>
              ) : (
                <div className="team-detail-list">
                  {workspace.upcomingEvents.map((event) => (
                    <div key={event.id} className="team-detail-list-row">
                      <div>
                        <div className="team-detail-list-title">{event.title}</div>
                        <div className="team-detail-list-meta">
                          <span>{new Date(event.startTime).toLocaleString()}</span>
                          {event.locationName ? <span>{event.locationName}</span> : null}
                        </div>
                      </div>
                      {event.attendanceStatus ? <Badge variant="neutral">{event.attendanceStatus}</Badge> : null}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {permissions.canViewPayments && workspace.paymentSummary ? (
              <Card title="Payments" className="team-detail-subcard">
                <div className="team-detail-summary-grid team-detail-summary-grid--narrow">
                  <SummaryMetric label="Assignments" value={workspace.paymentSummary.assignmentCount.toString()} tone="neutral" />
                  <SummaryMetric label="Paid" value={workspace.paymentSummary.paidCount.toString()} tone="success" />
                  <SummaryMetric label="Overdue" value={workspace.paymentSummary.overdueCount.toString()} tone={workspace.paymentSummary.overdueCount > 0 ? 'warning' : 'neutral'} />
                  <SummaryMetric label="Outstanding" value={`$${(workspace.paymentSummary.outstandingBalanceCents / 100).toFixed(2)}`} tone={workspace.paymentSummary.outstandingBalanceCents > 0 ? 'warning' : 'success'} />
                </div>
              </Card>
            ) : null}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="team-detail-tab-panel">
            {canShowEditableProfile ? (
              <Card title="Basic Information" className="team-detail-subcard">
                <BasicInfoForm athlete={athlete} onSave={() => void workspace.refresh()} />
              </Card>
            ) : (
              <Card title="Basic Information" className="team-detail-subcard">
                <ReadOnlyProfile athlete={athlete} selectedRosterMember={selectedRosterMember} />
              </Card>
            )}

            {canShowEditableUniversal ? (
              <Card title="Physical Information" className="team-detail-subcard">
                <UniversalFieldsForm athlete={athlete} onSave={() => void workspace.refresh()} />
              </Card>
            ) : (
              <Card title="Physical Information" className="team-detail-subcard">
                <ReadOnlyPhysical athlete={athlete} />
              </Card>
            )}
          </div>
        )}

        {activeTab === 'sports' && (
          <div className="team-detail-tab-panel">
            <Card title="Sport Profile Access" className="team-detail-subcard">
              {workspace.sports.length === 0 ? (
                <p className="team-detail-muted-copy">This athlete does not have any sport records yet.</p>
              ) : (
                <>
                  <div className="team-detail-sport-switcher">
                    {availableSportCodes.map((sportCode) => (
                      <button
                        key={sportCode}
                        type="button"
                        className={`team-detail-sport-pill ${selectedSportCode === sportCode ? 'is-active' : ''}`}
                        onClick={() => setSelectedSportCode(sportCode)}
                      >
                        {sportCode.replace(/_/g, ' ')}
                        {teamSportCode === sportCode ? ' · team sport' : ''}
                      </button>
                    ))}
                  </div>
                  {canShowEditableSports ? (
                    <SportProfileCard athleteId={athlete.id} sportCode={selectedSportCode} onSave={() => void workspace.refresh()} />
                  ) : selectedSportCode ? (
                    <ReadOnlySportSummary athleteId={athlete.id} sportCode={selectedSportCode} />
                  ) : null}
                </>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="team-detail-tab-panel">
            <Card title="Team History" className="team-detail-subcard">
              {workspace.teamMemberships.length === 0 ? (
                <p className="team-detail-muted-copy">No team memberships are available.</p>
              ) : (
                <div className="team-detail-list">
                  {workspace.teamMemberships.map((membership) => (
                    <div key={membership.id} className="team-detail-list-row">
                      <div>
                        <div className="team-detail-list-title">{membership.team_name}</div>
                        <div className="team-detail-list-meta">
                          <span>{membership.season_name}</span>
                          {membership.program_name ? <span>{membership.program_name}</span> : null}
                          {membership.sport_name ? <span>{membership.sport_name}</span> : null}
                          {membership.position ? <span>{membership.position}</span> : null}
                          {membership.jersey_number ? <span>#{membership.jersey_number}</span> : null}
                        </div>
                      </div>
                      <Badge variant={membership.team_id === team.id ? 'success' : 'neutral'}>
                        {membership.team_id === team.id ? 'Current team' : membership.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'guardians' && permissions.canViewGuardians && canViewWorkspacePii && (
          <div className="team-detail-tab-panel">
            <Card title="Guardians" className="team-detail-subcard">
              {workspace.guardians.length === 0 && workspace.pendingInvites.length === 0 ? (
                <p className="team-detail-muted-copy">No guardians or pending invites are linked to this athlete.</p>
              ) : (
                <div className="team-detail-list">
                  {workspace.guardians.map((guardian) => (
                    <div key={guardian.id} className="team-detail-list-row">
                      <div>
                        <div className="team-detail-list-title">{guardian.display_name || guardian.email}</div>
                        <div className="team-detail-list-meta">
                          <span>{guardian.email}</span>
                          {guardian.phone ? <span>{guardian.phone}</span> : null}
                          <span>{guardian.relationship_type}</span>
                        </div>
                      </div>
                      <Badge variant="success">{guardian.status}</Badge>
                    </div>
                  ))}
                  {workspace.pendingInvites.map((invite) => (
                    <div key={invite.id} className="team-detail-list-row">
                      <div>
                        <div className="team-detail-list-title">{invite.email}</div>
                        <div className="team-detail-list-meta">
                          <span>Invite pending</span>
                          <span>Expires {new Date(invite.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge variant="warning">pending</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div className="team-detail-action-row">
                <Link className="oa-btn oa-btn--secondary" to={`${getLink('admin.athletes.detail', { id: athlete.id })}?tab=guardians`}>
                  Open guardian workflow
                </Link>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'medical' && permissions.canViewMedical && canViewWorkspaceMedical && (
          <div className="team-detail-tab-panel">
            <Card title="Medical Information" className="team-detail-subcard">
              <MedicalInfoForm athleteId={athlete.id} athleteName={displayName} onSave={() => void workspace.refresh()} />
            </Card>
          </div>
        )}

        {activeTab === 'media' && permissions.canViewMedia && (
          <div className="team-detail-tab-panel">
            <Card title="Athlete Media" className="team-detail-subcard">
              <PhotoSection entityType="athlete" entityId={athlete.id} orgId={athlete.org_id} title="Athlete photos" context="admin" />
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
}

function SummaryMetric({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'success' | 'warning' }) {
  return (
    <div className={`team-detail-metric-card is-${tone}`}>
      <span className="team-detail-metric-value">{value}</span>
      <span className="team-detail-metric-label">{label}</span>
    </div>
  )
}

function ReadOnlyProfile({ athlete, selectedRosterMember }: { athlete: NonNullable<TeamAthleteWorkspaceData['athlete']>; selectedRosterMember: TeamRosterMemberSummary | null }) {
  return (
    <div className="team-detail-grid-two">
      <ReadOnlyField label="First name" value={athlete.first_name} />
      <ReadOnlyField label="Last name" value={athlete.last_name} />
      <ReadOnlyField label="Preferred name" value={athlete.preferred_name} />
      <ReadOnlyField label="Date of birth" value={athlete.date_of_birth ? new Date(athlete.date_of_birth).toLocaleDateString() : null} />
      <ReadOnlyField label="Phone" value={athlete.phone} />
      <ReadOnlyField label="Email" value={athlete.email} />
      <ReadOnlyField label="Team jersey" value={selectedRosterMember?.displayJerseyNumber ? `#${selectedRosterMember.displayJerseyNumber}` : null} />
      <ReadOnlyField label="Position" value={selectedRosterMember?.position} />
    </div>
  )
}

function ReadOnlyPhysical({ athlete }: { athlete: NonNullable<TeamAthleteWorkspaceData['athlete']> }) {
  return (
    <div className="team-detail-grid-two">
      <ReadOnlyField label="Height" value={athlete.height_cm ? `${athlete.height_cm} cm` : null} />
      <ReadOnlyField label="Weight" value={athlete.weight_kg ? `${athlete.weight_kg} kg` : null} />
      <ReadOnlyField label="Shoe size" value={athlete.shoe_size_value ? `${athlete.shoe_size_value} ${athlete.shoe_size_system || ''}`.trim() : null} />
      <ReadOnlyField label="Shoe width" value={athlete.shoe_width} />
      <ReadOnlyField label="T-shirt size" value={athlete.tshirt_size} />
      <ReadOnlyField label="Shorts size" value={athlete.shorts_size} />
      <ReadOnlyField label="Dominant hand" value={athlete.dominant_hand} />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="team-detail-readonly-field">
      <span className="team-detail-field-label">{label}</span>
      <span className="team-detail-field-value">{value || 'Not provided'}</span>
    </div>
  )
}

function ReadOnlySportSummary({ athleteId, sportCode }: { athleteId: string; sportCode: SportCode }) {
  const { profileFields, equipmentFields, loading: definitionsLoading } = useSportFieldDefinitions(sportCode)
  const { profile, loading: profileLoading } = useAthleteSportProfile(athleteId, sportCode)

  if (definitionsLoading || profileLoading) {
    return <div className="oa-skeleton" style={{ height: 220, borderRadius: 20 }} />
  }

  return (
    <div className="team-detail-grid-two">
      {profileFields.slice(0, 6).map((field) => (
        <ReadOnlyField
          key={field.field_key}
          label={field.field_label}
          value={profile?.profile_data?.[field.field_key]?.toString() || null}
        />
      ))}
      {equipmentFields.slice(0, 4).map((field) => (
        <ReadOnlyField
          key={field.field_key}
          label={field.field_label}
          value={profile?.equipment_data?.[field.field_key]?.toString() || null}
        />
      ))}
    </div>
  )
}

