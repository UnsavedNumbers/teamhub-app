import { Alert, AlertTitle, Button, Stack } from '@mui/material'
import { LicenseStatus } from '../../utils/licenseUtils'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'

interface LicenseWarningBannerProps {
  status: LicenseStatus | null
  trialEndsAt?: string | null
  graceEndsAt?: string | null
  currentPeriodEnd?: string | null
  onAction?: () => void
}

function getMessage(status: LicenseStatus | null, trialEndsAt?: string | null, graceEndsAt?: string | null, currentPeriodEnd?: string | null) {
  switch (status) {
    case 'trial':
      return t('license.warning.trial', { date: formatDate(trialEndsAt) })
    case 'past_due':
      return t('license.warning.pastDue', { date: formatDate(graceEndsAt) })
    case 'canceled':
      return t('license.warning.canceled', { date: formatDate(currentPeriodEnd) })
    case 'expired':
      return t('license.warning.expired')
    default:
      return ''
  }
}

function getSeverity(status: LicenseStatus | null) {
  switch (status) {
    case 'trial':
    case 'past_due':
      return 'warning'
    case 'canceled':
    case 'expired':
      return 'error'
    default:
      return 'info'
  }
}

export function LicenseWarningBanner({ status, trialEndsAt, graceEndsAt, currentPeriodEnd, onAction }: LicenseWarningBannerProps) {
  const message = getMessage(status, trialEndsAt, graceEndsAt, currentPeriodEnd)

  if (!status || !message) return null

  return (
    <Alert severity={getSeverity(status)} sx={{ mb: 2 }}
      action={
        onAction ? (
          <Button color="inherit" size="small" onClick={onAction}>
            {t('license.gate.action')}
          </Button>
        ) : undefined
      }
    >
      <Stack spacing={0.5}>
        <AlertTitle>{t('license.statusLabel')}</AlertTitle>
        {message}
      </Stack>
    </Alert>
  )
}
