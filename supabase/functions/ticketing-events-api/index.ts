// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

type Json = Record<string, unknown>

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizePath(req: Request) {
  const url = new URL(req.url)
  const pathOverride = url.searchParams.get("path")
  const baseRemoved = url.pathname.replace(/^\/functions\/v1\/ticketing-events-api/, "")
  const rawPath = pathOverride || baseRemoved
  return rawPath.split("/").filter(Boolean)
}

function applyDatePreset(preset: string | null) {
  if (!preset) return { from: null, to: null }
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (preset === "today") {
    const to = new Date(startOfToday)
    to.setDate(to.getDate() + 1)
    return { from: startOfToday, to }
  }
  if (preset === "this_week") {
    const day = startOfToday.getDay()
    const diff = startOfToday.getDate() - day
    const from = new Date(startOfToday)
    from.setDate(diff)
    const to = new Date(from)
    to.setDate(from.getDate() + 7)
    return { from, to }
  }
  if (preset === "this_month") {
    const from = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1)
    const to = new Date(startOfToday.getFullYear(), startOfToday.getMonth() + 1, 1)
    return { from, to }
  }
  if (preset === "upcoming") {
    return { from: startOfToday, to: null }
  }
  if (preset === "past") {
    return { from: null, to: startOfToday }
  }
  return { from: null, to: null }
}

function computeSaleStatus(row: any, ticketsSold: number, capacityTotal: number | null): string {
  const status = row.status
  const now = new Date()
  const start = row.sales_start_at ? new Date(row.sales_start_at) : null
  const end = row.sales_end_at ? new Date(row.sales_end_at) : null
  const isPublished = status === "published"
  if (!isPublished) return "off"
  if (start && start > now) return "scheduled"
  if (end && end < now) return "ended"
  if (capacityTotal && ticketsSold >= capacityTotal) return "sold_out"
  return "on_sale"
}

async function getSupabaseClients(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env vars missing")
  }
  const authHeader = req.headers.get("Authorization") ?? ""
  const client = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data } = await client.auth.getUser()
  return { client, user: data?.user }
}

async function fetchOrdersMetrics(client: any, eventIds: string[]) {
  if (eventIds.length === 0) return { byEvent: new Map(), totals: { ticketsSold: 0, revenueCents: 0 } }
  const { data: orders, error } = await client
    .from("ticket_orders")
    .select("ticketed_event_id,status,total_cents,org_revenue_cents,ticket_order_items(quantity)")
    .in("ticketed_event_id", eventIds)
  if (error) throw error

  const byEvent = new Map<string, { ticketsSold: number; revenueCents: number }>()
  let totalTickets = 0
  let totalRevenue = 0

  for (const order of orders ?? []) {
    if (!order.ticketed_event_id) continue
    const status = order.status as string
    if (status !== "paid" && status !== "pending_payment") continue
    const items = (order.ticket_order_items ?? []) as any[]
    const qty = items.reduce((sum, item) => sum + (item?.quantity ?? 0), 0)
    const revenue = order.org_revenue_cents ?? order.total_cents ?? 0

    const existing = byEvent.get(order.ticketed_event_id) ?? { ticketsSold: 0, revenueCents: 0 }
    existing.ticketsSold += qty
    existing.revenueCents += revenue
    byEvent.set(order.ticketed_event_id, existing)

    totalTickets += qty
    totalRevenue += revenue
  }

  return { byEvent, totals: { ticketsSold: totalTickets, revenueCents: totalRevenue } }
}

async function handleEventsList(orgId: string, url: URL, client: any) {
  const page = Math.max(1, parseNumber(url.searchParams.get("page"), 1))
  const perPage = Math.min(100, Math.max(5, parseNumber(url.searchParams.get("per_page"), 20)))
  const search = url.searchParams.get("search")?.trim() || null
  const sortBy = url.searchParams.get("sort_by") || "starts_at"
  const status = url.searchParams.get("status")
  const saleStatusFilter = url.searchParams.get("sale_status")

  const programIds = url.searchParams.getAll("program_id").filter(Boolean)
  const seasonIds = url.searchParams.getAll("season_id").filter(Boolean)
  const venueIds = url.searchParams.getAll("venue_id").filter(Boolean)

  const preset = url.searchParams.get("date_preset")
  const dateFromParam = url.searchParams.get("date_from")
  const dateToParam = url.searchParams.get("date_to")
  const { from: presetFrom, to: presetTo } = applyDatePreset(preset)
  const dateFrom = dateFromParam ? new Date(dateFromParam) : presetFrom
  const dateTo = dateToParam ? new Date(dateToParam) : presetTo

  let query = client
    .from("ticketed_events")
    .select(`
      *,
      programs:program_id (id,name,slug,color,sport,is_active),
      seasons:season_id (id,name,slug,start_date,end_date,is_active),
      venues:venue_id (id,name,address,city,state,capacity),
      ticket_types(capacity_total,capacity_remaining,price_cents,currency,is_active)
    `)
    .eq("org_id", orgId)
    .order("starts_at", { ascending: true })

  if (programIds.length > 0) query = query.in("program_id", programIds)
  if (seasonIds.length > 0) query = query.in("season_id", seasonIds)
  if (venueIds.length > 0) query = query.in("venue_id", venueIds)
  if (status) query = query.eq("status", status)
  if (search) query = query.textSearch("search_vector", search, { type: "websearch", config: "english" })
  if (dateFrom) query = query.gte("starts_at", dateFrom.toISOString())
  if (dateTo) query = query.lte("starts_at", dateTo.toISOString())

  // Pull up to 2000 rows to support sale_status filtering + client-side sorting
  const { data: rows, error } = await query.limit(2000)
  if (error) throw error

  const eventsRaw = rows ?? []

  // Capacity + basic metrics from ticket types
  const eventsBase = eventsRaw.map((row: any) => {
    const ticketTypes = (row.ticket_types ?? []) as any[]
    const capacityTotal = ticketTypes.reduce((sum, tt) => sum + (tt?.capacity_total ?? 0), 0)
    const capacityRemaining = ticketTypes.reduce((sum, tt) => sum + (tt?.capacity_remaining ?? 0), 0)
    return { ...row, capacityTotal, capacityRemaining }
  })

  // Revenue + ticket counts
  const eventIds = eventsBase.map((e) => e.id)
  const { byEvent, totals } = await fetchOrdersMetrics(client, eventIds)

  const hydrated = eventsBase.map((row) => {
    const orderMetrics = byEvent.get(row.id) || { ticketsSold: 0, revenueCents: 0 }
    const ticketsSold =
      orderMetrics.ticketsSold ||
      (row.capacityTotal && row.capacityRemaining !== null
        ? Math.max(0, row.capacityTotal - row.capacityRemaining)
        : 0)

    const sale_status = computeSaleStatus(row, ticketsSold, row.capacityTotal || null)

    const ticketProgress =
      row.capacityTotal && row.capacityTotal > 0
        ? Math.min(100, Math.round((ticketsSold / row.capacityTotal) * 100))
        : null

    return {
      ...row,
      sale_status,
      tickets_sold: ticketsSold,
      revenue_cents: orderMetrics.revenueCents,
      ticket_progress_pct: ticketProgress,
    }
  })

  // Apply sale_status filter after computation
  const filtered = saleStatusFilter
    ? hydrated.filter((e) => e.sale_status === saleStatusFilter)
    : hydrated

  // Aggregations
  const countsByStatus: Record<string, number> = {}
  const countsByProgram: Record<string, number> = {}
  for (const e of filtered) {
    countsByStatus[e.status] = (countsByStatus[e.status] || 0) + 1
    const programLabel = e.programs?.name || "Unassigned"
    countsByProgram[programLabel] = (countsByProgram[programLabel] || 0) + 1
  }

  // Sort (server side when possible, otherwise client)
  let sorted = filtered
  if (sortBy === "revenue") {
    sorted = [...filtered].sort((a, b) => (b.revenue_cents ?? 0) - (a.revenue_cents ?? 0))
  } else if (sortBy === "tickets_sold") {
    sorted = [...filtered].sort((a, b) => (b.tickets_sold ?? 0) - (a.tickets_sold ?? 0))
  } else if (sortBy === "created_at") {
    sorted = [...filtered].sort(
      (a, b) => new Date(b.created_at ?? b.starts_at).getTime() - new Date(a.created_at ?? a.starts_at).getTime(),
    )
  } // default sort is by starts_at already applied

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const start = (page - 1) * perPage
  const paged = sorted.slice(start, start + perPage)

  return {
    data: paged,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      counts_by_status: countsByStatus,
      counts_by_program: countsByProgram,
      total_revenue_cents: totals.revenueCents,
      total_tickets_sold: totals.ticketsSold,
    },
  }
}

async function handleEventsCreate(orgId: string, body: any, client: any) {
  const payload = { ...body, org_id: orgId }
  const { data, error } = await client.from("ticketed_events").insert(payload).select().single()
  if (error) throw error
  return data
}

async function handleEventsUpdate(orgId: string, id: string, body: any, client: any) {
  const { data: currentEvent, error: fetchError } = await client
    .from("ticketed_events")
    .select("id, status, starts_at, org_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .single()
  
  if (fetchError) throw fetchError
  if (!currentEvent) throw new Error("Event not found")

  if (currentEvent.status === "completed") {
    throw new Error("Cannot update event: event is completed")
  }

  const now = new Date()
  const eventDate = new Date(currentEvent.starts_at)
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  const daysUntilEvent = hoursUntilEvent / 24

  const isMajorUpdate = !!(body.starts_at || body.venue_name || body.price_cents !== undefined || body.capacity_total !== undefined)

  if (isMajorUpdate) {
    if (hoursUntilEvent < 48) {
      throw new Error("Cannot make major changes: less than 48 hours until event")
    }

    const { data: orders, error: ordersError } = await client
      .from("ticket_orders")
      .select("ticket_order_items(quantity)")
      .eq("ticketed_event_id", id)
      .in("status", ["paid", "pending_payment"])

    if (ordersError) throw ordersError

    let ticketCount = 0
    for (const order of orders ?? []) {
      const items = (order.ticket_order_items ?? []) as any[]
      const qty = items.reduce((sum: number, item: any) => sum + (item?.quantity ?? 0), 0)
      ticketCount += qty
    }

    if (ticketCount > 0) {
      if (body.price_cents !== undefined) {
        throw new Error("Cannot increase price after tickets have been sold")
      }

      if (body.capacity_total !== undefined) {
        const { data: ticketTypes } = await client
          .from("ticket_types")
          .select("capacity_total")
          .eq("ticketed_event_id", id)
          .limit(1)

        const currentCapacity = ticketTypes?.[0]?.capacity_total ?? null
        if (currentCapacity !== null && body.capacity_total < ticketCount) {
          throw new Error("Cannot decrease capacity below tickets already sold")
        }
      }

      if (daysUntilEvent < 7) {
        throw new Error("Cannot make major changes: less than 7 days until event")
      }
    }
  }

  const payload = { ...body }
  const { data, error } = await client
    .from("ticketed_events")
    .update(payload)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single()
  if (error) throw error
  return data
}

async function handleEventsDelete(orgId: string, id: string, client: any) {
  const { data: eventData, error: fetchError } = await client
    .from("ticketed_events")
    .select("id, status, starts_at, org_id")
    .eq("id", id)
    .eq("org_id", orgId)
    .single()
  
  if (fetchError) throw fetchError
  if (!eventData) throw new Error("Event not found")

  const now = new Date()
  const eventDate = new Date(eventData.starts_at)
  const isDraft = eventData.status === "draft"
  const isPublished = eventData.status === "published"

  if (eventDate <= now) {
    throw new Error("Cannot delete event: event has already started")
  }

  if (isPublished) {
    throw new Error("Cannot delete event: event has been published")
  }

  const { data: orders, error: ordersError } = await client
    .from("ticket_orders")
    .select("ticket_order_items(quantity)")
    .eq("ticketed_event_id", id)
    .in("status", ["paid", "pending_payment"])

  if (ordersError) throw ordersError

  let ticketCount = 0
  for (const order of orders ?? []) {
    const items = (order.ticket_order_items ?? []) as any[]
    const qty = items.reduce((sum: number, item: any) => sum + (item?.quantity ?? 0), 0)
    ticketCount += qty
  }

  if (ticketCount > 0) {
    throw new Error("Cannot delete event: tickets have been sold")
  }

  const { error } = await client.from("ticketed_events").delete().eq("id", id).eq("org_id", orgId)
  if (error) throw error
  return { deleted: true }
}

async function handleEventsDuplicate(orgId: string, id: string, client: any) {
  const { data: source, error } = await client
    .from("ticketed_events")
    .select("*, ticket_types(*)")
    .eq("id", id)
    .eq("org_id", orgId)
    .single()
  if (error) throw error
  if (!source) throw new Error("Source event not found")

  const copyTitle = `${source.title} (Copy)`
  const insertPayload: any = {
    org_id: orgId,
    team_id: source.team_id,
    event_type: source.event_type,
    title: copyTitle,
    description: source.description,
    starts_at: source.starts_at,
    ends_at: source.ends_at,
    timezone: source.timezone,
    venue_name: source.venue_name,
    venue_address_line1: source.venue_address_line1,
    venue_address_line2: source.venue_address_line2,
    venue_city: source.venue_city,
    venue_state: source.venue_state,
    venue_postal_code: source.venue_postal_code,
    venue_country: source.venue_country,
    venue_is_virtual: source.venue_is_virtual,
    venue_virtual_link: source.venue_virtual_link,
    sales_start_at: source.sales_start_at,
    sales_end_at: source.sales_end_at,
    cover_image_path: source.cover_image_path,
    status: "draft",
    program_id: source.program_id,
    season_id: source.season_id,
    venue_id: source.venue_id,
    opponent: source.opponent,
    is_home: source.is_home,
  }

  const { data: newEvent, error: createError } = await client
    .from("ticketed_events")
    .insert(insertPayload)
    .select()
    .single()
  if (createError) throw createError

  // Duplicate ticket types
  const ticketTypes = (source.ticket_types ?? []) as any[]
  if (ticketTypes.length > 0) {
    const inserts = ticketTypes.map((tt) => ({
      org_id: orgId,
      ticketed_event_id: newEvent.id,
      name: tt.name,
      description: tt.description,
      price_cents: tt.price_cents,
      currency: tt.currency,
      capacity_total: tt.capacity_total,
      capacity_remaining: tt.capacity_total,
      sales_start_at: tt.sales_start_at,
      sales_end_at: tt.sales_end_at,
      sort_order: tt.sort_order,
      is_active: tt.is_active,
    }))
    await client.from("ticket_types").insert(inserts)
  }

  return newEvent
}

async function handleEventsBulk(orgId: string, body: any, client: any) {
  const ids: string[] = body?.event_ids ?? []
  const action: string = body?.action
  if (!ids.length || !action) throw new Error("event_ids and action are required")

  if (action === "delete") {
    for (const id of ids) {
      await handleEventsDelete(orgId, id, client)
    }
    return { deleted: ids.length }
  }

  if (action === "move") {
    const updates: any = {}
    if (body?.program_id) updates.program_id = body.program_id
    if (body?.season_id) updates.season_id = body.season_id
    const { error } = await client.from("ticketed_events").update(updates).in("id", ids).eq("org_id", orgId)
    if (error) throw error
    return { moved: ids.length }
  }

  if (action === "update") {
    const updates: any = body?.updates ?? {}
    for (const id of ids) {
      await handleEventsUpdate(orgId, id, updates, client)
    }
    return { updated: ids.length }
  }

  if (action === "cancel") {
    for (const id of ids) {
      const { data: eventData, error: fetchError } = await client
        .from("ticketed_events")
        .select("id, status, starts_at, org_id, event_type")
        .eq("id", id)
        .eq("org_id", orgId)
        .single()
      
      if (fetchError) throw fetchError
      if (!eventData) throw new Error(`Event ${id} not found`)

      const now = new Date()
      const eventDate = new Date(eventData.starts_at)
      const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (eventDate <= now) {
        throw new Error(`Cannot cancel event ${id}: event has already started`)
      }

      if (eventData.status === "cancelled") {
        throw new Error(`Cannot cancel event ${id}: event is already cancelled`)
      }

      if (eventData.status === "completed") {
        throw new Error(`Cannot cancel event ${id}: event is already completed`)
      }

      if (eventData.event_type === "championship" || eventData.event_type === "playoff") {
        throw new Error(`Cannot cancel event ${id}: championship/playoff games cannot be cancelled`)
      }

      const { error: updateError } = await client
        .from("ticketed_events")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("org_id", orgId)
      
      if (updateError) throw updateError
    }
    return { cancelled: ids.length }
  }

  if (action === "duplicate") {
    const createdIds: string[] = []
    for (const id of ids) {
      const dup = await handleEventsDuplicate(orgId, id, client)
      createdIds.push(dup.id)
    }
    return { duplicated: createdIds.length, new_ids: createdIds }
  }

  throw new Error("Unsupported bulk action")
}

async function handleGenericCrud(orgId: string, table: "programs" | "seasons" | "venues", req: Request, segments: string[], client: any) {
  const method = req.method
  const id = segments[0] && segments[0] !== "bulk" ? segments[0] : null

  if (method === "GET") {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("org_id", orgId)
      .order("name", { ascending: true })
    if (error) throw error
    return data
  }

  const body = method === "DELETE" ? null : await req.json()

  if (method === "POST") {
    const payload = { ...body, org_id: orgId }
    const { data, error } = await client.from(table).insert(payload).select().single()
    if (error) throw error
    return data
  }

  if (method === "PATCH" && id) {
    const { data, error } = await client.from(table).update(body).eq("id", id).eq("org_id", orgId).select().single()
    if (error) throw error
    return data
  }

  if (method === "DELETE" && id) {
    const { error } = await client.from(table).delete().eq("id", id).eq("org_id", orgId)
    if (error) throw error
    return { deleted: true }
  }

  throw new Error("Unsupported operation")
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const segments = normalizePath(req)
    // Allow both /api/orgs/:orgId/... and /orgs/:orgId/...
    const offset = segments[0] === "api" ? 1 : 0
    if (segments[offset] !== "orgs") {
      return json({ error: "Invalid path" }, 404)
    }

    const orgId = segments[offset + 1]
    const resource = segments[offset + 2]
    const resourceTail = segments.slice(offset + 3)

    const { client, user } = await getSupabaseClients(req)
    if (!user) {
      return json({ error: "Unauthorized" }, 401)
    }

    if (resource === "events") {
      const targetId = resourceTail[0]
      const subaction = resourceTail[1]

      if (req.method === "GET" && !targetId) {
        const result = await handleEventsList(orgId, new URL(req.url), client)
        return json(result)
      }

      if (req.method === "POST" && targetId === "bulk") {
        const body = await req.json()
        const result = await handleEventsBulk(orgId, body, client)
        return json(result)
      }

      if (req.method === "POST" && targetId && subaction === "duplicate") {
        const result = await handleEventsDuplicate(orgId, targetId, client)
        return json(result)
      }

      if (req.method === "POST" && !targetId) {
        const body = await req.json()
        const result = await handleEventsCreate(orgId, body, client)
        return json(result, 201)
      }

      if (req.method === "PATCH" && targetId) {
        const body = await req.json()
        const result = await handleEventsUpdate(orgId, targetId, body, client)
        return json(result)
      }

      if (req.method === "DELETE" && targetId) {
        await handleEventsDelete(orgId, targetId, client)
        return new Response('{"deleted":true}', {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    if (resource === "programs" || resource === "seasons" || resource === "venues") {
      const result = await handleGenericCrud(orgId, resource as any, req, resourceTail, client)
      return json(result, req.method === "POST" ? 201 : 200)
    }

    return json({ error: "Not found" }, 404)
  } catch (error) {
    console.error("[ticketing-events-api]", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json({ error: message }, 500)
  }
})
