YouthSports.team - TECHNICAL README
=========================

Overview
--------
YouthSports.team is a web-based, mobile-responsive SaaS for youth sports organizations,
parents, coaches, and administrators. It supports schools, clubs, and academies
with multiple sports, programs, teams, and seasons.

Core Stack
----------
Frontend:
- React + TypeScript
- Vite
- Tailwind or Chakra UI
- Hosted on Vercel

Backend:
- Supabase
  - Postgres database
  - Row Level Security (RLS)
  - Supabase Auth
  - Supabase Storage
  - Realtime subscriptions
  - Edge Functions

Payments:
- Stripe (one-time fees, future subscriptions)

Email:
- Resend (SMTP for auth + system emails)

Domain:
- Registered with GreenGeeks
- DNS points to Vercel

Architecture Model
------------------
organizations
  -> sports
    -> programs
      -> teams
        -> seasons

Parents interact only with teams and seasons.
Sports and programs are abstracted away in the UI.

Environments
------------
- Production: app.yourdomain.com
- Preview: Vercel preview URLs
- Local: Vite dev server + Supabase local or remote project

Key Responsibilities
--------------------
- RLS enforces all data access rules
- No server-side state
- All writes validated against user role
- No AWS services used

Deployment
----------
- Frontend auto-deploys via Vercel on git push
- Database migrations via Supabase SQL editor or CLI
- Edge Functions deployed via Supabase CLI

Security Notes
--------------
- Parents can only access their family data
- Coaches cannot see payment amounts
- Admins are scoped per organization
- All files stored privately with signed URLs

This file is the source of truth for infrastructure decisions.
