import { getBaseUrl } from '../utils/host'
import type { DemoOrgPOC } from '../types/demoManagement'

export interface SendApprovalEmailResult {
  success: boolean
  statusCode?: number
  error?: string
}

export interface DemoResultPayload {
  type: 'demo_approved' | 'demo_rejected'
  demo_org_id: string
  name: string
  firstName: string
  last_name: string
  email: string
  phone?: string | null
  city?: string | null
  state?: string | null
  country: string
  timezone: string
  org_type?: string | null
  sports_sponsored: string[]
  notes?: string | null
  demo_code?: string
  reviewed_at: string
}

export async function sendApprovalEmail(
  orgId: string,
  demoCode: string,
  primaryPoc: DemoOrgPOC | null,
  org?: { name: string; city?: string | null; state?: string | null; country: string; timezone: string; org_type?: string | null; sports_sponsored: string[]; notes?: string | null }
): Promise<SendApprovalEmailResult> {
  const webhookUrl = import.meta.env.VITE_DEMO_RESULT_WEBHOOK_URL

  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
    return {
      success: false,
      error: 'Webhook URL not configured',
    }
  }

  if (!primaryPoc) {
    console.warn('No primary POC found for demo org', orgId)
  }

  const payload: DemoResultPayload = {
    type: 'demo_approved',
    demo_org_id: orgId,
    name: org?.name ?? '',
    firstName: primaryPoc?.first_name ?? '',
    last_name: primaryPoc?.last_name ?? '',
    email: primaryPoc?.email ?? '',
    phone: primaryPoc?.phone ?? null,
    city: org?.city ?? null,
    state: org?.state ?? null,
    country: org?.country ?? 'US',
    timezone: org?.timezone ?? '',
    org_type: org?.org_type ?? null,
    sports_sponsored: org?.sports_sponsored ?? [],
    notes: org?.notes ?? null,
    demo_code: demoCode,
    reviewed_at: new Date().toISOString(),
  }

  return sendDemoResultWebhook(payload)
}

export async function sendRejectionWebhook(
  orgId: string,
  primaryPoc: DemoOrgPOC | null,
  org?: { name: string; city?: string | null; state?: string | null; country: string; timezone: string; org_type?: string | null; sports_sponsored: string[]; notes?: string | null }
): Promise<SendApprovalEmailResult> {
  const webhookUrl = import.meta.env.VITE_DEMO_RESULT_WEBHOOK_URL

  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
    return {
      success: false,
      error: 'Webhook URL not configured',
    }
  }

  const payload: DemoResultPayload = {
    type: 'demo_rejected',
    demo_org_id: orgId,
    name: org?.name ?? '',
    firstName: primaryPoc?.first_name ?? '',
    last_name: primaryPoc?.last_name ?? '',
    email: primaryPoc?.email ?? '',
    phone: primaryPoc?.phone ?? null,
    city: org?.city ?? null,
    state: org?.state ?? null,
    country: org?.country ?? 'US',
    timezone: org?.timezone ?? '',
    org_type: org?.org_type ?? null,
    sports_sponsored: org?.sports_sponsored ?? [],
    notes: org?.notes ?? null,
    reviewed_at: new Date().toISOString(),
  }

  return sendDemoResultWebhook(payload)
}

async function sendDemoResultWebhook(payload: DemoResultPayload): Promise<SendApprovalEmailResult> {
  const webhookUrl = import.meta.env.VITE_DEMO_RESULT_WEBHOOK_URL

  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
    return {
      success: false,
      error: 'Webhook URL not configured',
    }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: 'You appear to be offline. Please check your connection and try again.',
    }
  }

  const controller = typeof AbortController !== 'undefined' 
    ? new AbortController() 
    : null
  const timeoutId = controller 
    ? setTimeout(() => controller.abort(), 10000)
    : null

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    })

    if (timeoutId) clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return {
        success: false,
        statusCode: response.status,
        error: `Webhook returned ${response.status}: ${errorText}`,
      }
    }

    return {
      success: true,
      statusCode: response.status,
    }
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId)

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out',
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
