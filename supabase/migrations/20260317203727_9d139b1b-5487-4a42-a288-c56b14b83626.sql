
CREATE TABLE public.customer_hypotheek_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  burgerlijke_staat text,
  plannen text,
  inkomenstype text,
  bruto_jaarinkomen numeric DEFAULT 0,
  heeft_co_aanvrager boolean DEFAULT false,
  partner_voornaam text,
  partner_achternaam text,
  partner_geboortejaar integer,
  partner_inkomenstype text,
  partner_bruto_jaarinkomen numeric DEFAULT 0,
  eigen_vermogen numeric DEFAULT 0,
  woonlasten numeric DEFAULT 0,
  autolening numeric DEFAULT 0,
  persoonlijke_lening numeric DEFAULT 0,
  alimentatie numeric DEFAULT 0,
  heeft_overwaarde boolean DEFAULT false,
  woningwaarde numeric DEFAULT 0,
  openstaande_hypotheek numeric DEFAULT 0,
  is_pep boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_hypotheek_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own hypotheek data"
  ON public.customer_hypotheek_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hypotheek data"
  ON public.customer_hypotheek_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hypotheek data"
  ON public.customer_hypotheek_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
