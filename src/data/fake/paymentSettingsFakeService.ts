import { FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID, DEMO_ORG_B_ID } from '../config'
import type { StripeConnectStatus, StripeConnectOnboardResponse } from '../../types/stripeConnect.types'
import type { OrganizationPaymentPolicy } from '../../types/paymentSettings'
import { t } from '../../i18n'

const connectStatusStore = new Map<string, StripeConnectStatus>()
const paymentPolicyStore = new Map<string, OrganizationPaymentPolicy>()

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

function buildDefaultConnectStatus(orgId: string): StripeConnectStatus {
  const now = new Date().toISOString()

  if (orgId === DEMO_ORG_A_ID) {
    return {
      connected: true,
      payoutAccountId: 'acct_demo_a',
      payoutsEnabled: true,
      onboardingStatus: 'completed',
      payoutDescriptor: 'RIVERSIDE YOUTH',
      dashboardUrl: 'https://dashboard.stripe.com',
      disabledReason: null,
      requirementsDue: [],
      requirementsPending: [],
      requirementsErrors: [],
      requirementsDeadline: null,
      lastStatusUpdated: now,
    }
  }

  if (orgId === DEMO_ORG_B_ID) {
    return {
      connected: true,
      payoutAccountId: 'acct_demo_b',
      payoutsEnabled: false,
      onboardingStatus: 'restricted',
      payoutDescriptor: 'LINCOLN ATHLETICS',
      dashboardUrl: 'https://dashboard.stripe.com',
      disabledReason: 'requirements.past_due',
      requirementsDue: ['company.tax_id', 'company.ownership_declaration'],
      requirementsPending: [],
      requirementsErrors: [],
      requirementsDeadline: now,
      lastStatusUpdated: now,
    }
  }

  return {
    connected: false,
    payoutAccountId: null,
    payoutsEnabled: false,
    onboardingStatus: 'pending',
    payoutDescriptor: null,
    dashboardUrl: null,
    disabledReason: null,
    requirementsDue: [],
    requirementsPending: [],
    requirementsErrors: [],
    requirementsDeadline: null,
    lastStatusUpdated: now,
  }
}

function ensureConnectStatus(orgId: string): StripeConnectStatus {
  const existing = connectStatusStore.get(orgId)
  if (existing) return existing
  const created = buildDefaultConnectStatus(orgId)
  connectStatusStore.set(orgId, created)
  return created
}

function ensurePaymentPolicy(orgId: string): OrganizationPaymentPolicy {
  const existing = paymentPolicyStore.get(orgId)
  if (existing) return existing
  const created: OrganizationPaymentPolicy = {
    orgId,
    allowPartialPayments: true,
    updatedAt: new Date().toISOString(),
  }
  paymentPolicyStore.set(orgId, created)
  return created
}

export async function getStripeConnectStatus(
  orgId: string
): Promise<{ data: StripeConnectStatus | null; error: Error | null }> {
  try {
    if (!orgId) return { data: null, error: new Error(t('common.error.notFound' as any)) }
    await simulateDelay()
    return { data: ensureConnectStatus(orgId), error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function initiateStripeConnectOnboarding(
  orgId: string
): Promise<{ data: StripeConnectOnboardResponse | null; error: Error | null }> {
  try {
    if (!orgId) return { data: null, error: new Error(t('common.error.notFound' as any)) }
    await simulateDelay()
    const accountId = `acct_demo_${orgId.slice(0, 8)}`
    return {
      data: {
        account_link_url: 'https://dashboard.stripe.com',
        account_id: accountId,
        link_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        is_new_link: true,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function refreshStripeConnectStatus(
  orgId: string
): Promise<{ error: Error | null; data?: StripeConnectStatus | null }> {
  try {
    if (!orgId) return { error: new Error(t('common.error.notFound' as any)), data: null }
    await simulateDelay()
    const status = ensureConnectStatus(orgId)
    const refreshed = { ...status, lastStatusUpdated: new Date().toISOString() }
    connectStatusStore.set(orgId, refreshed)
    return { error: null, data: refreshed }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error'), data: null }
  }
}

export async function createStripeRemediationLink(
  orgId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    if (!orgId) return { url: null, error: new Error(t('common.error.notFound' as any)) }
    await simulateDelay()
    return { url: 'https://dashboard.stripe.com', error: null }
  } catch (err) {
    return { url: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function getOrganizationPaymentPolicy(
  orgId: string
): Promise<{ data: OrganizationPaymentPolicy | null; error: Error | null }> {
  try {
    if (!orgId) return { data: null, error: new Error(t('common.error.notFound' as any)) }
    await simulateDelay()
    return { data: ensurePaymentPolicy(orgId), error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateOrganizationPaymentPolicy(
  orgId: string,
  allowPartialPayments: boolean
): Promise<{ data: OrganizationPaymentPolicy | null; error: Error | null }> {
  try {
    if (!orgId) return { data: null, error: new Error(t('common.error.notFound' as any)) }
    await simulateDelay()
    const updated: OrganizationPaymentPolicy = {
      orgId,
      allowPartialPayments,
      updatedAt: new Date().toISOString(),
    }
    paymentPolicyStore.set(orgId, updated)
    return { data: updated, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
