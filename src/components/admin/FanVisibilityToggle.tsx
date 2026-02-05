/**
 * FanVisibilityToggle Component
 * 
 * Shared toggle component for controlling fan visibility across all content types.
 * Provides consistent UI, first-time confirmation dialog, and accessibility.
 */

import { useState, useEffect } from 'react'
import { ConfirmDialog } from '../platformAdmin/ConfirmDialog'
import { useT } from '../../i18n/useI18n'

export type FanVisibilityEntityType = 'event' | 'team' | 'announcement' | 'gallery' | 'video' | 'organization'
export type FanVisibilityContext = 'payment' | 'private_team' | null

export interface FanVisibilityToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  entityType: FanVisibilityEntityType
  disabled?: boolean
  showFirstTimeConfirm?: boolean
  contextForWarning?: FanVisibilityContext
}

const SESSION_STORAGE_PREFIX = 'fan_visibility_confirm_2025_'

export function FanVisibilityToggle({
  checked,
  onChange,
  entityType,
  disabled = false,
  showFirstTimeConfirm = true,
  contextForWarning = null,
}: FanVisibilityToggleProps) {
  const t = useT()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingValue, setPendingValue] = useState<boolean | null>(null)

  // Check if user has already seen the confirmation for this entity type
  const getConfirmationKey = () => `${SESSION_STORAGE_PREFIX}${entityType}`
  
  const hasSeenConfirmation = () => {
    try {
      return sessionStorage.getItem(getConfirmationKey()) === 'true'
    } catch {
      return false
    }
  }

  const markConfirmationSeen = () => {
    try {
      sessionStorage.setItem(getConfirmationKey(), 'true')
    } catch {
      // Ignore storage errors
    }
  }

  const handleToggleChange = (newValue: boolean) => {
    // If turning ON and should show first-time confirm and hasn't seen it yet
    if (newValue && showFirstTimeConfirm && !hasSeenConfirmation()) {
      setPendingValue(newValue)
      setShowConfirmDialog(true)
    } else {
      onChange(newValue)
    }
  }

  const handleConfirm = () => {
    if (pendingValue !== null) {
      markConfirmationSeen()
      onChange(pendingValue)
      setPendingValue(null)
    }
    setShowConfirmDialog(false)
  }

  const handleCancel = () => {
    setPendingValue(null)
    setShowConfirmDialog(false)
  }

  const entityLabels: Record<FanVisibilityEntityType, string> = {
    event: t('admin.fanVisibility.entityTypes.event'),
    team: t('admin.fanVisibility.entityTypes.team'),
    announcement: t('admin.fanVisibility.entityTypes.announcement'),
    gallery: t('admin.fanVisibility.entityTypes.gallery'),
    video: t('admin.fanVisibility.entityTypes.video'),
    organization: t('admin.fanVisibility.entityTypes.organization'),
  }

  const contextWarnings: Record<string, string> = {
    payment: t('admin.fanVisibility.contextWarnings.payment'),
    private_team: t('admin.fanVisibility.contextWarnings.privateTeam'),
  }

  return (
    <>
      <div 
        style={{
          backgroundColor: '#f8f9fa',
          padding: '12px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#6b7280' }}>
              visibility
            </span>
            <label 
              htmlFor="fan-visibility-toggle"
              style={{ fontSize: '16px', fontWeight: 500, margin: 0, cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {t('admin.fanVisibility.label')}
            </label>
          </div>
          
          {/* Toggle Switch */}
          <label 
            className="pa-inline-flex pa-items-center pa-gap-2"
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            <span 
              className="pa-toggle" 
              style={{ 
                opacity: disabled ? 0.5 : 1,
                width: '52px',
                height: '28px',
              }}
            >
              <input
                id="fan-visibility-toggle"
                type="checkbox"
                className="pa-toggle-input"
                checked={checked}
                disabled={disabled}
                onChange={(e) => handleToggleChange(e.target.checked)}
                aria-label={t('admin.fanVisibility.ariaLabel')}
                aria-describedby="fan-visibility-description fan-visibility-state"
              />
              <span className="pa-toggle-track" style={{ borderRadius: '14px' }} />
              <span className="pa-toggle-thumb" style={{ borderRadius: '50%' }} />
            </span>
          </label>
        </div>

        {/* Description */}
        <p 
          id="fan-visibility-description"
          style={{ 
            fontSize: '14px', 
            color: '#6b7280', 
            margin: '0 0 8px 0',
            lineHeight: '1.5'
          }}
        >
          {t('admin.fanVisibility.description', { entity: entityLabels[entityType] || entityType })}
        </p>

        {/* State Text */}
        <div 
          id="fan-visibility-state"
          style={{ 
            fontSize: '14px', 
            fontWeight: 500,
            color: checked ? '#059669' : '#6b7280',
          }}
          role="status"
          aria-live="polite"
        >
          {checked ? t('admin.fanVisibility.stateOn') : t('admin.fanVisibility.stateOff')}
        </div>

        {/* Context Warning */}
        {contextForWarning && (
          <div 
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>
              info
            </span>
            {contextWarnings[contextForWarning]}
          </div>
        )}
      </div>

      {/* First-time Confirmation Dialog */}
      <ConfirmDialog
        open={showConfirmDialog}
        title={t('admin.fanVisibility.confirmDialog.title')}
        description={t('admin.fanVisibility.confirmDialog.description', { entity: entityLabels[entityType] || entityType })}
        confirmLabel={t('admin.fanVisibility.confirmDialog.confirm')}
        cancelLabel={t('admin.fanVisibility.confirmDialog.cancel')}
        variant="warning"
        requireReason={false}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}

export default FanVisibilityToggle
