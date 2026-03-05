-- API Manager gateway audit and idempotency tables

CREATE TABLE IF NOT EXISTS public.api_gateway_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  operation_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  org_id UUID,
  user_id UUID,
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  outcome TEXT NOT NULL CHECK (outcome IN ('ok', 'error')),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_gateway_audit_trace
  ON public.api_gateway_audit(trace_id);

CREATE INDEX IF NOT EXISTS idx_api_gateway_audit_operation_created
  ON public.api_gateway_audit(operation_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_gateway_audit_org_created
  ON public.api_gateway_audit(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.api_gateway_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_key TEXT NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  response_json JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(operation_key, org_id, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_gateway_idempotency_created
  ON public.api_gateway_idempotency(created_at DESC);

ALTER TABLE public.api_gateway_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_gateway_idempotency ENABLE ROW LEVEL SECURITY;
