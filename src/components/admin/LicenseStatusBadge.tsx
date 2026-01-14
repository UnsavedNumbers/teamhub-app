import { Chip, Tooltip } from '@mui/material'
import { LicenseStatus } from '../../utils/licenseUtils'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'

interface LicenseStatusBadgeProps {
  status: LicenseStatus | null
  currentPeriodEnd?: string | null
  trialEndsAt?: string | null
  graceEndsAt?: string | null
  cancelAtPeriodEnd?: boolean | null
}

function getColor(status: LicenseStatus | null) {
  switch (status) {
    case 'active':
      return 'success'
    case 'trial':
      return 'warning'
    case 'past_due':
      return 'warning'
    case 'canceled':
    case 'expired':
      return 'error'
    default:
      return 'default'
  }
}

function getLabel(status: LicenseStatus | null) {
  if (!status) return t('license.statusLabel')
  return t(`license.status.${status}` as const)
}

function getTooltip(
  status: LicenseStatus | null,
  currentPeriodEnd?: string | null,
  trialEndsAt?: string | null,
  graceEndsAt?: string | null,
  cancelAtPeriodEnd?: boolean | null
) {
  if (!status) return ''

  switch (status) {
    case 'trial':
      return t('license.badge.trialTooltip', { date: formatDate(trialEndsAt) })
    case 'active':
      return t('license.badge.activeTooltip', { date: formatDate(currentPeriodEnd) })
    case 'past_due':
      return t('license.badge.pastDueTooltip', { date: formatDate(graceEndsAt) })
    case 'canceled':
      return t('license.badge.canceledTooltip', { date: formatDate(currentPeriodEnd) })
    case 'expired':
      return t('license.badge.expiredTooltip')
    default:
      return cancelAtPeriodEnd ? t('license.badge.canceledTooltip', { date: formatDate(currentPeriodEnd) }) : ''
  }
}

export function LicenseStatusBadge({
  status,
  currentPeriodEnd,
  trialEndsAt,
  graceEndsAt,
  cancelAtPeriodEnd,
}: LicenseStatusBadgeProps) {
  const tooltip = getTooltip(status, currentPeriodEnd, trialEndsAt, graceEndsAt, cancelAtPeriodEnd)

  return (
    <Tooltip title={tooltip} disableFocusListener disableTouchListener>
      <Chip
        label={getLabel(status)}
        color={getColor(status)}
        variant="filled"
        size="small"
        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
      />
    </Tooltip>
  )
}
