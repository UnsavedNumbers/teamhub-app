-- Ticketing System Cron Job
-- ==========================
-- Scheduled job to release expired ticket holds (only when pg_cron is available).

-- Schedule job if pg_cron is enabled (cron schema exists).
-- On Supabase Cloud with pg_cron enabled, the job runs every 5 minutes.
-- If pg_cron is not available, this migration still passes; release expired holds
-- manually or via another scheduler (e.g. Edge Function + cron trigger).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.schedule(
      'release-expired-ticket-holds',
      '*/5 * * * *',
      'SELECT release_expired_ticket_holds();'
    );
  END IF;
END
$$;
