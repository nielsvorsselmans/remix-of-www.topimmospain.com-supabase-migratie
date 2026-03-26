-- Add RLS policies for partners to view snagging data

-- Snagging inspections: Partners can view inspections for their sales
CREATE POLICY "Partners can view snagging inspections" 
ON public.snagging_inspections 
FOR SELECT 
USING (
  sale_id IN (
    SELECT sp.sale_id FROM public.sale_partners sp
    WHERE sp.partner_id IN (
      SELECT p.id FROM public.partners p
      WHERE p.user_id = auth.uid()
    )
  )
);

-- Snagging items: Partners can view snagging items via inspection access
CREATE POLICY "Partners can view snagging items" 
ON public.snagging_items 
FOR SELECT 
USING (
  inspection_id IN (
    SELECT si.id FROM public.snagging_inspections si
    WHERE si.sale_id IN (
      SELECT sp.sale_id FROM public.sale_partners sp
      WHERE sp.partner_id IN (
        SELECT p.id FROM public.partners p
        WHERE p.user_id = auth.uid()
      )
    )
  )
);