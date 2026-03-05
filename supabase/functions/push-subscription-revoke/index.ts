import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RevokePayload {
  orgId: string | null
  deviceId: string
  provider: 'onesignal'
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parsePayload(raw: unknown): { value: RevokePayload | null; error: string | null } {
  if (!raw || typeof raw !== 'object') {
    return { value: null, error: 'Invalid payload' }
  }

  const candidate = raw as Record<string, unknown>
  const orgId = candidate.orgId
  const deviceId = typeof candidate.deviceId === 'string' ? candidate.deviceId.trim() : ''
  const provider = candidate.provider

  if (!deviceId) return { value: null, error: 'deviceId is required' }
  if (provider !== 'onesignal') return { value: null, error: 'provider must be onesignal' }
  if (orgId !== null && orgId !== undefined && typeof orgId !== 'string') {
    return { value: null, error: 'orgId must be a string or null' }
  }

  return {
    value: {
      orgId: typeof orgId === 'string' ? orgId : null,
      deviceId,
      provider,
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

  const query = supabase
    .from('user_push_subscriptions')
    .update({
      is_active: false,
      permission: 'default',
      last_seen_at: new Date().toISOString(),
    })
    .eq('user_id', authData.user.id)
    .eq('device_id', value.deviceId)
    .eq('provider', value.provider)

  if (value.orgId) {
    query.eq('org_id', value.orgId)
  } else {
    query.is('org_id', null)
  }

  const { error: updateError } = await query

  if (updateError) {
    return jsonResponse(500, { error: 'Failed to revoke push subscription' })
  }

  return jsonResponse(200, { success: true })
})
