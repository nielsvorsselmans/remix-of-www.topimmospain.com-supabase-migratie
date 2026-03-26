
CREATE POLICY "Advocaat can view milestones for assigned sales"
ON public.sale_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sale_advocaten sa
    JOIN public.advocaten a ON a.id = sa.advocaat_id
    WHERE sa.sale_id = sale_milestones.sale_id
      AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Advocaat can update milestones for assigned sales"
ON public.sale_milestones
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.sale_advocaten sa
    JOIN public.advocaten a ON a.id = sa.advocaat_id
    WHERE sa.sale_id = sale_milestones.sale_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sale_advocaten sa
    JOIN public.advocaten a ON a.id = sa.advocaat_id
    WHERE sa.sale_id = sale_milestones.sale_id
      AND a.user_id = auth.uid()
  )
);
