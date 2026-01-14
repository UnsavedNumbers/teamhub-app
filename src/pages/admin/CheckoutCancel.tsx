import { Box, Button, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { t } from '../../i18n'

export default function CheckoutCancel() {
  const navigate = useNavigate()

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>{t('billing.checkoutCancelTitle')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('billing.checkoutCancelBody')}</Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={() => navigate('/admin/organization/billing')}>
            {t('checkout.returnToBilling')}
          </Button>
          <Button variant="text" onClick={() => navigate('/admin/organization/billing/plan-selection')}>
            {t('billing.continueToCheckout')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
