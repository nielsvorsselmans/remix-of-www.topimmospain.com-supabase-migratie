-- Add RLS policies for partners to manage customer_project_selections for their referred leads
CREATE POLICY "Partners can view selections for their leads"
ON public.customer_project_selections
FOR SELECT
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can insert selections for their leads"
ON public.customer_project_selections
FOR INSERT
WITH CHECK (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can update selections for their leads"
ON public.customer_project_selections
FOR UPDATE
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can delete selections for their leads"
ON public.customer_project_selections
FOR DELETE
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);

-- Add RLS policies for partners to manage customer_viewing_trips for their referred leads
CREATE POLICY "Partners can view trips for their leads"
ON public.customer_viewing_trips
FOR SELECT
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can insert trips for their leads"
ON public.customer_viewing_trips
FOR INSERT
WITH CHECK (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can update trips for their leads"
ON public.customer_viewing_trips
FOR UPDATE
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can delete trips for their leads"
ON public.customer_viewing_trips
FOR DELETE
USING (
  crm_lead_id IN (
    SELECT id FROM public.crm_leads 
    WHERE referred_by_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  )
);