import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useLicense } from '../../hooks/useLicense'
import { t } from '../../i18n'
import { formatDate } from '../../utils/licenseUtils'
import { createCustomerPortalSession, getBillingHistory, BillingEvent } from '../../api/billing'
import { LicenseStatusBadge } from '../../components/admin/LicenseStatusBadge'
import { LicenseWarningBanner } from '../../components/admin/LicenseWarningBanner'
import { getErrorMessage } from '../../utils/errorUtils'

export default function OrganizationBilling() {
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  const { summary, loading, error, isActive, refresh } = useLicense(orgId)

  const [history, setHistory] = useState<BillingEvent[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const loadHistory = useCallback(async (organizationId: string) => {
    try {
      const events = await getBillingHistory(organizationId)
      setHistory(events)
    } catch (err: unknown) {
      setHistoryError(getErrorMessage(err))
    }
  }, [])

  useEffect(() => {
    if (orgId) {
      loadHistory(orgId)
    }
  }, [orgId, loadHistory])

  const currentPlanLabel = useMemo(() => {
    if (!summary?.plan) return t('license.planLabel')
    switch (summary.plan) {
      case 'starter':
        return t('license.planStarter')
      case 'standard':
        return t('license.planStandard')
      case 'pro':
        return t('license.planPro')
      default:
        return t('license.planLabel')
    }
  }, [summary?.plan])

  async function handleOpenPortal() {
    if (!orgId) return
    setPortalLoading(true)
    try {
      const { portal_url } = await createCustomerPortalSession({
        organizationId: orgId,
        returnUrl: `${window.location.origin}/admin/organization/billing`,
      })
      if (portal_url) {
        window.location.href = portal_url
      }
    } catch (err: unknown) {
      setHistoryError(getErrorMessage(err) || t('billing.errorCreatingPortal'))
    } finally {
      setPortalLoading(false)
    }
  }

  function goToPlanSelection() {
    navigate('/admin/organization/billing/plan-selection')
  }

  if (!orgId) {
    return (
      <Alert severity="error">{t('errors.missingOrganization')}</Alert>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        {t('billing.pageTitle')}
      </Typography>

      {!isActive && !loading && summary && (
        <LicenseWarningBanner
          status={summary.status}
          trialEndsAt={summary.trialEndsAt}
          graceEndsAt={summary.graceEndsAt}
          currentPeriodEnd={summary.currentPeriodEnd}
          onAction={() => navigate('/admin/organization/billing')}
        />
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>{t('billing.statusSectionTitle')}</Typography>
                <LicenseStatusBadge
                  status={summary?.status ?? null}
                  currentPeriodEnd={summary?.currentPeriodEnd}
                  trialEndsAt={summary?.trialEndsAt}
                  graceEndsAt={summary?.graceEndsAt}
                  cancelAtPeriodEnd={summary?.cancelAtPeriodEnd}
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">{t('license.planLabel')}</Typography>
                  <Typography variant="h6" fontWeight={700}>{currentPlanLabel}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">{t('billing.renewalDate')}</Typography>
                  <Typography variant="body1">{formatDate(summary?.currentPeriodEnd)}</Typography>
                </Grid>
                {summary?.trialEndsAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">{t('billing.trialEnds')}</Typography>
                    <Typography variant="body1">{formatDate(summary.trialEndsAt)}</Typography>
                  </Grid>
                )}
                {summary?.graceEndsAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">{t('billing.graceEnds')}</Typography>
                    <Typography variant="body1">{formatDate(summary.graceEndsAt)}</Typography>
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained" onClick={goToPlanSelection} disabled={loading}>
                  {t('billing.changePlan')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? <CircularProgress size={18} /> : t('billing.portalCta')}
                </Button>
                <Button variant="text" onClick={() => refresh()} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : t('common.retry')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{t('billing.detailsSectionTitle')}</Typography>
              <Stack spacing={1}>
                <DetailRow label={t('license.statusLabel')} value={summary?.status ? t(`license.status.${summary.status}` as const) : '-'} />
                <DetailRow label={t('license.planLabel')} value={currentPlanLabel} />
                <DetailRow label={t('billing.renewalDate')} value={formatDate(summary?.currentPeriodEnd)} />
                {summary?.trialEndsAt && (
                  <DetailRow label={t('billing.trialEnds')} value={formatDate(summary.trialEndsAt)} />
                )}
                {summary?.graceEndsAt && (
                  <DetailRow label={t('billing.graceEnds')} value={formatDate(summary.graceEndsAt)} />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>{t('billing.viewBillingHistory')}</Typography>
                {loading && <CircularProgress size={18} />}
              </Stack>

              {historyError && (
                <Alert severity="error" sx={{ mb: 2 }}>{historyError}</Alert>
              )}

              {history.length === 0 && !historyError ? (
                <Typography variant="body2" color="text.secondary">{t('billing.billingHistoryEmpty')}</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {history.map(event => (
                    <Stack key={event.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={600}>{event.event_type}</Typography>
                      <Typography variant="body2" color="text.secondary">{formatDate(event.created_at)}</Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value || '-'}</Typography>
    </Stack>
  )
}
