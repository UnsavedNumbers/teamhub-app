/**
 * Demo Request Webhook Service
 * 
 * Handles webhook submission for public demo request form submissions.
 */

import { getBaseUrl } from '../utils/host'
import { getLink, RouteKeys } from '../utils/routes'
import { invokeApiOperation } from './apiManagerService'

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
  // Check offline mode
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: 'You appear to be offline. Please check your connection and try again.',
    }
  }

  try {
    const response = await invokeApiOperation<{ statusCode: number }>({
      operation: 'automation.sendDemoRequest',
      input: payload as unknown as Record<string, unknown>,
    })

    if (!response.ok) {
      return {
        success: false,
        error: `${response.error.message} [${response.error.code}]`,
      }
    }

    return {
      success: true,
      statusCode: response.data.statusCode,
    }
  } catch (error) {
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
  
  return `${baseUrl}${getLink(RouteKeys.PLATFORM_DEMO_MANAGEMENT)}?highlight=${demoOrgId}`
}
