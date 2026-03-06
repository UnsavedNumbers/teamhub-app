import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const compiledTemplatePath = path.join(process.cwd(), "emails", "compiled", "ticket-receipt.html")
const webhookPath = path.join(process.cwd(), "supabase", "functions", "stripe-webhook", "index.ts")
const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260212000100_add_email_receipts_table.sql")

function renderTemplate(template: string, variables: Record<string, string>) {
  let html = template
  for (const [key, value] of Object.entries(variables)) {
    html = html.replaceAll(`{{${key}}}`, value)
  }
  return html
}

describe("ticket receipt email", () => {
  it("includes totals and line item placeholders", () => {
    const template = fs.readFileSync(compiledTemplatePath, "utf8")
    expect(template).toContain("{{LINE_ITEMS_ROWS}}")
    expect(template).toContain("{{TOTAL_PAID}}")
    expect(template).toContain("{{BUYER_EMAIL}}")
  })

  it("renders with missing optional values", () => {
    const template = fs.readFileSync(compiledTemplatePath, "utf8")
    const html = renderTemplate(template, {
      RECEIPT_ID: "rcpt_123",
      EVENT_NAME: "Test Event",
      ORGANIZATION_NAME: "Test Org",
      EVENT_DATE: "Jan 01, 2026",
      EVENT_TIME: "7:00 PM",
      VENUE_ADDRESS: "",
      LINE_ITEMS_ROWS: "",
      FEES_TAX_ROWS: "",
      TOTAL_PAID: "$0.00",
      PURCHASE_DATE_TIME: "Jan 01, 2026 7:00 PM",
      BUYER_EMAIL: "buyer@example.com",
      ORDER_ID: "ord_123",
      STRIPE_REFERENCE: "",
      TICKET_CODES_ROWS: "",
      PRIMARY_QR_BLOCK: "",
      MY_TICKETS_URL: "/portal/account/tickets",
    })
    expect(html).toContain("Ticket Receipt")
    expect(html).toContain("buyer@example.com")
  })

  it("webhook routes successful ticket purchases to receipt sender", () => {
    const webhookCode = fs.readFileSync(webhookPath, "utf8")
    expect(webhookCode).toContain("functions/v1/tickets-send-receipt")
    expect(webhookCode).toContain("checkout.session.completed")
  })

  it("uses order-level idempotency for one receipt per order", () => {
    const migrationSql = fs.readFileSync(migrationPath, "utf8")
    expect(migrationSql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS email_receipts_order_id_key")
    expect(migrationSql).toContain("ON public.email_receipts(order_id)")
  })
})
