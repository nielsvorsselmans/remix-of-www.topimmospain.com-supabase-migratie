-- Fix RLS policies for cost_estimate_assignments to prevent race conditions

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Partners manage own assignments" ON cost_estimate_assignments;

-- Create separate policies for different operations

-- INSERT: Direct check without SECURITY DEFINER to avoid race condition
CREATE POLICY "Partners can insert assignments for own estimates" 
ON cost_estimate_assignments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cost_estimates ce
    WHERE ce.id = cost_estimate_id 
    AND ce.created_by = auth.uid()
  )
);

-- SELECT: Use SECURITY DEFINER function for reading
CREATE POLICY "Partners can view own assignments" 
ON cost_estimate_assignments 
FOR SELECT 
USING (public.is_assignment_for_own_estimate(cost_estimate_id, auth.uid()));

-- UPDATE: Use SECURITY DEFINER function
CREATE POLICY "Partners can update own assignments" 
ON cost_estimate_assignments 
FOR UPDATE 
USING (public.is_assignment_for_own_estimate(cost_estimate_id, auth.uid()));

-- DELETE: Use SECURITY DEFINER function
CREATE POLICY "Partners can delete own assignments" 
ON cost_estimate_assignments 
FOR DELETE 
USING (public.is_assignment_for_own_estimate(cost_estimate_id, auth.uid()));