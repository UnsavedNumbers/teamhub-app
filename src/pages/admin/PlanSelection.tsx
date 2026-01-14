import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { createCheckoutSession } from '../../api/billing'
import { LicensePlan } from '../../utils/licenseUtils'
import { t } from '../../i18n'
import { getErrorMessage } from '../../utils/errorUtils'

interface PlanCard {
  id: LicensePlan
  name: string
  price: string
  description: string
  features: string[]
}

const planCards: PlanCard[] = [
  {
    id: 'starter',
    name: t('plans.starter.name'),
    price: t('plans.starter.price'),
    description: t('plans.starter.description'),
    features: [
      t('plans.features.scheduling'),
      t('plans.features.rosters'),
      t('plans.features.messaging'),
    ],
  },
  {
    id: 'standard',
    name: t('plans.standard.name'),
    price: t('plans.standard.price'),
    description: t('plans.standard.description'),
    features: [
      t('plans.features.scheduling'),
      t('plans.features.rosters'),
      t('plans.features.messaging'),
      t('plans.features.payments'),
      t('plans.features.uniforms'),
    ],
  },
  {
    id: 'pro',
    name: t('plans.pro.name'),
    price: t('plans.pro.price'),
    description: t('plans.pro.description'),
    features: [
      t('plans.features.scheduling'),
      t('plans.features.rosters'),
      t('plans.features.messaging'),
      t('plans.features.payments'),
      t('plans.features.uniforms'),
      t('plans.features.travel'),
      t('plans.features.tryouts'),
      t('plans.features.reporting'),
      t('plans.features.support'),
    ],
  },
]

export default function PlanSelection() {
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const { licensePlan } = useLicense(orgId)

  const [loadingPlan, setLoadingPlan] = useState<LicensePlan | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!orgId) {
    return <Alert severity="error">{t('errors.missingOrganization')}</Alert>
  }

  async function handleSelect(plan: LicensePlan) {
    if (!orgId) return
    setError(null)
    setLoadingPlan(plan)
    try {
      const { checkout_session_url } = await createCheckoutSession({
        organizationId: orgId,
        requestedPlan: plan,
        successUrl: `${window.location.origin}/admin/organization/billing/checkout/success`,
        cancelUrl: `${window.location.origin}/admin/organization/billing/checkout/cancel`,
      })

      if (checkout_session_url) {
        window.location.href = checkout_session_url
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('billing.errorCreatingSession'))
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>{t('billing.planSelectionTitle')}</Typography>
        <Button variant="text" onClick={() => navigate('/admin/organization/billing')}>
          {t('common.goBack')}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Grid container spacing={3}>
        {planCards.map(plan => {
          const isCurrent = licensePlan === plan.id
          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                variant={isCurrent ? 'elevation' : 'outlined'}
                sx={{ borderColor: isCurrent ? 'primary.main' : undefined }}
              >
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={700}>{plan.name}</Typography>
                      {isCurrent && (
                        <Button size="small" disabled>{t('billing.currentPlan')}</Button>
                      )}
                    </Stack>
                    <Typography variant="h4" fontWeight={800}>{plan.price}</Typography>
                    <Typography variant="body2" color="text.secondary">{plan.description}</Typography>
                    <Stack spacing={0.5}>
                      {plan.features.map(feature => (
                        <Typography key={feature} variant="body2">- {feature}</Typography>
                      ))}
                    </Stack>
                    <Button
                      variant={isCurrent ? 'outlined' : 'contained'}
                      onClick={() => handleSelect(plan.id)}
                      disabled={!!loadingPlan}
                    >
                      {loadingPlan === plan.id ? <CircularProgress size={18} /> : t('billing.continueToCheckout')}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}
