/**
 * Cancel Reservation Dialog Component
 *
 * Confirmation dialog for cancelling reservations with optional reason
 */

import { useState } from 'react'
import { useT } from '../../i18n/useI18n'
import { ConfirmDialog } from './'

interface CancelReservationDialogProps {
    open: boolean
    reservationTitle: string
    reservationDate: string
    onConfirm: (cancellationReason?: string) => void
    onCancel: () => void
}

export default function CancelReservationDialog({
    open,
    reservationTitle,
    reservationDate,
    onConfirm,
    onCancel,
}: CancelReservationDialogProps) {
    const t = useT()
    const [cancellationReason, setCancellationReason] = useState('')

    const handleConfirm = () => {
        onConfirm(cancellationReason.trim() || undefined)
        setCancellationReason('')
    }

    const handleCancel = () => {
        setCancellationReason('')
        onCancel()
    }

    return (
        <ConfirmDialog
            open={open}
            title={t('admin.facilities.schedule.cancelReservation')}
            description={t('admin.facilities.schedule.cancelReservationConfirm', {
                title: reservationTitle,
                date: reservationDate,
            })}
            confirmLabel={t('admin.facilities.schedule.confirmCancel')}
            cancelLabel={t('common.cancel')}
            variant="danger"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        >
            <div style={{ marginTop: '16px' }}>
                <label className="oa-label">{t('admin.facilities.form.cancellationReason')}</label>
                <textarea
                    className="oa-input"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder={t('admin.facilities.form.cancellationReasonPlaceholder')}
                    rows={3}
                    style={{ resize: 'vertical', fontFamily: 'inherit', width: '100%' }}
                />
            </div>
        </ConfirmDialog>
    )
}
