import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

interface UpsertPayload {
  orgId: string | null
  deviceId: string
  provider: 'onesignal'
  providerSubscriptionId: string | null
  permission: PermissionState
  isActive: boolean
  metadata: Record<string, unknown>
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parsePayload(raw: unknown): { value: UpsertPayload | null; error: string | null } {
  if (!raw || typeof raw !== 'object') {
    return { value: null, error: 'Invalid payload' }
  }

  const candidate = raw as Record<string, unknown>
  const deviceId = typeof candidate.deviceId === 'string' ? candidate.deviceId.trim() : ''
  const provider = candidate.provider
  const permission = candidate.permission
  const isActive = candidate.isActive
  const orgId = candidate.orgId
  const providerSubscriptionId = candidate.providerSubscriptionId
  const metadata = candidate.metadata

  if (!deviceId) return { value: null, error: 'deviceId is required' }
  if (provider !== 'onesignal') return { value: null, error: 'provider must be onesignal' }
  if (!['granted', 'denied', 'default', 'unsupported'].includes(String(permission))) {
    return { value: null, error: 'permission is invalid' }
  }
  if (typeof isActive !== 'boolean') return { value: null, error: 'isActive must be a boolean' }
  if (orgId !== null && orgId !== undefined && typeof orgId !== 'string') {
    return { value: null, error: 'orgId must be a string or null' }
  }
  if (providerSubscriptionId !== null && providerSubscriptionId !== undefined && typeof providerSubscriptionId !== 'string') {
    return { value: null, error: 'providerSubscriptionId must be a string or null' }
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { value: null, error: 'metadata must be an object' }
  }

  return {
    value: {
      orgId: typeof orgId === 'string' ? orgId : null,
      deviceId,
      provider,
      providerSubscriptionId: typeof providerSubscriptionId === 'string' && providerSubscriptionId.trim().length > 0
        ? providerSubscriptionId
        : null,
      permission: permission as PermissionState,
      isActive,
      metadata: metadata as Record<string, unknown>,
    },
    error: null,
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration is incomplete' })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  let parsedBody: unknown
  try {
    parsedBody = await req.json()
  } catch {
    return jsonResponse(400, { error: 'Request body must be valid JSON' })
  }

  const { value, error } = parsePayload(parsedBody)
  if (!value || error) {
    return jsonResponse(422, { error: error ?? 'Invalid payload' })
  }

  const { error: upsertError } = await supabase
    .from('user_push_subscriptions')
    .upsert(
      {
        user_id: authData.user.id,
        org_id: value.orgId,
        device_id: value.deviceId,
        provider: value.provider,
        provider_subscription_id: value.providerSubscriptionId,
        permission: value.permission,
        is_active: value.isActive,
        metadata: value.metadata,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,org_id,device_id,provider',
      }
    )

  if (upsertError) {
    return jsonResponse(500, { error: 'Failed to update push subscription state' })
  }

  return jsonResponse(200, { success: true })
})
