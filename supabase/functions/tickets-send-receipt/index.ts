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

// Hash token
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Generate magic link token
function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
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
  const resendApiKey = Deno.env.get("RESEND_API_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(req, { error: "Server misconfigured" }, 500)
  }

  if (!resendApiKey) {
    return json(req, { error: "Resend not configured" }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  // Parse payload
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const orderId = payload?.order_id as string | undefined

  if (!orderId) {
    return json(req, { error: "Missing order_id" }, 400)
  }

  try {
    // Load order with event and items
    const { data: order, error: orderError } = await supabase
      .from("ticket_orders")
      .select(
        `
        id,
        purchaser_email,
        purchaser_name,
        total_cents,
        ticketed_events (
          id,
          title,
          starts_at,
          venue_name,
          venue_city,
          venue_state
        )
      `,
      )
      .eq("id", orderId)
      .single()

    if (orderError || !order) {
      return json(req, { error: "Order not found" }, 404)
    }

    // Load order items
    const { data: orderItems } = await supabase
      .from("ticket_order_items")
      .select(
        `
        quantity,
        unit_price_cents,
        line_total_cents,
        ticket_types (
          name
        )
      `,
      )
      .eq("order_id", orderId)

    // Create magic link token for guest access
    const token = generateToken()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    const { error: linkError } = await supabase.from("ticket_access_links").insert({
      order_id: orderId,
      email: order.purchaser_email,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })

    if (linkError) {
      console.error("Failed to create access link:", linkError)
    }

    // Build email content
    const baseUrl = Deno.env.get("SITE_URL") || "http://localhost:3000"
    const ticketUrl = order.purchaser_name
      ? `${baseUrl}/account/tickets` // Logged-in user
      : `${baseUrl}/tickets/access/${token}` // Guest magic link

    const event = order.ticketed_events as any
    const eventDate = event?.starts_at ? new Date(event.starts_at).toLocaleDateString() : "TBD"
    const eventLocation = event?.venue_name
      ? `${event.venue_name}, ${event.venue_city || ""} ${event.venue_state || ""}`.trim()
      : "Location TBD"

    const itemsHtml = (orderItems || [])
      .map(
        (item: any) =>
          `<tr>
            <td>${item.ticket_types?.name || "Ticket"}</td>
            <td>${item.quantity}</td>
            <td>$${(item.unit_price_cents / 100).toFixed(2)}</td>
            <td>$${(item.line_total_cents / 100).toFixed(2)}</td>
          </tr>`,
      )
      .join("")

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Tickets</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Your Tickets</h1>
          
          <p>Thank you for your purchase!</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0;">${event?.title || "Event"}</h2>
            <p><strong>Date:</strong> ${eventDate}</p>
            <p><strong>Location:</strong> ${eventLocation}</p>
          </div>
          
          <h3>Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #e5e7eb;">
                <th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Ticket Type</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #d1d5db;">Qty</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Price</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; border: 1px solid #d1d5db;"><strong>Total:</strong></td>
                <td style="padding: 10px; text-align: right; border: 1px solid #d1d5db;"><strong>$${(order.total_cents / 100).toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${ticketUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Open Your Tickets</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Your tickets are ready! Click the button above to view and download them.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
        </body>
      </html>
    `

    // Send email via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "YouthSports.team <noreply@youthsports.team>",
        to: order.purchaser_email,
        subject: `Your Tickets: ${event?.title || "Event"}`,
        html: emailHtml,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error("Resend error:", errorText)
      return json(req, { error: "Failed to send email" }, 500)
    }

    // Update order receipt sent timestamp
    await supabase
      .from("ticket_orders")
      .update({ receipt_email_sent_at: new Date().toISOString() })
      .eq("id", orderId)

    return json(req, { success: true, email_sent: true })
  } catch (error: any) {
    console.error("Error sending receipt:", error)
    return json(req, { error: error.message || "Internal server error" }, 500)
  }
})
