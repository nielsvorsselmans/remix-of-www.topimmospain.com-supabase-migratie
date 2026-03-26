-- Create roi_scenarios table for storing calculator scenarios
CREATE TABLE public.roi_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  
  -- Input parameters
  purchase_price NUMERIC NOT NULL,
  property_type TEXT NOT NULL,
  rental_property_type TEXT,
  region TEXT,
  
  -- Costs
  itp_rate NUMERIC,
  ibi_yearly NUMERIC,
  insurance_yearly NUMERIC,
  community_fees_monthly NUMERIC,
  utilities_monthly NUMERIC,
  maintenance_yearly NUMERIC,
  garbage_tax_yearly NUMERIC,
  
  -- Rental
  low_season_rate NUMERIC,
  high_season_rate NUMERIC,
  occupancy_rate NUMERIC,
  owner_use_days INTEGER,
  management_fee_rate NUMERIC,
  
  -- Financing
  use_mortgage BOOLEAN DEFAULT false,
  mortgage_amount NUMERIC,
  mortgage_rate NUMERIC,
  mortgage_term INTEGER,
  
  -- Appreciation & horizon
  appreciation_rate NUMERIC,
  investment_years INTEGER,
  inflation_rate NUMERIC,
  
  -- Calculated results for quick display
  total_roi NUMERIC,
  annual_roi NUMERIC,
  return_on_equity NUMERIC,
  annual_roe NUMERIC,
  net_rental_yield NUMERIC,
  total_return NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roi_scenarios ENABLE ROW LEVEL SECURITY;

-- Users can only view their own scenarios
CREATE POLICY "Users can view own scenarios"
ON public.roi_scenarios
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own scenarios
CREATE POLICY "Users can insert own scenarios"
ON public.roi_scenarios
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scenarios
CREATE POLICY "Users can update own scenarios"
ON public.roi_scenarios
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own scenarios
CREATE POLICY "Users can delete own scenarios"
ON public.roi_scenarios
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_roi_scenarios_user_id ON public.roi_scenarios(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_roi_scenarios_updated_at
BEFORE UPDATE ON public.roi_scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();