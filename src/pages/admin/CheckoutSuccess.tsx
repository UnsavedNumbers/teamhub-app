import { useEffect } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n'

export default function CheckoutSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => navigate('/admin/organization/billing'), 3000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>{t('billing.checkoutSuccessTitle')}</Typography>
        <Typography variant="body2">{t('billing.checkoutSuccessBody')}</Typography>
      </Alert>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">{t('checkout.redirecting')}</Typography>
        <Button variant="contained" onClick={() => navigate('/admin/organization/billing')}>
          {t('checkout.returnToBilling')}
        </Button>
      </Stack>
    </Box>
  )
}
