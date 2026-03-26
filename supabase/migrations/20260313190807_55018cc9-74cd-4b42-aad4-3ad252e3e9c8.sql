
-- Create helper function
CREATE OR REPLACE FUNCTION public.is_advocaat_for_sale(p_user_id uuid, p_sale_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sale_advocaten sa
    JOIN public.advocaten a ON a.id = sa.advocaat_id
    WHERE sa.sale_id = p_sale_id
      AND a.user_id = p_user_id
  );
$$;
