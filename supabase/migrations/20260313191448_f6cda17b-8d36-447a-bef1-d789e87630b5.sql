
-- Create security definer function to check advocaat-lead relationship without RLS recursion
CREATE OR REPLACE FUNCTION public.is_advocaat_for_lead(p_user_id uuid, p_crm_lead_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sale_customers sc
    JOIN sale_advocaten sa ON sa.sale_id = sc.sale_id
    JOIN advocaten a ON a.id = sa.advocaat_id
    WHERE sc.crm_lead_id = p_crm_lead_id
      AND a.user_id = p_user_id
  );
$$;

-- Restrict access
REVOKE EXECUTE ON FUNCTION public.is_advocaat_for_lead FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_advocaat_for_lead TO authenticated;

-- Drop the recursive policy and recreate with security definer function
DROP POLICY IF EXISTS "Advocaat can view leads for assigned sales" ON public.crm_leads;

CREATE POLICY "Advocaat can view leads for assigned sales"
ON public.crm_leads
FOR SELECT TO authenticated
USING (is_advocaat_for_lead(auth.uid(), id));
