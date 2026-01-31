/**
 * AdminSportSettingsPage - Organization Sport Settings
 * 
 * Admin page for customizing sport profile field requirements.
 * Follows existing admin/AdminSettings.tsx patterns with sidebar navigation.
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getLink } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import { OrgSportSettingsPanel } from '../../components/admin/OrgSportSettingsPanel'
import type { SportCode } from '../../types/sports'

const AVAILABLE_SPORTS: { code: SportCode; label: string }[] = [
  { code: 'baseball', label: 'Baseball' },
  { code: 'basketball', label: 'Basketball' },
  { code: 'cheerleading', label: 'Cheerleading' },
  { code: 'cross_country', label: 'Cross Country' },
  { code: 'dance', label: 'Dance' },
  { code: 'diving', label: 'Diving' },
  { code: 'field_hockey', label: 'Field Hockey' },
  { code: 'flag_football', label: 'Flag Football' },
  { code: 'football', label: 'Football' },
  { code: 'golf', label: 'Golf' },
  { code: 'gymnastics', label: 'Gymnastics' },
  { code: 'ice_hockey', label: 'Ice Hockey' },
  { code: 'lacrosse', label: 'Lacrosse' },
  { code: 'soccer', label: 'Soccer' },
  { code: 'softball', label: 'Softball' },
  { code: 'swimming', label: 'Swimming' },
  { code: 'tennis', label: 'Tennis' },
  { code: 'track_field', label: 'Track & Field' },
  { code: 'volleyball', label: 'Volleyball' },
  { code: 'wrestling', label: 'Wrestling' },
]

export default function AdminSportSettingsPage() {
  const t = useT()
  const translate = t as unknown as (key: string) => string
  const navigate = useNavigate()
  const { context } = useUserContext()
  const [selectedSport, setSelectedSport] = useState<SportCode>('soccer')
  const [navigating, setNavigating] = useState(false)

  const handleBreadcrumbClick = useCallback(
    (path: string) => {
      if (navigating || !path) return
      setNavigating(true)
      navigate(path)
    },
    [navigate, navigating]
  )

  return (
    <div className="pa-root">
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          padding: 'var(--pa-space-6) var(--pa-space-4)',
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
            marginBottom: 'var(--pa-space-6)',
          }}
        >
          <button
            onClick={() => handleBreadcrumbClick(getLink('admin.dashboard'))}
            disabled={navigating}
            className="pa-link"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: navigating ? 'not-allowed' : 'pointer',
              opacity: navigating ? 0.6 : 1,
            }}
          >
            {translate('admin.breadcrumbs.dashboard')}
          </button>
          <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--pa-text-muted)' }}>
            chevron_right
          </span>
          <button
            onClick={() => handleBreadcrumbClick(getLink('admin.settings'))}
            disabled={navigating}
            className="pa-link"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              cursor: navigating ? 'not-allowed' : 'pointer',
              opacity: navigating ? 0.6 : 1,
            }}
          >
            Settings
          </button>
          <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--pa-text-muted)' }}>
            chevron_right
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--pa-theme-action-primary)',
            }}
          >
            Sport Profiles
          </span>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 'var(--pa-space-8)' }}>
          <h1 className="pa-page-title" style={{ marginBottom: 'var(--pa-space-2)' }}>
            Sport Profile Settings
          </h1>
          <p className="pa-body-l" style={{ color: 'var(--pa-text-secondary)' }}>
            Customize which fields are required, optional, or disabled for each sport in your organization
          </p>
        </div>

        {/* Two-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--pa-space-6)' }} className="lg:grid-cols-1">
          {/* Sidebar - Sport Selector */}
          <div>
            <div
              style={{
                background: 'var(--pa-surface)',
                border: '1px solid var(--pa-border-default)',
                borderRadius: 'var(--pa-radius-lg)',
                padding: 'var(--pa-space-4)',
                position: 'sticky',
                top: 'var(--pa-space-4)',
              }}
            >
              <h3
                className="pa-heading-s"
                style={{
                  marginBottom: 'var(--pa-space-3)',
                  paddingBottom: 'var(--pa-space-3)',
                  borderBottom: '1px solid var(--pa-border-default)',
                }}
              >
                Select Sport
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-1)' }}>
                {AVAILABLE_SPORTS.map((sport) => (
                  <button
                    key={sport.code}
                    onClick={() => setSelectedSport(sport.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--pa-space-2)',
                      padding: 'var(--pa-space-3)',
                      border: 'none',
                      borderRadius: 'var(--pa-radius-md)',
                      background: selectedSport === sport.code ? 'var(--pa-theme-action-primary-bg)' : 'transparent',
                      color: selectedSport === sport.code ? 'var(--pa-theme-action-primary)' : 'var(--pa-text-primary)',
                      fontWeight: selectedSport === sport.code ? 700 : 500,
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      textAlign: 'left',
                    }}
                    className="hover:bg-[var(--pa-surface-panel)]"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      sports
                    </span>
                    {sport.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Settings Panel */}
          <div>
            <OrgSportSettingsPanel
              orgId={context.orgId}
              sportCode={selectedSport}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
