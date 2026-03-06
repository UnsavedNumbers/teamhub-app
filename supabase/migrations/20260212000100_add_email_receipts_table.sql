CREATE TABLE IF NOT EXISTS public.email_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ticket_orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  stripe_session_id text,
  buyer_email text NOT NULL,
  provider_message_id text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_receipts_order_id_key
  ON public.email_receipts(order_id);

CREATE INDEX IF NOT EXISTS idx_email_receipts_status_created_at
  ON public.email_receipts(status, created_at DESC);

DROP TRIGGER IF EXISTS update_email_receipts_updated_at ON public.email_receipts;
CREATE TRIGGER update_email_receipts_updated_at
  BEFORE UPDATE ON public.email_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.email_receipts ENABLE ROW LEVEL SECURITY;
