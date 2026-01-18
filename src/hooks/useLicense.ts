import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from './useAuth'
import {
  LicenseSummary,
  LicenseStatus,
  LicensePlan,
  isLicenseActive,
  isLicenseReadOnlyAllowed,
  isPastGrace,
  isWithinGracePeriod,
  getDaysUntil,
} from '../utils/licenseUtils'
import { t } from '../i18n'
import { getErrorMessage } from '../utils/errorUtils'

interface UseLicenseResult {
  licenseStatus: LicenseStatus | null
  licensePlan: LicensePlan | null
  summary: LicenseSummary | null
  loading: boolean
  error: string | null
  isActive: boolean
  isReadOnlyAllowed: boolean
  isPastGracePeriod: boolean
  daysUntilExpiration: number | null
  daysInGracePeriod: number | null
  refresh: () => Promise<void>
}

export function useLicense(organizationId?: string, options?: { requireOrganization?: boolean }): UseLicenseResult {
  const { currentOrganization } = useOrganization()
  const { profile } = useAuth()

  const [summary, setSummary] = useState<LicenseSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const orgId = organizationId ?? currentOrganization?.id ?? null
  const requireOrganization = options?.requireOrganization ?? true

  const refresh = useCallback(async () => {
    if (!orgId) {
      if (requireOrganization) {
        setError(t('errors.missingOrganization'))
      } else {
        setError(null)
      }
      setSummary(null)
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured) {
      setError(t('billing.errorLoading'))
      setSummary(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select(`
          license_status,
          license_plan,
          license_current_period_start,
          license_current_period_end,
          license_trial_ends_at,
          license_grace_ends_at,
          license_cancel_at_period_end,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_price_id
        `)
        .eq('id', orgId)
        .maybeSingle()

      if (fetchError) {
        setError(fetchError.message)
        setSummary(null)
        return
      }

      if (!data) {
        setError(t('errors.missingOrganization'))
        setSummary(null)
        return
      }

      const parsed: LicenseSummary = {
        status: (data.license_status as LicenseStatus | null) ?? null,
        plan: (data.license_plan as LicensePlan | null) ?? null,
        currentPeriodStart: data.license_current_period_start,
        currentPeriodEnd: data.license_current_period_end,
        trialEndsAt: data.license_trial_ends_at,
        graceEndsAt: data.license_grace_ends_at,
        cancelAtPeriodEnd: data.license_cancel_at_period_end,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
        stripePriceId: data.stripe_price_id,
      }

      // Populate computed properties
      parsed.isTrial = parsed.status === 'trial'
      parsed.isGracePeriod = isWithinGracePeriod(parsed)
      parsed.isValid = isLicenseActive(parsed)
      parsed.daysRemaining = getDaysUntil(parsed.isTrial ? parsed.trialEndsAt : parsed.currentPeriodEnd) ?? 0

      setSummary(parsed)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [orgId, requireOrganization])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isPlatformAdmin = profile?.isPlatformAdmin ?? false

  const computed = useMemo(() => {
    if (isPlatformAdmin) {
      return {
        isActive: true,
        isReadOnlyAllowed: true,
        isPastGracePeriod: false,
      }
    }

    if (!summary) {
      return {
        isActive: false,
        isReadOnlyAllowed: false,
        isPastGracePeriod: false,
      }
    }

    return {
      isActive: isLicenseActive(summary),
      isReadOnlyAllowed: isLicenseReadOnlyAllowed(summary),
      isPastGracePeriod: isPastGrace(summary),
    }
  }, [isPlatformAdmin, summary])

  const daysUntilExpiration = summary ? getDaysUntil(summary.currentPeriodEnd) : null
  const daysInGracePeriod = summary && isWithinGracePeriod(summary) ? getDaysUntil(summary.graceEndsAt) : null

  return {
    licenseStatus: summary?.status ?? null,
    licensePlan: summary?.plan ?? null,
    summary,
    loading,
    error,
    isActive: computed.isActive,
    isReadOnlyAllowed: computed.isReadOnlyAllowed,
    isPastGracePeriod: computed.isPastGracePeriod,
    daysUntilExpiration,
    daysInGracePeriod,
    refresh,
  }
}
