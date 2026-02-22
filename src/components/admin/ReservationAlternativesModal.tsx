/**
 * Reservation Alternatives Modal Component
 *
 * Displays alternative time slots when a reservation conflicts
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { Button } from './'
import { suggestReservationAlternatives } from '../../data/services/facilitiesService'
import type { ReservationAlternative } from '../../types/facilities'

interface ReservationAlternativesModalProps {
    isOpen: boolean
    onClose: () => void
    orgId: string
    startAt: string
    endAt: string
    facilityId?: string
    resourceId?: string
    onSelectAlternative: (alternative: ReservationAlternative) => void
}

export default function ReservationAlternativesModal({
    isOpen,
    onClose,
    orgId,
    startAt,
    endAt,
    facilityId,
    resourceId,
    onSelectAlternative,
}: ReservationAlternativesModalProps) {
    const { isReady } = useUserContext()
    const t = useT()
    
    const [alternatives, setAlternatives] = useState<ReservationAlternative[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen || !isReady) return

        const loadAlternatives = async () => {
            setLoading(true)
            setError(null)
            try {
                const durationMinutes = Math.round(
                    (new Date(endAt).getTime() - new Date(startAt).getTime()) / (1000 * 60)
                )
                
                const result = await suggestReservationAlternatives(orgId, startAt, endAt, {
                    facilityId,
                    resourceId,
                    durationMinutes,
                    preferSameResource: true,
                })

                if (result.error) {
                    setError(result.error.message)
                } else if (result.data) {
                    setAlternatives(result.data)
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load alternatives')
            } finally {
                setLoading(false)
            }
        }

        loadAlternatives()
    }, [isOpen, isReady, orgId, startAt, endAt, facilityId, resourceId])

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return
        
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.4)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--org-surface-card)',
                    borderRadius: '8px',
                    padding: '24px',
                    maxWidth: '600px',
                    width: '90%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px',
                    }}
                >
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                        {t('admin.facilities.schedule.suggestAlternatives')}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--org-text-secondary)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            close
                        </span>
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '32px', textAlign: 'center' }}>
                        <span className="material-symbols-outlined oa-spin" style={{ fontSize: '32px' }}>
                            refresh
                        </span>
                        <div style={{ marginTop: '16px', color: 'var(--org-text-secondary)' }}>
                            {t('common.loading')}
                        </div>
                    </div>
                ) : error ? (
                    <div
                        style={{
                            padding: '16px',
                            background: 'var(--pa-danger-light)',
                            color: 'var(--pa-danger)',
                            borderRadius: '8px',
                            marginBottom: '16px',
                        }}
                    >
                        {error}
                    </div>
                ) : alternatives.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--org-text-secondary)' }}>
                        {t('admin.facilities.schedule.noAlternatives')}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {alternatives.map((alt, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '16px',
                                    border: '1px solid var(--org-border-default)',
                                    borderRadius: '8px',
                                    background: 'var(--org-surface-default)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                                            {alt.facility_name} - {alt.resource_name}
                                        </div>
                                        <div style={{ fontSize: '14px', color: 'var(--org-text-secondary)', marginBottom: '4px' }}>
                                            {new Date(alt.suggested_start_at).toLocaleString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                            {' - '}
                                            {new Date(alt.suggested_end_at).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </div>
                                        {alt.score && (
                                            <div style={{ fontSize: '12px', color: 'var(--org-text-secondary)', marginTop: '4px' }}>
                                                Match score: {alt.score}%
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            onSelectAlternative(alt)
                                            onClose()
                                        }}
                                    >
                                        {t('common.select')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div
                    style={{
                        marginTop: '24px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px',
                    }}
                >
                    <Button variant="secondary" onClick={onClose}>
                        {t('common.close')}
                    </Button>
                </div>
            </div>
        </div>
    )
}
