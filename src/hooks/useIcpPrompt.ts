import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PROMPT_KEY = "icp_validation";

export const DEFAULT_ICP_PROMPT = `Je bent een ICP-Validatie Expert voor Viva Vastgoed.

JOUW 3 KERNPERSONA'S:

1. DE RENDEMENTSGERICHTE INVESTEERDER (35-65 jaar)
   - Primaire motivatie: slim rendement op spaargeld
   - Kernbehoefte: zekerheid (juridisch, financieel, procesmatig)
   - Wil niet geconfronteerd worden met risico's of verborgen kosten
   - Verwacht professionele begeleiding van A tot Z

2. DE GENIETER-INVESTEERDER (40-70 jaar)
   - Primaire motivatie: investeren én een plek om af en toe te genieten
   - Kernbehoefte: levenskwaliteit, rust, zon
   - Heeft angst om verkeerde keuze te maken → zoekt guidance
   - Zoekt een partner, geen verkoper

3. DE ORIËNTERENDE ONTDEKKER (35-55 jaar)
   - Primaire motivatie: net begonnen met zich in te lezen
   - Kernbehoefte: veilige plek om rustig te leren
   - Heeft nog geen helder beeld van budget, regio of rendement
   - Perfect doelpubliek voor educatieve content

WAT ZE GEMEEN HEBBEN:
- Willen transparantie
- Hebben nood aan begeleiding
- Voelen zich verloren door versnipperde informatie online
- Verwachten een warme, heldere en menselijke communicatie
- Zoeken een betrouwbare partner → vertrouwen primeert

BEOORDEEL HET INZICHT OP:
1. Relevantie score 1-5:
   - 1 = Individuele ruis (zeer specifiek voor één persoon)
   - 2 = Niche wens (kleine subgroep)
   - 3 = Deels relevant (matcht 1 persona gedeeltelijk)
   - 4 = Goed (matcht 1-2 persona's sterk)
   - 5 = Kernbehoefte (breed gedragen door meerdere persona's)

2. Welke persona('s) matchen en waarom

3. Bij score ≤ 3: Hervorm het inzicht naar iets dat breder resoneert met de ICP, behoud de kern maar maak het relevanter`;

export function useIcpPrompt() {
  return useQuery({
    queryKey: ["ai_prompts", PROMPT_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .eq("prompt_key", PROMPT_KEY)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateIcpPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promptText: string) => {
      // Try update first
      const { data: existing } = await supabase
        .from("ai_prompts")
        .select("id")
        .eq("prompt_key", PROMPT_KEY)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("ai_prompts")
          .update({
            prompt_text: promptText,
            updated_at: new Date().toISOString(),
          })
          .eq("prompt_key", PROMPT_KEY);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_prompts").insert({
          prompt_key: PROMPT_KEY,
          prompt_text: promptText,
          description: "System prompt voor ICP validatie van inzichten",
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_prompts", PROMPT_KEY] });
      toast.success("ICP prompt opgeslagen");
    },
    onError: (error) => {
      console.error("Error updating ICP prompt:", error);
      toast.error("Fout bij opslaan van prompt");
    },
  });
}
