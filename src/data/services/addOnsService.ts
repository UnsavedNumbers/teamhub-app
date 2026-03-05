/**
 * Add-Ons Service
 * 
 * Data access layer for Stripe add-on system.
 * Handles fetching add-on configurations, entitlements, and calling Edge Functions.
 */

import { supabase } from '../../lib/supabase'
import type {
  OrgAddOnEntitlement,
  PublicAddOn,
  AddOnWithStatus,
  AddOrgAddOnRequest,
  AddOrgAddOnResponse,
  RemoveOrgAddOnRequest,
  RemoveOrgAddOnResponse,
  PreviewOrgAddOnInvoiceRequest,
  PreviewOrgAddOnInvoiceResponse,
} from '../../types/addOns'
import { createServiceResponse } from './responseHelpers'
import { classifySupabaseError } from '@/utils/supabaseErrorHandler'

// ============================================================================
// Public Add-Ons (for Org Admin)
// ============================================================================

/**
 * Get all public add-ons available for purchase
 */
export async function getAvailableAddOns(_orgId: string): Promise<{
  data: PublicAddOn[] | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('feature_entitlements')
      .select('feature_key, addon_external_name, addon_external_description, addon_external_short_label, addon_external_bullets, addon_external_cta_label, addon_display_order, addon_stripe_price_id')
      .eq('available_as_addon', true)
      .eq('addon_is_public', true)
      .is('archived_at', null)
      .order('addon_display_order', { ascending: true, nullsFirst: false })
      .order('addon_external_name', { ascending: true })

    if (error) {
      throw error
    }

    const addOns: PublicAddOn[] = (data || [])
      .filter((f) => f.addon_external_name && f.addon_stripe_price_id)
      .map((f) => ({
        feature_key: f.feature_key,
        external_name: f.addon_external_name!,
        external_description: f.addon_external_description || null,
        external_short_label: f.addon_external_short_label || null,
        external_bullets: Array.isArray(f.addon_external_bullets)
          ? f.addon_external_bullets.filter((bullet): bullet is string => typeof bullet === 'string')
          : null,
        external_cta_label: f.addon_external_cta_label || `Add ${f.addon_external_name}`,
        display_order: f.addon_display_order || null,
        stripe_price_id: f.addon_stripe_price_id!,
      }))

    return createServiceResponse(addOns, null)
  } catch (error) {
    return createServiceResponse(null, classifySupabaseError(error, 'Available add-ons'))
  }
}

/**
 * Get organization's add-on entitlements
 */
export async function getOrgAddOnEntitlements(orgId: string): Promise<{
  data: OrgAddOnEntitlement[] | null
  error: Error | null
}> {
  try {
    const { data, error } = await (supabase as any)
      .from('org_addon_entitlements')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return createServiceResponse(data as OrgAddOnEntitlement[] | null, null)
  } catch (error) {
    return createServiceResponse(null, classifySupabaseError(error, 'Add-on entitlements'))
  }
}

/**
 * Get add-ons with entitlement status for org admin UI
 */
export async function getAddOnsWithStatus(orgId: string): Promise<{
  data: AddOnWithStatus[] | null
  error: Error | null
}> {
  try {
    // Fetch available add-ons and entitlements in parallel
    const [addOnsResult, entitlementsResult] = await Promise.all([
      getAvailableAddOns(orgId),
      getOrgAddOnEntitlements(orgId),
    ])

    if (addOnsResult.error) {
      return createServiceResponse(null, addOnsResult.error)
    }

    if (entitlementsResult.error) {
      return createServiceResponse(null, entitlementsResult.error)
    }

    const addOns = addOnsResult.data || []
    const entitlements = entitlementsResult.data || []

    // Get org's current tier to check if features are included
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('current_tier_id')
      .eq('id', orgId)
      .maybeSingle()

    if (orgError) {
      return createServiceResponse(null, classifySupabaseError(orgError, 'Organization'))
    }

    // Check which features are included in tier
    let includedFeatureKeys: string[] = []
    if (org?.current_tier_id) {
      const { data: tierFeatures, error: tierError } = await supabase
        .from('tier_feature_assignments')
        .select('feature_entitlements!inner(feature_key)')
        .eq('license_tier_id', org.current_tier_id)
        .eq('included', true)

      if (!tierError && tierFeatures) {
        includedFeatureKeys = tierFeatures
          .map((tf: any) => tf.feature_entitlements?.feature_key)
          .filter((key: string | undefined): key is string => !!key)
      }
    }

    // Map entitlements by feature_key
    const entitlementsByFeatureKey = new Map<string, OrgAddOnEntitlement>()
    entitlements.forEach((ent) => {
      entitlementsByFeatureKey.set(ent.feature_key, ent)
    })

    // Combine add-ons with entitlement status
    const addOnsWithStatus: AddOnWithStatus[] = addOns.map((addOn) => {
      const entitlement = entitlementsByFeatureKey.get(addOn.feature_key)

      let entitlementStatus: 'included' | 'active' | 'pending_payment' | 'not_purchased'
      let entitlementId: string | null = null
      let currentPeriodEnd: string | null = null

      if (includedFeatureKeys.includes(addOn.feature_key)) {
        entitlementStatus = 'included'
      } else if (entitlement) {
        // Map entitlement status: active -> active, pending_payment -> pending_payment, past_due -> pending_payment, canceled -> not_purchased
        if (entitlement.status === 'active') {
          entitlementStatus = 'active'
        } else if (entitlement.status === 'pending_payment' || entitlement.status === 'past_due') {
          entitlementStatus = 'pending_payment'
        } else {
          // canceled -> treat as not purchased
          entitlementStatus = 'not_purchased'
        }
        entitlementId = entitlement.id
        currentPeriodEnd = entitlement.current_period_end
      } else {
        entitlementStatus = 'not_purchased'
      }

      return {
        ...addOn,
        entitlement_status: entitlementStatus,
        entitlement_id: entitlementId,
        current_period_end: currentPeriodEnd,
      }
    })

    return createServiceResponse(addOnsWithStatus, null)
  } catch (error) {
    return createServiceResponse(null, classifySupabaseError(error, 'Add-ons with status'))
  }
}

/**
 * Get single add-on by feature_key
 */
export async function getAddOnByFeatureKey(featureKey: string): Promise<{
  data: PublicAddOn | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('feature_entitlements')
      .select('feature_key, addon_external_name, addon_external_description, addon_external_short_label, addon_external_bullets, addon_external_cta_label, addon_display_order, addon_stripe_price_id')
      .eq('feature_key', featureKey)
      .eq('available_as_addon', true)
      .eq('addon_is_public', true)
      .is('archived_at', null)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data || !data.addon_external_name || !data.addon_stripe_price_id) {
      return createServiceResponse(null, new Error('Add-on not found'))
    }

    const addOn: PublicAddOn = {
      feature_key: data.feature_key,
      external_name: data.addon_external_name,
      external_description: data.addon_external_description || null,
      external_short_label: data.addon_external_short_label || null,
      external_bullets: Array.isArray(data.addon_external_bullets)
        ? data.addon_external_bullets.filter((bullet): bullet is string => typeof bullet === 'string')
        : null,
      external_cta_label: data.addon_external_cta_label || `Add ${data.addon_external_name}`,
      display_order: data.addon_display_order || null,
      stripe_price_id: data.addon_stripe_price_id,
    }

    return createServiceResponse(addOn, null)
  } catch (error) {
    return createServiceResponse(null, classifySupabaseError(error, 'Add-on'))
  }
}

// ============================================================================
// Edge Function Calls
// ============================================================================

/**
 * Add an add-on to an organization's subscription
 */
export async function addOrgAddOn(
  params: AddOrgAddOnRequest,
): Promise<AddOrgAddOnResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('add-org-addon', {
      body: params,
    })

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to add add-on',
      }
    }

    return data as AddOrgAddOnResponse
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}

/**
 * Remove an add-on from an organization's subscription
 */
export async function removeOrgAddOn(
  params: RemoveOrgAddOnRequest,
): Promise<RemoveOrgAddOnResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('remove-org-addon', {
      body: params,
    })

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to remove add-on',
      }
    }

    return data as RemoveOrgAddOnResponse
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}

/**
 * Preview invoice for adding an add-on
 */
export async function previewOrgAddOnInvoice(
  params: PreviewOrgAddOnInvoiceRequest,
): Promise<PreviewOrgAddOnInvoiceResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('preview-org-addon-invoice', {
      body: params,
    })

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to preview invoice',
      }
    }

    return data as PreviewOrgAddOnInvoiceResponse
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    }
  }
}
