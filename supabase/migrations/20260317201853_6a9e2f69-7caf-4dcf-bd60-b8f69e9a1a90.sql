CREATE TABLE public.hypotheek_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  voornaam text NOT NULL,
  achternaam text NOT NULL,
  email text NOT NULL,
  telefoon_landcode text DEFAULT '+31',
  telefoon text DEFAULT '',
  geboortedatum date,
  land text DEFAULT 'nederland',
  burgerlijke_staat text,
  plannen text,
  inkomenstype text,
  bruto_jaarinkomen numeric DEFAULT 0,
  heeft_co_aanvrager boolean DEFAULT false,
  partner_bruto_jaarinkomen numeric DEFAULT 0,
  eigen_vermogen numeric DEFAULT 0,
  schulden_totaal numeric DEFAULT 0,
  provincie text,
  woning_type text,
  aankoopsom numeric DEFAULT 0,
  eindscore_letter text,
  eindscore_percentage numeric,
  is_pep boolean DEFAULT false,
  rapport_json jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hypotheek_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert hypotheek leads" ON public.hypotheek_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own hypotheek leads" ON public.hypotheek_leads
  FOR SELECT TO authenticated USING (user_id = auth.uid());