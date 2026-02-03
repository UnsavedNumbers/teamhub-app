// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts"

// CORS helpers
function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type"

  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
  }
}

function json(req: Request, body: unknown, status = 200) {
  const cors = buildCorsHeaders(req)
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

// Generate QR token (128-bit+ opaque) - returns both raw and hash
async function generateSecureToken(): Promise<{ raw: string; hash: string }> {
  const uuid1 = crypto.randomUUID()
  const uuid2 = crypto.randomUUID()
  const raw = uuid1.replace(/-/g, '') + uuid2.replace(/-/g, '')
  
  const encoder = new TextEncoder()
  const data = encoder.encode(raw)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  
  return { raw, hash }
}

// Generate entry code (8-10 chars, safe alphabet)
function generateEntryCode(): string {
  const safeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
  const length = 8 + Math.floor(Math.random() * 3) // 8-10 chars
  let code = ""
  for (let i = 0; i < length; i++) {
    code += safeAlphabet[Math.floor(Math.random() * safeAlphabet.length)]
  }
  return code
}

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(req, { error: "Server misconfigured" }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  // Verify admin/organizer role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  // Check if user is admin for an org
  const { data: userData } = await supabase
    .from("users")
    .select("id, org_id, role")
    .eq("id", user.id)
    .single()

  if (!userData || userData.role !== "admin") {
    return json(req, { error: "Unauthorized: admin access required" }, 403)
  }

  // Parse payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const eventId = payload?.event_id as string | undefined
  const ticketTypeId = payload?.ticket_type_id as string | undefined
  const quantity = payload?.quantity as number | undefined
  const recipientEmail = payload?.recipient_email as string | undefined
  const recipientName = payload?.recipient_name as string | undefined
  const notes = payload?.notes as string | undefined

  // Validate inputs
  if (!eventId || !ticketTypeId || !quantity || !recipientEmail) {
    return json(req, { error: "Missing required fields" }, 400)
  }

  if (quantity < 1 || quantity > 20) {
    return json(req, { error: "Quantity must be between 1 and 20" }, 400)
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return json(req, { error: "Invalid email format" }, 400)
  }

  try {
    // Verify event and ticket type exist
    const { data: event, error: eventError } = await supabase
      .from("ticketed_events")
      .select("id, title, org_id")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return json(req, { error: "Event not found" }, 404)
    }

    // Verify event belongs to user's org
    if (event.org_id !== userData.org_id) {
      return json(req, { error: "Unauthorized: event belongs to different organization" }, 403)
    }

    const { data: ticketType, error: ticketTypeError } = await supabase
      .from("ticket_types")
      .select("id, name, price_cents")
      .eq("id", ticketTypeId)
      .eq("ticketed_event_id", eventId)
      .single()

    if (ticketTypeError || !ticketType) {
      return json(req, { error: "Ticket type not found" }, 404)
    }

    // Create complimentary order
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .insert({
        org_id: event.org_id,
        ticketed_event_id: eventId,
        purchaser_user_id: null,
        purchaser_email: recipientEmail,
        purchaser_name: recipientName || "Complimentary Guest",
        status: "paid",
        subtotal_cents: 0,
        tax_cents: 0,
        fees_cents: 0,
        total_cents: 0,
        processed_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (orderError || !order) {
      return json(req, { error: "Failed to create order" }, 500)
    }

    // Create order item
    await supabase
      .from("ticket_order_items")
      .insert({
        order_id: order.id,
        ticket_type_id: ticketTypeId,
        quantity: quantity,
        unit_price_cents: 0,
        line_total_cents: 0,
      })

    // Create tickets
    const tickets: any[] = []
    const ticketsWithRawTokens: Array<{ ticket: any; qr_token_raw: string }> = []
    
    for (let i = 0; i < quantity; i++) {
      const { raw, hash } = await generateSecureToken()
      const entryCode = generateEntryCode()
      const entryCodeNormalized = entryCode.toUpperCase().replace(/[^A-Z0-9]/g, "")

      const ticket = {
        org_id: event.org_id,
        ticketed_event_id: eventId,
        order_id: order.id,
        ticket_type_id: ticketTypeId,
        status: "active",
        qr_token_hash: hash,
        entry_code: entryCodeNormalized,
      }
      
      tickets.push(ticket)
      ticketsWithRawTokens.push({ ticket, qr_token_raw: raw })
    }

    // Insert tickets and get IDs back
    const { data: insertedTickets, error: ticketsError } = await supabase
      .from("tickets")
      .insert(tickets)
      .select("id, entry_code, ticket_type_id")

    if (ticketsError || !insertedTickets) {
      return json(req, { error: `Failed to create tickets: ${ticketsError?.message || "Unknown error"}` }, 500)
    }

    // Log comp ticket generation (best effort)
    await supabase
      .from("comp_ticket_log")
      .insert({
        order_id: order.id,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity: quantity,
        recipient_email: recipientEmail,
        issued_by: user.id,
        notes: notes || `Comp tickets issued by ${user.email}`,
      })
      .catch(() => {
        // Ignore if table doesn't exist yet
      })

    // Send email with tickets
    const functionsUrl = supabaseUrl.replace("/rest/v1", "")
    try {
      // Map inserted tickets with their raw tokens for email
      const ticketsForEmail = insertedTickets.map((insertedTicket) => {
        const match = ticketsWithRawTokens.find(
          ({ ticket }) => 
            ticket.entry_code === insertedTicket.entry_code &&
            ticket.ticket_type_id === insertedTicket.ticket_type_id
        )
        return {
          id: insertedTicket.id,
          qr_token_raw: match?.qr_token_raw || "",
          entry_code: insertedTicket.entry_code,
          ticket_type_id: insertedTicket.ticket_type_id,
        }
      })
      
      await fetch(`${functionsUrl}/functions/v1/tickets-send-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
        body: JSON.stringify({ 
          order_id: order.id,
          tickets_with_tokens: ticketsForEmail,
        }),
      })
    } catch (receiptError) {
      console.error("Failed to send receipt:", receiptError)
      // Don't fail - tickets are created, email can be retried
    }

    return json(req, {
      success: true,
      order_id: order.id,
      tickets_created: insertedTickets.length,
      message: `${insertedTickets.length} comp ticket(s) sent to ${recipientEmail}`,
    })
  } catch (error: any) {
    console.error("Error generating comp tickets:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
