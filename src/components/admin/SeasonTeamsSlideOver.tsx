import { Link } from 'react-router-dom'
import '../../styles/orgAdmin.css'
import { getLink } from '../../utils/routes'

export interface SeasonTeamRow {
  id: string
  name: string
  programName?: string
  levelName?: string
  sportName?: string
}

interface SeasonTeamsSlideOverProps {
  open: boolean
  onClose: () => void
  seasonName: string
  teams: SeasonTeamRow[]
  seasonId?: string
}

export default function SeasonTeamsSlideOver({
  open,
  onClose,
  seasonName,
  teams,
  seasonId,
}: SeasonTeamsSlideOverProps) {
  if (!open) return null

  return (
    <div
      className="oa-slideover-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div
        role="presentation"
        className="oa-slideover-backdrop"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          transition: 'opacity 0.3s',
          opacity: open ? 1 : 0,
        }}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
      <div
        className="oa-slideout-container"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
        }}
        aria-modal="true"
        aria-labelledby="season-teams-slideover-title"
      >
        <div className="oa-slideout-header">
          <div className="oa-slideout-brand">
            <div className="oa-slideout-pill" aria-hidden />
            <span id="season-teams-slideover-title" className="oa-slideout-title">
              Teams
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="oa-header-btn"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" aria-hidden>close</span>
          </button>
        </div>

        <div className="oa-slideout-body" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div className="oa-slideout-hero oa-pattern-mesh" style={{ marginBottom: 24 }}>
            <span className="oa-event-tag">{seasonName}</span>
            <h2 className="oa-hero-title" style={{ fontSize: 28 }}>
              {teams.length} {teams.length === 1 ? 'team' : 'teams'}
            </h2>
          </div>

          {teams.length === 0 ? (
            <div className="oa-detail-text" style={{ textAlign: 'center', padding: 32, color: 'var(--org-text-muted)' }}>
              No teams in this season yet.
            </div>
          ) : (
            <div className="oa-stacked-list">
              {teams.map((team) => {
                const meta = [team.sportName, team.programName, team.levelName]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <Link
                    key={team.id}
                    to={getLink('admin.teams.detail', { id: team.id })}
                    className="oa-stacked-list-item"
                    onClick={onClose}
                  >
                    <div className="oa-stacked-list-item-content">
                      <div className="oa-stacked-list-item-title">{team.name}</div>
                      {meta && (
                        <div className="oa-stacked-list-item-meta">{meta}</div>
                      )}
                    </div>
                    <span className="material-symbols-outlined oa-stacked-list-item-chevron" aria-hidden>
                      chevron_right
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {seasonId && (
          <div className="oa-slideout-footer">
            <button
              type="button"
              className="oa-btn oa-btn--primary"
              onClick={() => {
                onClose()
                window.location.assign(getLink('admin.seasons.detail', { id: seasonId }))
              }}
            >
              View Season Page
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
