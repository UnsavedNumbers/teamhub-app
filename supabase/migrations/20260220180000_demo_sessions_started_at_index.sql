-- Index for Demo Insights date-range queries (order by started_at, filter by started_at >= cutoff)
create index if not exists idx_demo_sessions_started_at
  on public.demo_sessions (started_at desc);
