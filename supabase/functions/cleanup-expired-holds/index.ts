import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server misconfigured" }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const [{ data: seatCleanupCount, error: seatCleanupError }, { data: ticketCleanupResult, error: ticketCleanupError }] = await Promise.all([
    supabase.rpc("cleanup_expired_seat_holds"),
    supabase.rpc("release_expired_ticket_holds"),
  ])

  if (seatCleanupError || ticketCleanupError) {
    return json({ error: seatCleanupError?.message || ticketCleanupError?.message || "Cleanup failed" }, 500)
  }

  return json({
    success: true,
    deleted_seat_holds: Number(seatCleanupCount ?? 0),
    deleted_ticket_holds: (ticketCleanupResult?.[0]?.released_holds ?? 0) as number,
  })
}) 
