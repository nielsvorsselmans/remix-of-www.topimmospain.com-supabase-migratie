
-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'advocaat';

-- 2. Create advocaten table
CREATE TABLE public.advocaten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  company text,
  email text NOT NULL UNIQUE,
  phone text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.advocaten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage advocaten"
  ON public.advocaten FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Advocaat can read own record"
  ON public.advocaten FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Create sale_advocaten junction table
CREATE TABLE public.sale_advocaten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  advocaat_id uuid REFERENCES public.advocaten(id) ON DELETE CASCADE NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sale_id, advocaat_id)
);

ALTER TABLE public.sale_advocaten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sale_advocaten"
  ON public.sale_advocaten FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Advocaat can read own assignments"
  ON public.sale_advocaten FOR SELECT
  TO authenticated
  USING (
    advocaat_id IN (
      SELECT id FROM public.advocaten WHERE user_id = auth.uid()
    )
  );

-- 4. RLS on sales for advocaten
CREATE POLICY "Advocaat can view assigned sales"
  ON public.sales FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT sa.sale_id FROM public.sale_advocaten sa
      JOIN public.advocaten a ON a.id = sa.advocaat_id
      WHERE a.user_id = auth.uid()
    )
  );
