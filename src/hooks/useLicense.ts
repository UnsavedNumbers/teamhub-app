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
import { USE_FAKE_DATA } from '../data/config'

interface UseLicenseResult {
  licenseStatus: LicenseStatus | null
  /** @deprecated Use summary.tierId/tierName instead. Will be removed in Phase 8. */
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

    // In demo mode, provide fake license data to avoid redirecting to trial-expired
    if (USE_FAKE_DATA) {
      // Create a fake active license for demo organizations
      const fakeSummary: LicenseSummary = {
        status: 'active',
        plan: 'pro',
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndsAt: null,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        tierName: 'Pro (Demo)',
        isTrial: false,
        isGracePeriod: false,
        isValid: true,
        daysRemaining: 365,
      }
      setSummary(fakeSummary)
      setLoading(false)
      setError(null)
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
      // For sub-orgs, get effective license org_id (parent)
      let effectiveOrgId = orgId
      const { data: orgData } = await supabase
        .from('organizations')
        .select('parent_org_id')
        .eq('id', orgId)
        .maybeSingle()
      
      if (orgData?.parent_org_id) {
        // This is a sub-org, use parent's license
        effectiveOrgId = orgData.parent_org_id
      }

      // Use typed assertion to avoid "excessively deep" inference (current_tier_id may exist before types are regenerated)
      type OrgLicenseRow = {
        license_status?: string | null
        current_tier_id?: string | null
        license_current_period_start?: string | null
        license_current_period_end?: string | null
        license_trial_ends_at?: string | null
        license_grace_ends_at?: string | null
        license_cancel_at_period_end?: boolean | null
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        stripe_price_id?: string | null
        license_tiers?: { tier_name: string; tier_key: string } | null
      }
      const { data, error: fetchError } = await (supabase as any)
        .from('organizations')
        .select(`
          license_status,
          current_tier_id,
          license_current_period_start,
          license_current_period_end,
          license_trial_ends_at,
          license_grace_ends_at,
          license_cancel_at_period_end,
          stripe_customer_id,
          stripe_subscription_id,
          stripe_price_id,
          license_tiers:current_tier_id(tier_name, tier_key)
        `)
        .eq('id', effectiveOrgId)
        .maybeSingle() as { data: OrgLicenseRow | null; error: { message?: string } | null }

      if (fetchError) {
        setError(fetchError.message || 'Unknown error')
        setSummary(null)
        return
      }

      if (!data) {
        setError(t('errors.missingOrganization'))
        setSummary(null)
        return
      }

      // Get tier name from JOIN (no mapping needed)
      const tierName = data.license_tiers?.tier_name ?? null
      const tierId = data.current_tier_id ?? null

      const parsed: LicenseSummary = {
        status: (data.license_status as LicenseStatus | null) ?? null,
        tierId,
        tierName,
        currentPeriodStart: data.license_current_period_start ?? null,
        currentPeriodEnd: data.license_current_period_end ?? null,
        trialEndsAt: data.license_trial_ends_at ?? null,
        graceEndsAt: data.license_grace_ends_at ?? null,
        cancelAtPeriodEnd: data.license_cancel_at_period_end ?? null,
        stripeCustomerId: data.stripe_customer_id ?? null,
        stripeSubscriptionId: data.stripe_subscription_id ?? null,
        stripePriceId: data.stripe_price_id ?? null,
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

    const result = {
      isActive: isLicenseActive(summary),
      isReadOnlyAllowed: isLicenseReadOnlyAllowed(summary),
      isPastGracePeriod: isPastGrace(summary),
    }
    return result
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
