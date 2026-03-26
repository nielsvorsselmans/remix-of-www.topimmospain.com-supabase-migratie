-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Customers view assigned cost_estimates" ON cost_estimates;
DROP POLICY IF EXISTS "Partners manage own assignments" ON cost_estimate_assignments;

-- Helper function to check if a cost estimate is assigned to a user
-- SECURITY DEFINER prevents RLS from being re-evaluated within the function
CREATE OR REPLACE FUNCTION public.is_cost_estimate_assigned_to_user(estimate_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM cost_estimate_assignments cea
    JOIN crm_leads cl ON cea.crm_lead_id = cl.id
    WHERE cea.cost_estimate_id = estimate_id 
    AND cl.user_id = user_uuid
  );
$$;

-- Helper function to check if an assignment belongs to an estimate created by the user
CREATE OR REPLACE FUNCTION public.is_assignment_for_own_estimate(assignment_estimate_id uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM cost_estimates ce
    WHERE ce.id = assignment_estimate_id 
    AND ce.created_by = user_uuid
  );
$$;

-- Recreate policy for customers to view their assigned cost estimates
CREATE POLICY "Customers view assigned cost_estimates" 
ON cost_estimates 
FOR SELECT 
USING (
  public.is_cost_estimate_assigned_to_user(id, auth.uid())
);

-- Recreate policy for partners to manage assignments for their own estimates
CREATE POLICY "Partners manage own assignments" 
ON cost_estimate_assignments 
FOR ALL 
USING (
  public.is_assignment_for_own_estimate(cost_estimate_id, auth.uid())
);