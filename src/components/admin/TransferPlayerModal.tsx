/**
 * TransferPlayerModal Component
 * 
 * Modal for transferring a player from one team to another within the same organization.
 * Allows administrators to select a destination team and optionally provide a transfer reason.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { transferPlayerBetweenTeams } from '../../data/services/teamsService'
import { useUserContext } from '../../hooks/useUserContext'
import { useFeatureGate } from '../../lib/featureGate/useFeatureGate'
import { useT } from '../../i18n/useI18n'
import { useOffline } from '../../hooks/useOffline'
import { showSuccess, showError } from '../../utils/toast'
import { Button, Select, Input } from './'
import type { UserContext } from '../../data/fake/userContext'

interface TransferPlayerModalProps {
  open: boolean
  athleteId: string
  athleteName: string
  fromTeamId: string
  fromTeamName: string
  seasonId: string
  orgId: string
  onClose: () => void
  onSuccess: () => void
}

interface TeamOption {
  id: string
  name: string
}

export function TransferPlayerModal({
  open,
  athleteId,
  athleteName,
  fromTeamId,
  fromTeamName,
  seasonId,
  orgId,
  onClose,
  onSuccess,
}: TransferPlayerModalProps) {
  const { context, isReady } = useUserContext()
  const t = useT()
  const { isOffline } = useOffline()
  const featureGate = useFeatureGate('player_transfer')
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [transferReason, setTransferReason] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available teams in the organization (excluding the source team)
  useEffect(() => {
    if (!open || !isReady || !orgId) {
      setTeams([])
      return
    }

    const fetchTeams = async () => {
      setLoadingTeams(true)
      setError(null)
      try {
        const { data, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('org_id', orgId)
          .neq('id', fromTeamId)
          .order('name')

        if (teamsError) throw teamsError

        setTeams(data || [])
      } catch (err) {
        console.error('Error fetching teams:', err)
        setError('Failed to load teams. Please try again.')
        setTeams([])
      } finally {
        setLoadingTeams(false)
      }
    }

    fetchTeams()
  }, [open, orgId, fromTeamId, isReady])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedTeamId('')
      setTransferReason('')
      setError(null)
    }
  }, [open])

  const handleTransfer = async () => {
    if (isOffline) {
      setError(t('common.error.offline') || 'Cannot transfer player while offline. Please check your connection.')
      return
    }

    if (!selectedTeamId) {
      setError(t('admin.roster.selectDestinationTeamRequired') || 'Please select a destination team.')
      return
    }

    if (!context || !isReady) {
      setError('User context not available. Please refresh the page.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await transferPlayerBetweenTeams(
        context as UserContext,
        athleteId,
        fromTeamId,
        selectedTeamId,
        seasonId,
        transferReason || null
      )

      if (result.error) {
        const errorMessage = result.error.message || t('admin.roster.transferPlayerError') || 'Failed to transfer player. Please try again.'
        setError(errorMessage)
        showError(errorMessage)
        return
      }

      // Success - show toast, close modal and refresh roster
      showSuccess(t('admin.roster.transferPlayerSuccess') || 'Player transferred successfully')
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error transferring player:', err)
      const errorMessage = err instanceof Error ? err.message : t('admin.roster.transferPlayerError') || 'An unexpected error occurred.'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          {t('admin.roster.transferPlayerTitle')}
        </h2>

        {isOffline && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          >
            {t('common.error.offline') || 'You appear to be offline. Please reconnect and try again.'}
          </div>
        )}

        {!featureGate.allowed && !featureGate.loading && !isOffline && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          >
            {featureGate.gate_action === 'paywall' 
              ? 'This feature requires a higher plan tier. Please upgrade to transfer players between teams.'
              : 'Player transfer is not available for your organization.'}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
            {t('admin.roster.transferPlayerDescription', { playerName: athleteName, fromTeamName })}
          </p>
        </div>

        <div className="oa-form-group" style={{ marginBottom: '1rem' }}>
          <Select
            label={t('admin.roster.selectDestinationTeam')}
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            options={teams.map(t => ({ value: t.id, label: t.name }))}
            disabled={loadingTeams || loading || !featureGate.allowed || isOffline}
            helper={loadingTeams ? (t('common.loading') || 'Loading teams...') : t('admin.roster.selectDestinationTeamHelp')}
          />
        </div>

        <div className="oa-form-group" style={{ marginBottom: '1.5rem' }}>
          <Input
            label={t('admin.roster.transferReason')}
            type="text"
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            placeholder={t('admin.roster.transferReasonPlaceholder')}
            disabled={loading || !featureGate.allowed || isOffline}
            helper={t('admin.roster.transferReasonHelp')}
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleTransfer}
            disabled={loading || !selectedTeamId || loadingTeams || !featureGate.allowed || isOffline}
            loading={loading}
          >
            {t('admin.roster.transferPlayer')}
          </Button>
        </div>
      </div>
    </div>
  )
}
