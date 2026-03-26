import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CrmLead {
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
}

export function useCrmLead() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["crm-lead", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("crm_leads")
        .select("phone, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching CRM lead:", error);
        return null;
      }

      return data as CrmLead | null;
    },
    enabled: !!user?.id,
  });
}
