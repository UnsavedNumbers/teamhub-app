---
name: Yearly Organization License Payment Flow
overview: Implement complete yearly organization license payment flow using Stripe Subscriptions with plan tiers (Starter/Standard/Pro), trial support, webhook handling via Supabase Edge Functions, license state management with org_licenses as source of truth, access gating throughout the app, and UI components for billing management. Includes grace period for past_due status and parent read-only access preservation.
todos:
  - id: db_schema
    content: Create database migration with organizations summary fields, org_licenses canonical table, billing_events audit table, and helper functions
    status: pending
  - id: checkout_edge_function
    content: Create Edge Function billing-create-checkout-session for secure checkout session creation
    status: pending
  - id: webhook_function
    content: Create Edge Function stripe-webhook with idempotency and comprehensive event handling
    status: pending
  - id: billing_page
    content: Create OrganizationBilling page with plan selection, status display, and billing management
    status: pending
  - id: checkout_pages
    content: Create CheckoutSuccess and CheckoutCancel pages for Stripe redirects
    status: pending
  - id: license_utils
    content: Create license utility functions, useLicense hook, and license status helpers
    status: pending
  - id: rls_policies
    content: Create RLS policies and helper functions for license-based access gating
    status: pending
  - id: access_gating
    content: Update ProtectedRoute and create LicenseGate component for frontend gating
    status: pending
  - id: ui_components
    content: Create license status badges, warning banners, and billing status components
    status: pending
  - id: settings_integration
    content: Add license section to OrganizationSettings page with quick status
    status: pending
  - id: admin_layout_banner
    content: Add global license warning banner to AdminLayout for org admins
    status: pending
  - id: customer_portal
    content: Create optional Edge Function for Stripe Customer Portal session creation
    status: pending
---

# Yearly Organization License Payment Flow Implementation

## Overview

Implement end-to-end yearly license payment flow for organizations using Stripe Subscriptions with plan tiers (Starter/Standard/Pro). Organizations subscribe annually, with license state managed in `org_licenses` table (canonical) and summary fields in `organizations` table. Includes trial period, grace period for past_due, and parent read-only access preservation.

## Architecture

```
┌─────────────────┐
│  Frontend UI    │
│  (React)        │
└────────┬────────┘
         │
         ├─► Call Edge Function
         │   billing-create-checkout-session
         │
         ├─► Redirect to Stripe Checkout
         │
         └─► Return from Stripe
            │
            ▼
┌─────────────────┐
│  Supabase DB    │
│  - organizations│ (summary fields)
│  - org_licenses │ (canonical)
│  - billing_events│ (audit)
└────────┬────────┘
         │
         │ Webhook Events
         │
         ▼
┌─────────────────┐
│  Edge Function  │
│  stripe-webhook │
└─────────────────┘
```

## Database Schema

### File: `supabase/migrations/023_organization_licenses.sql`

**Enums:**

- `license_status`: `trial`, `active`, `past_due`, `canceled`, `expired`
- `license_plan`: `starter`, `standard`, `pro`

**Table: organizations (add summary fields)**

```sql
license_status              license_status DEFAULT 'trial'
license_plan                license_plan NULLABLE
license_current_period_end  TIMESTAMP NULLABLE
stripe_customer_id          TEXT NULLABLE
stripe_subscription_id       TEXT NULLABLE
```

**Table: org_licenses (canonical license record)**

```sql
id                          UUID PRIMARY KEY
organization_id             UUID REFERENCES organizations(id) UNIQUE
status                      license_status DEFAULT 'trial'
plan                        license_plan NULLABLE
current_period_start        TIMESTAMP NULLABLE
current_period_end          TIMESTAMP NULLABLE
cancel_at_period_end        BOOLEAN DEFAULT false
trial_ends_at               TIMESTAMP NULLABLE
grace_ends_at               TIMESTAMP NULLABLE
stripe_customer_id          TEXT NULLABLE
stripe_subscription_id      TEXT NULLABLE
stripe_price_id             TEXT NULLABLE
stripe_latest_invoice_id    TEXT NULLABLE
created_at                  TIMESTAMP DEFAULT now()
updated_at                  TIMESTAMP DEFAULT now()
```

**Table: billing_events (idempotency & audit)**

```sql
id                          UUID PRIMARY KEY
organization_id             UUID REFERENCES organizations(id)
event_type                  TEXT
stripe_event_id             TEXT UNIQUE
stripe_object_id            TEXT NULLABLE
payload                     JSONB
processed_at                TIMESTAMP NULLABLE
created_at                  TIMESTAMP DEFAULT now()
```

**Helper Functions:**

- `is_org_license_active(org_id UUID)` - returns boolean for admin write access
- `is_org_license_readonly_allowed(org_id UUID)` - returns boolean for parent read access
- `sync_org_license_summary(org_id UUID)` - syncs org_licenses to organizations summary fields

**Indexes:**

- `idx_org_licenses_organization_id` on org_licenses(organization_id)
- `idx_org_licenses_stripe_subscription_id` on org_licenses(stripe_subscription_id)
- `idx_billing_events_stripe_event_id` on billing_events(stripe_event_id)
- `idx_billing_events_organization_id` on billing_events(organization_id)

## Edge Functions

### File: `supabase/functions/billing-create-checkout-session/index.ts`

**Purpose**: Securely create Stripe Checkout Session for subscription

**Input:**

```typescript
{
  organization_id: string
  requested_plan: 'starter' | 'standard' | 'pro'
  success_url: string
  cancel_url: string
}
```

**Logic:**

1. Verify user is org_admin of the organization (via RLS/auth)
2. Load or create Stripe customer:

                                                - If `stripe_customer_id` exists, reuse
                                                - Else create Stripe customer, store in org_licenses and organizations

3. Map requested_plan to Stripe price_id from env vars:

                                                - `STRIPE_PRICE_STARTER_YEAR`
                                                - `STRIPE_PRICE_STANDARD_YEAR`
                                                - `STRIPE_PRICE_PRO_YEAR`

4. Create Stripe Checkout Session:

                                                - `mode: 'subscription'`
                                                - `line_items: [{ price: price_id, quantity: 1 }]`
                                                - `customer: stripe_customer_id`
                                                - `client_reference_id: organization_id`
                                                - `metadata: { organization_id, requested_plan, environment }`
                                                - `success_url`, `cancel_url`

5. Return `{ checkout_session_url: string }` or `{ session_id: string }`

**Security:**

- Never trust frontend for plan validation
- Always verify user permissions server-side
- Use service role key for database writes

### File: `supabase/functions/stripe-webhook/index.ts`

**Purpose**: Handle Stripe webhook events with idempotency

**Logic:**

1. Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
2. Parse event from Stripe SDK
3. Check idempotency:

                                                - Query `billing_events` for `stripe_event_id`
                                                - If exists, return 200 (already processed)

4. Insert `billing_events` record (for audit and idempotency)
5. Process event based on type:

**Event: checkout.session.completed**

- Verify `mode === 'subscription'`
- Get `organization_id` from `client_reference_id` or `metadata.organization_id`
- Fetch subscription from Stripe using `session.subscription`
- Upsert `org_licenses`:
                                - `status = 'active'` (if subscription.status is 'active' or 'trialing')
                                - `plan = map_from_price_id(subscription.items.data[0].price.id)`
                                - `current_period_start/end` from subscription
                                - `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`
- Call `sync_org_license_summary(organization_id)`

**Event: invoice.paid**

- Fetch subscription from `invoice.subscription`
- Find organization by `stripe_subscription_id` in `org_licenses`
- Update `org_licenses`:
                                - `status = 'active'`
                                - `current_period_end = invoice.period_end`
                                - Clear `past_due` flags
- Call `sync_org_license_summary(organization_id)`

**Event: invoice.payment_failed**

- Find organization by subscription
- Update `org_licenses`:
                                - `status = 'past_due'`
                                - `grace_ends_at = now() + 7 days` (or configurable)
                                - Keep `current_period_end` unchanged
- Call `sync_org_license_summary(organization_id)`

**Event: customer.subscription.updated**

- Find organization by `stripe_subscription_id`
- Update plan if price changed
- Update `cancel_at_period_end`
- Update `current_period_end`
- If `subscription.status` in `['past_due', 'unpaid']`, set `status = 'past_due'`
- Call `sync_org_license_summary(organization_id)`

**Event: customer.subscription.deleted**

- Find organization by `stripe_subscription_id`
- Set `status = 'canceled'` if ended early, `'expired'` if ended naturally
- Do NOT delete records
- Call `sync_org_license_summary(organization_id)`

**Error Handling:**

- Always return 200 to Stripe (even on errors) to prevent retries
- Log errors for debugging
- Store failed events in `billing_events` with error details

### File: `supabase/functions/billing-customer-portal/index.ts` (Optional)

**Purpose**: Create Stripe Customer Portal session for self-service billing management

**Input:**

```typescript
{
  organization_id: string
  return_url: string
}
```

**Logic:**

1. Verify user is org_admin
2. Get `stripe_customer_id` from organization
3. Create Customer Portal session
4. Return `{ portal_url: string }`

## Frontend Implementation

### File: `src/pages/admin/OrganizationBilling.tsx` (new)

**Billing Overview Page:**

- Current plan display (Starter/Standard/Pro)
- License status badge (trial/active/past_due/canceled/expired)
- Renewal date (`current_period_end`)
- Trial end date (if in trial)
- Grace period end date (if past_due)
- Actions:
                                - "Upgrade/Downgrade Plan" button → Plan Selection
                                - "Manage Billing" button → Stripe Customer Portal (if implemented)
- Billing history (from `billing_events` or Stripe invoices)

**Plan Selection:**

- Display three plan cards (Starter/Standard/Pro)
- Show annual pricing for each
- Feature comparison table
- "Continue to Checkout" CTA per plan
- On click: call Edge Function to create checkout session, redirect to Stripe

### File: `src/pages/admin/PlanSelection.tsx` (new)

Dedicated plan selection page (or section within Billing page):

- Plan cards with pricing
- Feature highlights per plan
- Current plan indicator
- Upgrade/downgrade CTAs

### File: `src/pages/admin/CheckoutSuccess.tsx` (new)

Success page after Stripe redirect:

- Success message
- License activation confirmation
- Plan details
- Auto-redirect to billing page after 3 seconds

### File: `src/pages/admin/CheckoutCancel.tsx` (new)

Cancel page if user cancels checkout:

- Cancellation message
- Option to retry payment
- Link back to billing page

### File: `src/components/admin/LicenseStatusBadge.tsx` (new)

Reusable status badge:

- Color-coded: green (active), yellow (trial/past_due), red (expired/canceled)
- Status text
- Tooltip with details (renewal date, days remaining)

### File: `src/components/admin/LicenseWarningBanner.tsx` (new)

Global warning banner for org admins:

- Shows in AdminLayout when license needs attention
- Conditions:
                                - Trial: "Trial ends on [date]"
                                - Past due: "Payment failed. Update billing to continue."
                                - Canceled: "Subscription cancels on [date]"
- CTA: "Go to Billing"

### File: `src/components/LicenseGate.tsx` (new)

Reusable gating component:

- Wraps admin actions that require active license
- Checks `is_org_license_active()`
- Shows modal/page if not active:
                                - "Your organization license is inactive. Update billing to continue."
                                - CTA: "Go to Billing"

### File: `src/hooks/useLicense.ts` (new)

Custom hook for license state:

```typescript
const { 
  licenseStatus, 
  licensePlan, 
  isActive, 
  isReadOnlyAllowed,
  daysUntilExpiration,
  daysInGracePeriod 
} = useLicense(orgId?)
```

Fetches from `organizations` summary fields, refreshes on mount and billing page visits.

### File: `src/utils/licenseUtils.ts` (new)

Utility functions:

- `getLicenseStatus(org: Organization)` - returns status enum
- `isLicenseActive(org: Organization)` - boolean for admin writes
- `isLicenseReadOnlyAllowed(org: Organization)` - boolean for parent reads
- `getDaysUntilExpiration(org: Organization)` - countdown
- `getDaysInGracePeriod(org: Organization)` - grace period remaining
- `mapPlanToPriceId(plan: LicensePlan)` - maps plan to env var name

### File: `src/pages/admin/OrganizationSettings.tsx` (update)

Add "License & Billing" section:

- Quick status indicator (badge)
- Current plan
- Renewal date
- Link to full billing page
- Payment required banner if expired/inactive

### File: `src/layouts/AdminLayout.tsx` (update)

Add global license warning banner:

- Check license status on mount
- Display banner if trial ending soon, past_due, or canceled
- Only show for org admins
- Position at top of admin panel

### File: `src/components/ProtectedRoute.tsx` (update)

Add license check:

- Before rendering, check if organization has active license
- If expired/inactive (beyond grace period):
                                - Redirect to billing page with message
- If in grace period (past_due):
                                - Show warning but allow access
- Platform admins bypass all license checks
- Parents: allow read-only access even if license inactive (preserve mid-season access)

### File: `src/api/billing.ts` (new)

API functions for Edge Function calls:

- `createCheckoutSession(orgId, plan, successUrl, cancelUrl)` - calls Edge Function
- `createCustomerPortalSession(orgId, returnUrl)` - calls Edge Function (optional)
- `getBillingHistory(orgId)` - fetches from billing_events or Stripe

## RLS Policies

### File: `supabase/migrations/023_organization_licenses.sql`

**Update existing functions:**

- `user_has_org_access()` - add license check (unless platform admin)
- `user_has_org_role()` - add license check for write operations

**New RLS policies:**

For `fees` table (example):

```sql
CREATE POLICY "org_admins_can_create_fees_if_license_active"
ON fees FOR INSERT
TO authenticated
WITH CHECK (
  user_has_org_role(auth.uid(), organization_id, 'org_admin')
  AND is_org_license_active(organization_id)
);
```

For `seasons` table:

```sql
CREATE POLICY "org_admins_can_create_seasons_if_license_active"
ON seasons FOR INSERT
TO authenticated
WITH CHECK (
  user_has_org_role(auth.uid(), organization_id, 'org_admin')
  AND is_org_license_active(organization_id)
);
```

**Read policies:**

- Parents can read their own data even if license inactive (read-only access)
- Use `is_org_license_readonly_allowed()` for read operations

## Environment Variables

### File: `.env.example` (update)

```env
# Stripe (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe (Edge Functions - server-side only)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (yearly subscriptions)
STRIPE_PRICE_STARTER_YEAR=price_...
STRIPE_PRICE_STANDARD_YEAR=price_...
STRIPE_PRICE_PRO_YEAR=price_...
```

### File: `supabase/functions/billing-create-checkout-session/.env.example`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_STARTER_YEAR=price_...
STRIPE_PRICE_STANDARD_YEAR=price_...
STRIPE_PRICE_PRO_YEAR=price_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### File: `supabase/functions/stripe-webhook/.env.example`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Key Implementation Details

### License Status Logic

```typescript
// License is active for admin writes if:
// 1. status === 'active' AND current_period_end > now()
// 2. status === 'trial' AND trial_ends_at > now()
// 3. Platform admin (always active)

// License allows read-only access if:
// 1. is_org_license_active() OR
// 2. status === 'past_due' AND grace_ends_at > now() OR
// 3. status === 'canceled' AND current_period_end > now()

// Status transitions:
// trial → active (on subscription creation)
// active → past_due (on payment failure)
// past_due → active (on payment success)
// active → canceled (on subscription cancellation)
// canceled → expired (after current_period_end)
```

### Checkout Session Creation Flow

```
1. User selects plan on frontend
2. Frontend calls Edge Function: billing-create-checkout-session
3. Edge Function:
   - Verifies user permissions
   - Gets/creates Stripe customer
   - Maps plan to price_id
   - Creates checkout session
   - Returns session URL
4. Frontend redirects to Stripe Checkout
5. User completes payment
6. Stripe redirects to success_url
7. Webhook processes checkout.session.completed
8. License activates automatically
```

### Webhook Idempotency

```typescript
// Always check billing_events first:
const existing = await supabase
  .from('billing_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single()

if (existing) {
  return new Response(JSON.stringify({ received: true }), { status: 200 })
}

// Insert event record first (for idempotency)
await supabase.from('billing_events').insert({
  organization_id: orgId,
  event_type: event.type,
  stripe_event_id: event.id,
  stripe_object_id: event.data.object.id,
  payload: event
})

// Then process event
// ...
```

### Access Gating Logic

**Frontend (ProtectedRoute):**

```typescript
// For org admins:
if (!isPlatformAdmin && !isLicenseActive(currentOrg)) {
  if (isPastGracePeriod(currentOrg)) {
    redirect('/admin/organization/billing?message=license_expired')
  } else {
    showWarningBanner() // grace period
  }
}

// For parents:
// Always allow read access (preserve mid-season access)
// Gate only on write operations
```

**Backend (RLS):**

```sql
-- Write operations require active license
CREATE POLICY "require_active_license_for_writes"
ON [table] FOR INSERT/UPDATE/DELETE
WITH CHECK (
  is_platform_admin(auth.uid()) OR
  is_org_license_active(organization_id)
)

-- Read operations allow read-only access
CREATE POLICY "allow_readonly_on_inactive_license"
ON [table] FOR SELECT
USING (
  is_platform_admin(auth.uid()) OR
  is_org_license_readonly_allowed(organization_id) OR
  user_owns_record(auth.uid()) -- parents see their own data
)
```

## File Structure

```
supabase/
  migrations/
    023_organization_licenses.sql
  functions/
    billing-create-checkout-session/
      index.ts
      .env.example
    stripe-webhook/
      index.ts
      README.md
      .env.example
    billing-customer-portal/ (optional)
      index.ts
      .env.example

src/
  api/
    billing.ts
  components/
    admin/
      LicenseStatusBadge.tsx
      LicenseWarningBanner.tsx
    LicenseGate.tsx
  hooks/
    useLicense.ts
  pages/
    admin/
      OrganizationBilling.tsx (new)
      PlanSelection.tsx (new)
      OrganizationSettings.tsx (update)
      CheckoutSuccess.tsx (new)
      CheckoutCancel.tsx (new)
  utils/
    licenseUtils.ts
```

## Dependencies

Add to `package.json`:

- `@stripe/stripe-js` - Stripe client library (frontend)
- `stripe` - Stripe server SDK (Edge Functions)

## Configuration Steps

1. **Stripe Setup:**

                                                - Create products: Starter Annual, Standard Annual, Pro Annual
                                                - Create prices: recurring, interval=year
                                                - Get price IDs, add to environment variables
                                                - Enable Stripe Customer Portal (optional)

2. **Database:**

                                                - Run migration: `supabase migration up 023_organization_licenses`
                                                - Verify tables and functions created

3. **Edge Functions:**

                                                - Deploy: `supabase functions deploy billing-create-checkout-session`
                                                - Deploy: `supabase functions deploy stripe-webhook`
                                                - Set environment variables for each function

4. **Stripe Webhook:**

                                                - Get webhook endpoint URL: `https://[project].supabase.co/functions/v1/stripe-webhook`
                                                - Configure in Stripe Dashboard
                                                - Add webhook secret to Edge Function env
                                                - Test with Stripe CLI: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`

5. **Frontend:**

                                                - Add Stripe publishable key to `.env`
                                                - Test checkout flow end-to-end

## Testing Checklist

- [ ] Trial → Active: Create checkout, complete payment, verify license activates
- [ ] Payment Failed → Past Due: Simulate failed payment, verify past_due status
- [ ] Past Due → Active: Retry payment, verify reactivation
- [ ] Cancel at Period End: Cancel subscription, verify cancel_at_period_end flag
- [ ] Expired Gating: Let license expire, verify admin actions blocked
- [ ] Parent Read-Only: Verify parents can still read data when license inactive
- [ ] Webhook Replay: Send same webhook twice, verify idempotency
- [ ] Platform Admin Bypass: Verify platform admins bypass all license checks
- [ ] Plan Upgrade/Downgrade: Change plan, verify subscription updates
- [ ] Grace Period: Verify 7-day grace period allows access after expiration

## Success Criteria

- Organization can select plan and initiate checkout from billing page
- Checkout session created securely via Edge Function
- Payment completes and redirects back to app
- Webhook processes events with idempotency
- License activates automatically on successful payment
- License status syncs between org_licenses and organizations
- Admin write actions gated when license inactive (beyond grace)
- Parent read access preserved when license inactive
- Grace period allows 7 days of access after payment failure
- Platform admins bypass all license checks
- UI displays license status correctly throughout app
- Billing events audited in billing_events table