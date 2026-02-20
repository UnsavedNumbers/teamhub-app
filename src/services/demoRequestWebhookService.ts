/**
 * Demo Request Webhook Service
 * 
 * Handles webhook submission for public demo request form submissions.
 */

import { getBaseUrl } from '../utils/host'

// ============================================================================
// Payload Types
// ============================================================================

export interface DemoRequestPayload {
  type: 'demo_request'
  base_url: string
  demo_org_id: string
  name: string
  first_name: string
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
  requested_at: string
  review_url: string
  submitted_at: string
}

// ============================================================================
// Webhook Submission
// ============================================================================

export interface DemoRequestWebhookResult {
  success: boolean
  statusCode?: number
  error?: string
}

/**
 * Send demo request webhook notification
 */
export async function sendDemoRequestWebhook(
  payload: DemoRequestPayload
): Promise<DemoRequestWebhookResult> {
  const webhookUrl = import.meta.env.VITE_DEMO_REQUEST_WEBHOOK_URL

  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
    console.warn('Demo request webhook URL not configured')
    return {
      success: false,
      error: 'Webhook URL not configured',
    }
  }

  // Check offline mode
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: 'You appear to be offline. Please check your connection and try again.',
    }
  }

  // Set up timeout (10 seconds)
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

/**
 * Build review URL for demo organization
 */
export function buildReviewUrl(demoOrgId: string): string {
  const serverHost = import.meta.env.VITE_SERVER_HOST
  const baseUrl = serverHost && typeof serverHost === 'string' && serverHost.trim()
    ? serverHost.trim()
    : getBaseUrl()
  
  return `${baseUrl}/platform-admin/demo-management?highlight=${demoOrgId}`
}
