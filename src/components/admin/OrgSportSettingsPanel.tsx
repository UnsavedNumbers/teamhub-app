/**
 * OrgSportSettingsPanel Component
 * 
 * Admin panel for customizing sport profile field requirements.
 * Allows org admins to make fields required, optional, or disabled.
 * 
 * Design: Clean admin interface with clear controls and instant feedback.
 */

import { useState, useCallback } from 'react'
import { useSportFieldDefinitions } from '../../hooks/useSportFieldDefinitions'
import { useOrgSportSettings } from '../../hooks/useOrgSportSettings'
import type { SportCode, FieldGroup } from '../../types/sports'
import type { FieldOverride } from '../../types/athleteSportProfiles'

interface OrgSportSettingsPanelProps {
  /** Organization ID */
  orgId: string
  /** Sport code */
  sportCode: SportCode
}

/**
 * OrgSportSettingsPanel - Admin customization for sport profile fields
 */
export function OrgSportSettingsPanel({
  orgId,
  sportCode,
}: OrgSportSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<FieldGroup>('profile')

  // Fetch field definitions
  const { profileFields, equipmentFields, loading: fieldsLoading, error: fieldsError } = 
    useSportFieldDefinitions(sportCode)

  // Fetch/update org settings
  const { settings, loading: settingsLoading, updating, updateField, removeField, error: settingsError } = 
    useOrgSportSettings(orgId, sportCode)

  // Get current override for a field
  const getFieldOverride = useCallback((fieldKey: string): FieldOverride | null => {
    return settings?.overrides[fieldKey] || null
  }, [settings])

  // Toggle field requirement
  const handleToggleRequired = useCallback(async (fieldKey: string, currentlyRequired: boolean) => {
    const override = getFieldOverride(fieldKey) || {}
    
    if (currentlyRequired) {
      // Make optional
      await updateField(fieldKey, { ...override, is_required: false })
    } else {
      // Make required
      await updateField(fieldKey, { ...override, is_required: true })
    }
  }, [getFieldOverride, updateField])

  // Toggle field enabled
  const handleToggleEnabled = useCallback(async (fieldKey: string, currentlyEnabled: boolean) => {
    const override = getFieldOverride(fieldKey) || {}
    
    if (currentlyEnabled) {
      // Disable field
      await updateField(fieldKey, { ...override, is_enabled: false })
    } else {
      // Enable field
      await updateField(fieldKey, { ...override, is_enabled: true })
    }
  }, [getFieldOverride, updateField])

  // Reset field to defaults
  const handleResetField = useCallback(async (fieldKey: string) => {
    await removeField(fieldKey)
  }, [removeField])

  // Loading state
  if (fieldsLoading || settingsLoading) {
    return (
      <div className="settings-panel-loading">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading field settings...</p>
      </div>
    )
  }

  // Error state
  if (fieldsError || settingsError) {
    return (
      <div className="settings-panel-error">
        <span className="material-symbols-outlined error-icon">error</span>
        <p className="error-text">Failed to load field settings</p>
        <p className="error-detail">{(fieldsError || settingsError)?.message}</p>
      </div>
    )
  }

  const activeFields = activeTab === 'profile' ? profileFields : equipmentFields

  return (
    <div className="org-sport-settings-panel">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-content">
          <h2 className="settings-title">Field Customization</h2>
          <p className="settings-subtitle">
            Customize which fields are required, optional, or disabled for {sportCode.replace('_', ' ')}
          </p>
        </div>
        <div className="settings-badge">
          <span className="material-symbols-outlined">admin_panel_settings</span>
          <span>Admin Only</span>
        </div>
      </div>

      {/* Info banner */}
      <div className="settings-info-banner">
        <span className="material-symbols-outlined">info</span>
        <div className="info-banner-content">
          <p className="info-banner-title">Organization-Specific Settings</p>
          <p className="info-banner-text">
            Changes apply only to your organization. Required fields must be completed before profiles are considered complete.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined">person</span>
          <span>Profile Fields ({profileFields.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('equipment')}
          className={`settings-tab ${activeTab === 'equipment' ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined">inventory_2</span>
          <span>Equipment Fields ({equipmentFields.length})</span>
        </button>
      </div>

      {/* Fields Table */}
      <div className="settings-table-wrapper">
        <table className="settings-table">
          <thead>
            <tr>
              <th className="table-header">Field</th>
              <th className="table-header">Default</th>
              <th className="table-header">Required</th>
              <th className="table-header">Enabled</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeFields.map((field) => {
              const override = getFieldOverride(field.field_key)
              const isRequired = override?.is_required ?? !field.is_optional
              const isEnabled = override?.is_enabled ?? field.is_enabled
              const hasOverride = override !== null

              return (
                <tr key={field.field_key} className="table-row">
                  {/* Field Name */}
                  <td className="table-cell">
                    <div className="field-info">
                      <span className="field-name">{field.field_label}</span>
                      {field.help_text && (
                        <span className="field-description">{field.help_text}</span>
                      )}
                    </div>
                  </td>

                  {/* Default Status */}
                  <td className="table-cell">
                    <div className="default-badges">
                      {!field.is_optional && (
                        <span className="badge badge-required">Required</span>
                      )}
                      {field.is_optional && (
                        <span className="badge badge-optional">Optional</span>
                      )}
                    </div>
                  </td>

                  {/* Required Toggle */}
                  <td className="table-cell">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={() => handleToggleRequired(field.field_key, isRequired)}
                        disabled={updating || !isEnabled}
                        className="toggle-input"
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </td>

                  {/* Enabled Toggle */}
                  <td className="table-cell">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleToggleEnabled(field.field_key, isEnabled)}
                        disabled={updating}
                        className="toggle-input"
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => handleResetField(field.field_key)}
                        disabled={updating}
                        className="btn-reset"
                        title="Reset to defaults"
                      >
                        <span className="material-symbols-outlined">restart_alt</span>
                        <span>Reset</span>
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {activeFields.length === 0 && (
        <div className="settings-empty">
          <span className="material-symbols-outlined empty-icon">
            {activeTab === 'profile' ? 'person' : 'inventory_2'}
          </span>
          <p className="empty-text">
            No {activeTab} fields configured for this sport
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="settings-legend">
        <h4 className="legend-title">Field Status Guide</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="material-symbols-outlined legend-icon">check_circle</span>
            <div className="legend-content">
              <span className="legend-label">Required</span>
              <span className="legend-description">Must be completed for profile to be considered complete</span>
            </div>
          </div>
          <div className="legend-item">
            <span className="material-symbols-outlined legend-icon">radio_button_unchecked</span>
            <div className="legend-content">
              <span className="legend-label">Optional</span>
              <span className="legend-description">Can be left blank without affecting profile completeness</span>
            </div>
          </div>
          <div className="legend-item">
            <span className="material-symbols-outlined legend-icon">visibility_off</span>
            <div className="legend-content">
              <span className="legend-label">Disabled</span>
              <span className="legend-description">Hidden from profile forms and not collected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
