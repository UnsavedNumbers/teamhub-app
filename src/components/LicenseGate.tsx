import { ReactNode } from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useLicense } from '../hooks/useLicense'
import { t } from '../i18n'

interface LicenseGateProps {
  children: ReactNode
  organizationId?: string
}

export function LicenseGate({ children, organizationId }: LicenseGateProps) {
  const navigate = useNavigate()
  const { isActive, isPastGracePeriod, loading, error } = useLicense(organizationId)

  if (loading) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2">{t('common.loading')}</Typography>
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert severity="error">{error}</Alert>
    )
  }

  if (!isActive && isPastGracePeriod) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/admin/organization/billing')}>
            {t('license.gate.action')}
          </Button>
        }
      >
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>{t('license.gate.title')}</Typography>
          <Typography variant="body2">{t('license.gate.message')}</Typography>
        </Stack>
      </Alert>
    )
  }

  return <>{children}</>
}
