import { useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import AthleteAvatar from '../../portal/AthleteAvatar'
import { Badge, Button, Card, EmptyState, Input, Select } from '..'
import type { Athlete } from '../../../types/family'
import type { TeamDetailStats, TeamRosterMemberSummary, TeamRosterSort, TeamRosterStatusFilter } from './types'

interface TeamRosterPanelProps {
  roster: TeamRosterMemberSummary[]
  rosterLoading: boolean
  selectedAthleteId: string | null
  search: string
  statusFilter: TeamRosterStatusFilter
  sort: TeamRosterSort
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: TeamRosterStatusFilter) => void
  onSortChange: (value: TeamRosterSort) => void
  onSelectAthlete: (athleteId: string) => void
  onAddAthlete: () => void
  onAddExistingAthlete: () => void
  teamStats: TeamDetailStats
}

function getStatusTone(status: TeamRosterMemberSummary['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

export function TeamRosterPanel({
  roster,
  rosterLoading,
  selectedAthleteId,
  search,
  statusFilter,
  sort,
  onSearchChange,
  onStatusFilterChange,
  onSortChange,
  onSelectAthlete,
  onAddAthlete,
  onAddExistingAthlete,
  teamStats,
}: TeamRosterPanelProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const shouldVirtualize = roster.length > 12

  const items = useMemo(() => roster, [roster])
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 6,
  })

  return (
    <Card className="team-detail-card team-detail-card--roster">
      <div className="team-detail-section-header">
        <div>
          <div className="team-detail-kicker">Team Workspace</div>
          <h2 className="team-detail-section-title">Roster</h2>
          <p className="team-detail-section-copy">Select an athlete to open the team-context workspace.</p>
        </div>
        <div className="team-detail-header-actions team-detail-header-actions--stacked">
          <Button variant="secondary" onClick={onAddExistingAthlete}>Add Existing</Button>
          <Button variant="primary" onClick={onAddAthlete}>Add Athlete</Button>
        </div>
      </div>

      <div className="team-detail-stat-grid team-detail-stat-grid--compact">
        <div className="team-detail-stat-card">
          <span className="team-detail-stat-value">{teamStats.totalAthletes}</span>
          <span className="team-detail-stat-label">Rostered</span>
        </div>
        <div className="team-detail-stat-card">
          <span className="team-detail-stat-value">{teamStats.activeAthletes}</span>
          <span className="team-detail-stat-label">Active</span>
        </div>
        <div className="team-detail-stat-card">
          <span className="team-detail-stat-value">{teamStats.pendingAthletes}</span>
          <span className="team-detail-stat-label">Pending</span>
        </div>
        <div className="team-detail-stat-card">
          <span className="team-detail-stat-value">{teamStats.vacancies}</span>
          <span className="team-detail-stat-label">Vacancies</span>
        </div>
      </div>

      <div className="team-detail-roster-controls">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search roster"
        />
        <Select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as TeamRosterStatusFilter)}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <Select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as TeamRosterSort)}
          options={[
            { value: 'name', label: 'Sort: Name' },
            { value: 'jersey', label: 'Sort: Jersey' },
            { value: 'status', label: 'Sort: Status' },
            { value: 'attendance_risk', label: 'Sort: Attention' },
          ]}
        />
      </div>

      {rosterLoading ? (
        <div className="team-detail-roster-loading">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="oa-skeleton" style={{ height: 84, borderRadius: 20 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="groups"
          title="No athletes match this roster view"
          description="Adjust filters or add athletes to start the team workspace."
          noCard
        />
      ) : shouldVirtualize ? (
        <div ref={parentRef} className="team-detail-roster-list team-detail-roster-list--virtualized">
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const member = items[virtualRow.index]
              return (
                <button
                  key={member.membershipId}
                  type="button"
                  className={`team-detail-roster-row ${selectedAthleteId === member.athleteId ? 'is-selected' : ''}`}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  onClick={() => onSelectAthlete(member.athleteId)}
                >
                  <RosterRowContent member={member} />
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="team-detail-roster-list">
          {items.map((member) => (
            <button
              key={member.membershipId}
              type="button"
              className={`team-detail-roster-row ${selectedAthleteId === member.athleteId ? 'is-selected' : ''}`}
              onClick={() => onSelectAthlete(member.athleteId)}
            >
              <RosterRowContent member={member} />
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function RosterRowContent({ member }: { member: TeamRosterMemberSummary }) {
  const athleteForAvatar: Athlete = {
    id: member.athleteId,
    family_id: null,
    first_name: member.firstName,
    last_name: member.lastName,
    date_of_birth: member.birthdate ?? '',
    gender: null,
    preferred_name: member.preferredName,
    jersey_number: member.displayJerseyNumber,
    medical_notes: null,
    allergies: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    phone: member.phone,
    email: member.email,
    photo_url: null,
    profile_photo_updated_at: member.profilePhotoUpdatedAt,
    has_profile_photo: member.hasProfilePhoto,
    height_cm: null,
    weight_kg: null,
    shoe_size_value: null,
    shoe_size_system: null,
    shoe_width: null,
    tshirt_size: null,
    shorts_size: null,
    dominant_hand: null,
    emergency_contact: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
  }

  return (
    <>
      <div className="team-detail-roster-avatar">
        <AthleteAvatar athlete={athleteForAvatar} className="team-detail-roster-avatar-image" />
      </div>
      <div className="team-detail-roster-main">
        <div className="team-detail-roster-row-topline">
          <div>
            <div className="team-detail-roster-name">{member.fullName}</div>
            <div className="team-detail-roster-subline">
              {member.preferredName ? `${member.preferredName} · ` : ''}
              {member.position || 'Position TBD'}
            </div>
          </div>
          <div className="team-detail-roster-meta">
            <span className="team-detail-roster-jersey">{member.displayJerseyNumber ? `#${member.displayJerseyNumber}` : 'No #'}</span>
            <Badge variant={getStatusTone(member.status)}>{member.status}</Badge>
          </div>
        </div>
        <div className="team-detail-roster-row-bottomline">
          <span>{member.profileCompletionScore}% profile</span>
          {member.badges.slice(0, 2).map((badge) => (
            <span key={badge} className="team-detail-inline-pill">{badge}</span>
          ))}
        </div>
      </div>
    </>
  )
}

