// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

type WalletType = "google" | "apple"

interface WalletPassRequest {
  ticket_id?: string
  wallet_type?: WalletType
}

interface TicketWithRelations {
  id: string
  org_id: string
  order_id: string
  status: string
  entry_code: string
  holder_user_id: string | null
  ticket_types?: {
    name?: string | null
  } | null
  ticketed_events?: {
    id?: string | null
    title?: string | null
    starts_at?: string | null
    ends_at?: string | null
    venue_name?: string | null
    venue_city?: string | null
    venue_state?: string | null
  } | null
  ticket_orders?: {
    purchaser_user_id?: string | null
    purchaser_email?: string | null
    purchaser_name?: string | null
  } | null
}

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type"

  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  })
}

function escapeHtml(value: string | null | undefined): string {
  const source = value ?? ""
  return source
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function toDataUrl(mimeType: string, content: string): string {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`
}

function buildVenueLabel(ticket: TicketWithRelations): string {
  const event = ticket.ticketed_events
  const pieces = [event?.venue_name, event?.venue_city, event?.venue_state]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0)

  return pieces.length > 0 ? pieces.join(", ") : "Venue TBD"
}

function buildDateLabel(startsAt: string | null | undefined): string {
  if (!startsAt) return "Date TBD"
  const parsed = new Date(startsAt)
  if (Number.isNaN(parsed.getTime())) return "Date TBD"
  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function buildPreviewDataUrl(ticket: TicketWithRelations): string {
  const title = escapeHtml((ticket.ticketed_events?.title ?? "Event Ticket").trim() || "Event Ticket")
  const venue = escapeHtml(buildVenueLabel(ticket))
  const dateText = escapeHtml(buildDateLabel(ticket.ticketed_events?.starts_at))
  const entryCode = escapeHtml(ticket.entry_code || "N/A")
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=280x280&chl=${encodeURIComponent(ticket.entry_code || ticket.id)}`

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - Digital Pass</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #0b1220; color: #f8fafc; }
    .card { max-width: 460px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; }
    .eyebrow { margin: 0 0 8px; color: #93c5fd; text-transform: uppercase; font-size: 12px; letter-spacing: 0.08em; }
    h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.2; }
    p { margin: 0 0 8px; color: #cbd5e1; }
    img { margin: 16px auto 12px; display: block; width: 280px; height: 280px; background: #fff; border-radius: 12px; padding: 8px; }
    .code { margin-top: 8px; font-weight: 700; letter-spacing: 0.08em; }
    .note { margin-top: 14px; font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Digital Ticket Pass</p>
    <h1>${title}</h1>
    <p>${dateText}</p>
    <p>${venue}</p>
    <img src="${qrUrl}" alt="Ticket QR code" />
    <p class="code">Entry Code: ${entryCode}</p>
    <p class="note">Present this pass at the gate for admission.</p>
  </main>
</body>
</html>`

  return toDataUrl("text/html", html)
}

function buildAppleCalendarPass(ticket: TicketWithRelations): { url: string; filename: string } {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  const startsAt = ticket.ticketed_events?.starts_at ? new Date(ticket.ticketed_events.starts_at) : null
  const startUtc = startsAt && !Number.isNaN(startsAt.getTime())
    ? startsAt.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : ""
  const endUtc = startsAt && !Number.isNaN(startsAt.getTime())
    ? new Date(startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
    : ""

  const title = (ticket.ticketed_events?.title ?? "Event Ticket").replace(/\r?\n/g, " ").trim()
  const location = buildVenueLabel(ticket).replace(/\r?\n/g, " ").trim()
  const description = `Entry code: ${ticket.entry_code}\\nPresent your QR code at entry.`

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//YouthSports Team//Ticket Wallet//EN",
    "BEGIN:VEVENT",
    `UID:ticket-${ticket.id}@youthsports.team`,
    `DTSTAMP:${now}`,
    startUtc ? `DTSTART:${startUtc}` : "",
    endUtc ? `DTEND:${endUtc}` : "",
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line) => line.length > 0).join("\r\n")

  const eventSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "event-ticket"
  return {
    url: toDataUrl("text/calendar", ics),
    filename: `${eventSlug}.ics`,
  }
}

function base64UrlEncodeString(value: string): string {
  const encoded = new TextEncoder().encode(value)
  return btoa(String.fromCharCode(...encoded)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlEncodeBuffer(value: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem
    .replaceAll("\\n", "\n")
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "")
    .trim()

  const binary = atob(normalized)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

async function buildGoogleWalletUrl(ticket: TicketWithRelations): Promise<string | null> {
  const issuerId = (Deno.env.get("GOOGLE_WALLET_ISSUER_ID") ?? "").trim()
  const classIdEnv = (Deno.env.get("GOOGLE_WALLET_CLASS_ID") ?? "").trim()
  const serviceAccountEmail = (Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL") ?? "").trim()
  const privateKeyPem = (Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY") ?? "").trim()

  if (!issuerId || !serviceAccountEmail || !privateKeyPem) {
    return null
  }

  const classId = classIdEnv.length > 0 ? classIdEnv : `${issuerId}.youthsports_ticket`
  const objectSuffix = ticket.id.replace(/[^A-Za-z0-9._-]/g, "_")
  const objectId = `${issuerId}.${objectSuffix}`
  const eventTitle = (ticket.ticketed_events?.title ?? "Event Ticket").trim() || "Event Ticket"
  const ticketTypeName = (ticket.ticket_types?.name ?? "Ticket").trim() || "Ticket"
  const venueLabel = buildVenueLabel(ticket)
  const startsAtText = buildDateLabel(ticket.ticketed_events?.starts_at)

  const genericObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: {
      defaultValue: { language: "en-US", value: eventTitle },
    },
    header: {
      defaultValue: { language: "en-US", value: ticketTypeName },
    },
    subheader: {
      defaultValue: { language: "en-US", value: startsAtText },
    },
    barcode: {
      type: "QR_CODE",
      value: ticket.entry_code,
      alternateText: ticket.entry_code,
    },
    textModulesData: [
      {
        id: "venue",
        header: "Venue",
        body: venueLabel,
      },
      {
        id: "entry_code",
        header: "Entry Code",
        body: ticket.entry_code,
      },
    ],
    hexBackgroundColor: "#137fec",
  }

  const payload: Record<string, unknown> = {
    iss: serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      genericObjects: [genericObject],
      genericClasses: classIdEnv.length > 0
        ? undefined
        : [{
          id: classId,
          classTemplateInfo: {
            cardTemplateOverride: {
              cardRowTemplateInfos: [],
            },
          },
        }],
    },
  }

  const headerEncoded = base64UrlEncodeString(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const payloadEncoded = base64UrlEncodeString(JSON.stringify(payload))
  const signingInput = `${headerEncoded}.${payloadEncoded}`

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(signingInput),
  )
  const signatureEncoded = base64UrlEncodeBuffer(signature)
  return `https://pay.google.com/gp/v/save/${headerEncoded}.${payloadEncoded}.${signatureEncoded}`
}

function resolveAppleWalletUrlFromTemplate(ticket: TicketWithRelations): string | null {
  const template = (Deno.env.get("APPLE_WALLET_URL_TEMPLATE") ?? "").trim()
  if (!template) {
    return null
  }

  const event = ticket.ticketed_events
  const replacements: Record<string, string> = {
    "{ticket_id}": encodeURIComponent(ticket.id),
    "{entry_code}": encodeURIComponent(ticket.entry_code),
    "{event_id}": encodeURIComponent(event?.id ?? ""),
    "{event_title}": encodeURIComponent(event?.title ?? ""),
    "{org_id}": encodeURIComponent(ticket.org_id),
  }

  let resolved = template
  for (const [token, value] of Object.entries(replacements)) {
    resolved = resolved.replaceAll(token, value)
  }
  return resolved
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { error: "Server misconfigured" }, 500)
  }

  const authHeader = req.headers.get("Authorization") ?? ""
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: authData, error: authError } = await supabase.auth.getUser()
  const userId = authData.user?.id ?? null
  if (authError || !userId) {
    return json(req, { error: "Authentication required" }, 401)
  }

  let payload: WalletPassRequest
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON payload" }, 400)
  }

  const ticketId = typeof payload.ticket_id === "string" ? payload.ticket_id.trim() : ""
  const walletType: WalletType = payload.wallet_type === "apple" ? "apple" : "google"
  if (!ticketId) {
    return json(req, { error: "ticket_id is required" }, 400)
  }

  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .select(`
      id,
      org_id,
      order_id,
      status,
      entry_code,
      holder_user_id,
      ticket_types (name),
      ticketed_events (
        id,
        title,
        starts_at,
        ends_at,
        venue_name,
        venue_city,
        venue_state
      ),
      ticket_orders (
        purchaser_user_id,
        purchaser_email,
        purchaser_name
      )
    `)
    .eq("id", ticketId)
    .single()

  if (ticketError || !ticket) {
    return json(req, { error: "Ticket not found" }, 404)
  }

  const typedTicket = ticket as TicketWithRelations
  const isOwner = typedTicket.holder_user_id === userId || typedTicket.ticket_orders?.purchaser_user_id === userId
  if (!isOwner) {
    return json(req, { error: "Access denied" }, 403)
  }

  if (typedTicket.status !== "active" && typedTicket.status !== "used") {
    return json(req, { error: "This ticket cannot be added to wallet in its current status" }, 400)
  }

  if (walletType === "google") {
    try {
      const walletUrl = await buildGoogleWalletUrl(typedTicket)
      if (walletUrl) {
        return json(req, {
          wallet_type: "google",
          action: "open",
          url: walletUrl,
          is_fallback: false,
        })
      }
    } catch (error) {
      console.error("Failed to build Google Wallet URL:", error)
    }

    return json(req, {
      wallet_type: "google",
      action: "open",
      url: buildPreviewDataUrl(typedTicket),
      is_fallback: true,
    })
  }

  const configuredAppleUrl = resolveAppleWalletUrlFromTemplate(typedTicket)
  if (configuredAppleUrl) {
    return json(req, {
      wallet_type: "apple",
      action: "open",
      url: configuredAppleUrl,
      is_fallback: false,
    })
  }

  const appleFallback = buildAppleCalendarPass(typedTicket)
  return json(req, {
    wallet_type: "apple",
    action: "download",
    url: appleFallback.url,
    filename: appleFallback.filename,
    is_fallback: true,
  })
})
