import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalToken = Deno.env.get('API_MANAGER_INTERNAL_TOKEN')
    if (!supabaseUrl || !serviceRoleKey || !internalToken) {
      return new Response(JSON.stringify({ error: 'API manager is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const location = url.searchParams.get('location')
    const date = url.searchParams.get('date') // ISO date string
    
    if (!location || !date) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const functionsBaseUrl = supabaseUrl.replace('/rest/v1', '')
    const response = await fetch(`${functionsBaseUrl}/functions/v1/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        operation: 'weather.getForecastByLocationDate',
        input: {
          location,
          date,
          internalToken,
        },
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.ok) {
      return new Response(JSON.stringify({ error: payload?.error?.message || 'API manager request failed' }), {
        status: response.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = payload?.data?.weatherSummary

    if (!result) {
      return new Response(JSON.stringify({ error: 'No forecast available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
