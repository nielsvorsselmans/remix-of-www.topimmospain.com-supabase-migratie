import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeepAnalysisConfig {
  id: string;
  prompt_key: string;
  prompt_text: string;
  model_id: string | null;
  description: string | null;
  updated_at: string | null;
}

export const AVAILABLE_MODELS = [
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Beste kwaliteit, complex redeneren" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Snel, lagere kosten" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview", description: "Nieuwste model" },
  { id: "google/gemini-3-pro-preview", label: "Gemini 3 Pro Preview", description: "Nieuwste pro model" },
  { id: "openai/gpt-5", label: "GPT-5", description: "OpenAI flagship" },
  { id: "openai/gpt-5-mini", label: "GPT-5 Mini", description: "Snel, goedkoper" },
] as const;

export const DEFAULT_MODEL = "google/gemini-2.5-pro";

export const DEFAULT_PROMPT = `Jij bent een Senior Real Estate Investment Analyst voor Viva Vastgoed.

Je krijgt ALLE beschikbare data over een project. Analyseer dit GRONDIG.

## WAT JE KRIJGT:
- Project metadata (naam, prijs, status, locatie)
- ALLE woningtypes met volledige specs (m², terrassen, features, prijzen)
- Location Intelligence (nabije stranden, golf, restaurants, ziekenhuizen - uit Google Places)
- Rental Intelligence (verhuurdata van vergelijkbare woningen - uit AirROI)

## ANALYSEER KRITISCH:

### 1. UNFAIR ADVANTAGE
- Wat maakt dit project ECHT bijzonder? (niet marketing)
- Prijs/m² vs. vergelijkbare projecten?
- Locatievoordelen die niet makkelijk te repliceren zijn?
- Timing (pre-launch, key-ready, laatste units)?

### 2. PROPERTY TYPE ANALYSE
- Welk type biedt de beste waarde? (prijs per m²)
- Welk type is het meest interessant voor verhuur?
- Welk type voor eigen gebruik?
- Zijn er opvallende verschillen tussen types?

### 3. RENTAL POTENTIAL (als data beschikbaar)
- Realistische yield verwachting gebaseerd op AirROI data
- Vergelijking met de comparables
- Seizoensgebondenheid (als zichtbaar in data)
- Waarschuwingen of kansen

### 4. LOCATIE SCORE
- Strand toegankelijkheid (meters, welke stranden?)
- Golf toegankelijkheid
- Dagelijkse voorzieningen (supermarkten, restaurants)
- Zorg (ziekenhuizen, apotheken)
- Luchthaven bereikbaarheid

### 5. TARGET AUDIENCE FIT
Beoordeel eerlijk:
- INVESTEERDER: Hoog/Medium/Laag + waarom
- VAKANTIEGANGER: Hoog/Medium/Laag + waarom  
- PERMANENTE BEWONER: Hoog/Medium/Laag + waarom

### 6. WAARSCHUWINGEN
- Wat zijn de ECHTE nadelen?
- Waar moet een koper op letten?
- Welke verwachtingen moeten we temperen?

### 7. GOLDEN NUGGETS
- Welke details zijn perfect voor marketing?
- Welke feiten onderscheiden dit van concurrentie?

Geef een uitgebreide analyse (600-1000 woorden) in vrije tekst.
Wees kritisch, eerlijk en concreet. Geen marketing fluff.`;

export function useDeepAnalysisConfig() {
  return useQuery({
    queryKey: ["deep-analysis-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .eq("prompt_key", "project_deep_analysis_brainstormer")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      // Return default if not in database
      if (!data) {
        return {
          id: "default",
          prompt_key: "project_deep_analysis_brainstormer",
          prompt_text: DEFAULT_PROMPT,
          model_id: DEFAULT_MODEL,
          description: null,
          updated_at: null,
        } as DeepAnalysisConfig;
      }
      
      return {
        ...data,
        model_id: data.model_id || DEFAULT_MODEL,
      } as DeepAnalysisConfig;
    },
  });
}

export function useUpdateDeepAnalysisConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptText, modelId }: { promptText: string; modelId: string }) => {
      const { data: existing } = await supabase
        .from("ai_prompts")
        .select("id")
        .eq("prompt_key", "project_deep_analysis_brainstormer")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("ai_prompts")
          .update({ 
            prompt_text: promptText, 
            model_id: modelId,
            updated_at: new Date().toISOString() 
          })
          .eq("prompt_key", "project_deep_analysis_brainstormer");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_prompts")
          .insert({
            prompt_key: "project_deep_analysis_brainstormer",
            prompt_text: promptText,
            model_id: modelId,
            description: "Deep Analysis brainstormer prompt",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deep-analysis-config"] });
      toast.success("Configuratie opgeslagen");
    },
    onError: (error) => {
      toast.error("Fout bij opslaan: " + (error instanceof Error ? error.message : "Onbekende fout"));
    },
  });
}
