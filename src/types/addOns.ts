/**
 * Add-On Types
 * 
 * Type definitions for Stripe add-on system.
 * Add-ons are additional subscription items added to an organization's base license subscription.
 */

// ============================================================================
// Enums
// ============================================================================

export type AddOnEntitlementStatus = 'active' | 'pending_payment' | 'canceled' | 'past_due'

export type AddOnPurchaseActionType =
  | 'addon_add_requested'
  | 'addon_add_succeeded'
  | 'addon_add_failed'
  | 'addon_remove_requested'
  | 'addon_remove_succeeded'
  | 'addon_remove_failed'
  | 'addon_removed_tier_upgrade'

// ============================================================================
// Core Types
// ============================================================================

/**
 * Add-on configuration from feature_entitlements table
 */
export interface AddOnConfig {
  feature_key: string
  available_as_addon: boolean
  addon_stripe_price_id: string | null
  addon_external_name: string | null
  addon_external_description: string | null
  addon_external_short_label: string | null
  addon_external_bullets: string[] | null
  addon_external_cta_label: string | null
  addon_display_order: number | null
  addon_is_public: boolean
  addon_eligibility_rules: Record<string, unknown> | null
}

/**
 * Organization add-on entitlement
 */
export interface OrgAddOnEntitlement {
  id: string
  org_id: string
  feature_key: string
  status: AddOnEntitlementStatus
  stripe_subscription_id: string
  stripe_subscription_item_id: string
  stripe_price_id: string
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

/**
 * Public add-on information (for org admin display)
 */
export interface PublicAddOn {
  feature_key: string
  external_name: string
  external_description: string | null
  external_short_label: string | null
  external_bullets: string[] | null
  external_cta_label: string
  display_order: number | null
  stripe_price_id: string
}

/**
 * Add-on with entitlement status (for org admin UI)
 */
export interface AddOnWithStatus extends PublicAddOn {
  entitlement_status: 'included' | 'active' | 'pending_payment' | 'not_purchased'
  entitlement_id: string | null
  current_period_end: string | null
}

// ============================================================================
// Edge Function Request/Response Types
// ============================================================================

/**
 * Request to add an add-on to an organization
 */
export interface AddOrgAddOnRequest {
  org_id: string
  feature_key: string
}

/**
 * Response from add-org-addon Edge Function
 */
export interface AddOrgAddOnResponse {
  success: boolean
  message?: string
  stripe_subscription_id?: string
  stripe_subscription_item_id?: string
  invoice_id?: string | null
  payment_action_required?: boolean
  payment_link?: string
  client_secret?: string
  entitlement_status?: AddOnEntitlementStatus
  error?: string
}

/**
 * Request to remove an add-on from an organization
 */
export interface RemoveOrgAddOnRequest {
  org_id: string
  feature_key: string
}

/**
 * Response from remove-org-addon Edge Function
 */
export interface RemoveOrgAddOnResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Request to preview add-on invoice
 */
export interface PreviewOrgAddOnInvoiceRequest {
  org_id: string
  feature_key: string
}

/**
 * Response from preview-org-addon-invoice Edge Function
 */
export interface PreviewOrgAddOnInvoiceResponse {
  success: boolean
  estimated_proration_amount?: number
  currency?: string
  next_invoice_date?: number | null
  line_items?: Array<{
    description: string
    amount: number
    currency: string
  }>
  error?: string
}
