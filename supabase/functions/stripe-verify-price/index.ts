// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import Stripe from "https://esm.sh/stripe@12.18.0?dts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")

if (!supabaseUrl || !supabaseServiceRoleKey || !stripeSecretKey) {
  throw new Error("Missing required environment configuration")
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" })
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    // Parse request body
    const { price_id } = await req.json()

    if (!price_id || typeof price_id !== "string") {
      return new Response(JSON.stringify({ error: "Invalid price_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Validate price_id format
    if (!price_id.startsWith("price_")) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Invalid Stripe Price ID format. Must start with 'price_'",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    // Fetch price from Stripe
    try {
      const price = await stripe.prices.retrieve(price_id, {
        expand: ["product"],
      })

      const product = price.product as Stripe.Product

      // Extract interval from price
      let interval: string | null = null
      if (price.recurring) {
        interval = price.recurring.interval // 'year', 'month', etc.
      }

      // Return verification result
      return new Response(
        JSON.stringify({
          valid: true,
          product_name: product.name || null,
          amount_cents: price.unit_amount,
          interval: interval,
          currency: price.currency,
          active: price.active && (product.deleted === null || product.deleted === false),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    } catch (stripeError: any) {
      // Stripe API error
      return new Response(
        JSON.stringify({
          valid: false,
          error: stripeError.message || "Failed to verify Stripe Price ID",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    }
  } catch (err: any) {
    console.error("Error verifying Stripe price:", err)
    return new Response(
      JSON.stringify({
        valid: false,
        error: err.message || "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  }
})
