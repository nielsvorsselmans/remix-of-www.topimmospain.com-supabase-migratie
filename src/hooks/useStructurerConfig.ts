import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StructurerConfig {
  id: string;
  prompt_key: string;
  prompt_text: string;
  model_id: string | null;
  description: string | null;
  updated_at: string | null;
}

export const DEFAULT_STRUCTURER_PROMPT = `Jij bent een Content Structureerder voor Viva Vastgoed.

Je krijgt een strategische analyse (brainstorm) van een vastgoedproject en moet deze omzetten naar gestructureerde JSON voor de website.

## JOUW DOEL:
Extraheer de belangrijkste inzichten en structureer ze voor de detailpagina componenten.

## OUTPUT STRUCTUUR:

### 1. Personas (voor PersonaSwitcher component)
Maak voor ELKE persona content die specifiek is voor DIT project:

**Vakantie persona:**
- Title: "[Projectnaam] als vakantiewoning"
- Description: 2-3 zinnen waarom dit project perfect is voor vakantiebezoekers
- Highlights: 4-5 concrete, project-specifieke voordelen

**Investering persona:**
- Title: "[Projectnaam] als investering"  
- Description: 2-3 zinnen over het investeringspotentieel
- Highlights: 4-5 financiële/rendement highlights
- EstimatedYield: Geschat verhuurrendement ("X-Y%")
- YieldNote: 1 zin uitleg

**Wonen persona:**
- Title: "Permanent wonen in [Projectnaam]"
- Description: 2-3 zinnen over dagelijks leven
- Highlights: 4-5 praktische voordelen

### 2. Unfair Advantage
- Headline: 1 krachtige zin
- Details: 2-3 bullets

### 3. Golden Nuggets
5 unieke, concrete marketing feiten.

### 4. Waarschuwingen
- Severity "info": Neutrale informatie
- Severity "warning": Echte aandachtspunten

### 5. Audience Scores
Beoordeel geschiktheid: "hoog" | "medium" | "laag"

## REGELS:
1. Gebruik ALLEEN informatie uit de gegeven brainstorm
2. Wees specifiek, geen vage beschrijvingen
3. Yields alleen als rental data beschikbaar was
4. Waarschuwingen = eerlijke transparantie
5. Golden Nuggets moeten écht uniek zijn

Genereer de output via de structure_analysis functie.`;

export function useStructurerConfig() {
  return useQuery<StructurerConfig>({
    queryKey: ["structurer-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .eq("prompt_key", "deep_analysis_structurer")
        .maybeSingle();

      if (error) throw error;

      // Return fetched config or default
      if (data) {
        return data as StructurerConfig;
      }

      // Return default config if not found
      return {
        id: "",
        prompt_key: "deep_analysis_structurer",
        prompt_text: DEFAULT_STRUCTURER_PROMPT,
        model_id: "google/gemini-2.5-flash",
        description: "Structureert de Deep Analysis brainstorm naar JSON voor de detailpagina",
        updated_at: null,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateStructurerConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptText, modelId }: { promptText: string; modelId: string }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from("ai_prompts")
        .select("id")
        .eq("prompt_key", "deep_analysis_structurer")
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("ai_prompts")
          .update({
            prompt_text: promptText,
            model_id: modelId,
            updated_at: new Date().toISOString(),
          })
          .eq("prompt_key", "deep_analysis_structurer");

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("ai_prompts")
          .insert({
            prompt_key: "deep_analysis_structurer",
            prompt_text: promptText,
            model_id: modelId,
            description: "Structureert de Deep Analysis brainstorm naar JSON voor de detailpagina",
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["structurer-config"] });
      toast.success("Structureerder instellingen opgeslagen");
    },
    onError: (error) => {
      console.error("Error updating structurer config:", error);
      toast.error("Fout bij opslaan", { description: error.message });
    },
  });
}
