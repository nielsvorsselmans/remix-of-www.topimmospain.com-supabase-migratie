-- Create property_price_history table to track price changes
CREATE TABLE public.property_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  price_difference NUMERIC GENERATED ALWAYS AS (new_price - COALESCE(old_price, 0)) STORED,
  change_type TEXT NOT NULL DEFAULT 'update', -- 'initial', 'increase', 'decrease'
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_source TEXT DEFAULT 'redsp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_property_price_history_property_id ON public.property_price_history(property_id);
CREATE INDEX idx_property_price_history_changed_at ON public.property_price_history(changed_at DESC);
CREATE INDEX idx_property_price_history_change_type ON public.property_price_history(change_type);

-- Enable RLS
ALTER TABLE public.property_price_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage price history
CREATE POLICY "Admins can manage price history"
ON public.property_price_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage price history (for sync)
CREATE POLICY "Service role can manage price history"
ON public.property_price_history
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Add previous_price column to properties table for quick access
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS previous_price NUMERIC;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS price_changed_at TIMESTAMPTZ;