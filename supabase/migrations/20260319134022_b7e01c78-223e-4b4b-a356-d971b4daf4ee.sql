
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  external_id TEXT,
  payload JSONB NOT NULL,
  result TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_logs_type_external ON public.webhook_logs(webhook_type, external_id);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
