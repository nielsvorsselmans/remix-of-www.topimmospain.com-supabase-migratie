import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CustomerHypotheekData {
  burgerlijke_staat: string | null;
  plannen: string | null;
  inkomenstype: string | null;
  bruto_jaarinkomen: number;
  heeft_co_aanvrager: boolean;
  partner_voornaam: string | null;
  partner_achternaam: string | null;
  partner_geboortejaar: number | null;
  partner_inkomenstype: string | null;
  partner_bruto_jaarinkomen: number;
  eigen_vermogen: number;
  woonlasten: number;
  autolening: number;
  persoonlijke_lening: number;
  alimentatie: number;
  heeft_overwaarde: boolean;
  woningwaarde: number;
  openstaande_hypotheek: number;
  is_pep: boolean;
}

export function useCustomerHypotheekData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["customer-hypotheek-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from("customer_hypotheek_data")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching hypotheek data:", error);
        return null;
      }

      return data as CustomerHypotheekData | null;
    },
    enabled: !!user?.id,
  });
}
