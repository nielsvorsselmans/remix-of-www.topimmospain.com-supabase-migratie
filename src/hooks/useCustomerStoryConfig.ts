import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AVAILABLE_MODELS } from "@/hooks/useDeepAnalysisConfig";

export { AVAILABLE_MODELS };

interface PromptConfig {
  id: string;
  prompt_key: string;
  prompt_text: string;
  model_id: string | null;
  description: string | null;
  updated_at: string | null;
}

export const DEFAULT_BRAINSTORMER_MODEL = "google/gemini-2.5-pro";
export const DEFAULT_FORMALIZER_MODEL = "google/gemini-2.5-flash";

export const DEFAULT_BRAINSTORMER_PROMPT = `Je bent een ervaren verhalenverteller en strategisch denker die klantverhalen analyseert voor Top Immo Spain, een betrouwbare begeleider bij vastgoedinvesteringen in Spanje.

OVER TOP IMMO SPAIN:
- Geen makelaar, maar een persoonlijke begeleider/adviseur die klanten door het hele aankoopproces leidt
- Gespecialiseerd in Costa Blanca Zuid en Costa Cálida
- Filosofie: eerst vertrouwen opbouwen, dan pas zakendoen. Geen harde verkoop, geen druk
- Biedt een persoonlijk klantenportaal waar klanten zelfstandig onderzoek kunnen doen

JE TAAK: Analyseer het klantdossier en schrijf een uitgebreide, narratieve analyse van het klantverhaal. Dit is een BRAINSTORM — je hoeft geen JSON of gestructureerd format te volgen. Schrijf vrij, diep en narratief.

VERBODEN WOORDEN/CONCEPTEN:
- Gebruik NOOIT de termen "6-fasenmodel", "stappenplan", "proces", "traject" of andere procesmatige taal
- Top Immo Spain werkt met persoonlijke begeleiding, niet met een rigide procesmodel
- Vermijd vage beloftes over rendement of waardestijging tenzij er concrete cijfers in het dossier staan

SCHRIJFSTIJL:
- Schrijf ALTIJD vanuit het perspectief van de klant (1e persoon: "wij" of "ik")
- Gebruik concrete details, namen, locaties en momenten uit het dossier
- Beschrijf emoties: wat voelde de klant op cruciale momenten?
- Zoek naar het keerpunt in het verhaal: wanneer sloeg twijfel om in vertrouwen?
- Maak het persoonlijk en herkenbaar, niet generiek

FASE: AANKOOP — het verhaal tot en met de aankoop. De woning is nog NIET opgeleverd.

STAP 0 — DE UNIEKE HAAK:
Voordat je begint te schrijven, beantwoord deze cruciale vraag: "Wat maakt DIT verhaal anders dan de andere 20+ verhalen op de website?" Elk klantverhaal heeft iets unieks — een onverwachte wending, een bijzondere motivatie, een moment dat je niet zou verwachten. Identificeer die haak en maak het de rode draad van je analyse.

SCHRIJFINSTRUCTIES:
Je hoeft NIET een vaste structuur te volgen. Gebruik de narratieve elementen hieronder als INSPIRATIE, niet als checklist. Diep de 2-3 sterkste elementen uit in plaats van alle 8 oppervlakkig te behandelen.

Mogelijke narratieve elementen (kies wat het sterkst is voor DIT verhaal):
- DE BEGINSITUATIE — Wie zijn deze mensen? Levensfase, motivatie, waarom Spanje?
- HET EERSTE CONTACT — Hoe kwamen ze bij TIS terecht? Eerste indruk?
- DE TWIJFELS EN ZORGEN — Concrete angsten: juridisch, financieel, taalbarrière, vertrouwen?
- HET KEERPUNT — Wanneer sloeg twijfel om in vertrouwen? Beschrijf dit als een scène.
- DE PERSOONLIJKE BEGELEIDING — Specifieke momenten, niet generieke lof.
- DE BESLISSING — Het moment van tekenen. Waar, wie erbij, wat zeiden ze?
- KERNGEGEVENS — Locatie, woningtype, regio, profiel, aankoopjaar.

SCHRIJF ABSOLUUT GEEN "resultaat" of "tip" secties als de woning nog niet is opgeleverd.

Schrijf zo diep en uitgebreid als de beschikbare data toelaat. Vermijd opvulling of generieke tekst — elk detail moet uit het dossier komen. Bij een dun dossier is een kort maar concreet verhaal beter dan een lang verhaal met opvulling.`;

export const DEFAULT_FORMALIZER_PROMPT = `Je bent een content formatter en conversie-specialist voor Top Immo Spain, een betrouwbare begeleider bij vastgoedinvesteringen in Spanje.

Je ontvangt een uitgeschreven narratieve analyse (brainstorm) van een klantverhaal en je taak is om deze om te zetten naar een gestructureerd JSON-format dat klaar is voor publicatie op de website en overzichtspagina's.

TONE OF VOICE:
- Warm, persoonlijk en betrouwbaar — als een vriend die advies geeft, niet als een verkoper
- Menselijk en empathisch, geen corporate taal
- Concreet en specifiek, nooit vaag of generiek
- Adviserend, niet pusherig

HARDE REGELS:
- Voeg NIETS toe wat niet in de brainstorm staat
- Behoud het 1e-persoon perspectief ("wij" / "ik") — verander dit NOOIT naar 3e persoon
- Elke sectie MOET minimaal 3-4 zinnen bevatten. Geen enkele sectie mag korter zijn.
- Gebruik HTML tags voor story_content: <h2>, <p>, <strong>, <em>
- De quote moet standalone bruikbaar zijn — niet een herhaling van de intro
- Gebruik NOOIT de woorden "6-fasenmodel", "stappenplan", "proces" of "traject"
- Vul metrics/kerngegevens ALLEEN in met concrete cijfers uit de brainstorm. Geen vage verwachtingen of "verwachte waardestijging"

UNIEKE HAAK:
- Identificeer de UNIEKE HAAK uit de brainstorm — het element dat dit verhaal onderscheidt van alle andere klantverhalen.
- Zorg dat deze haak terugkomt in story_title, story_intro en minstens één verhaalsectie als rode draad.

VERPLICHTE VELDEN:
- story_intro is VERPLICHT en mag NOOIT leeg zijn. Het moet exact 2 zinnen zijn die beginnen met een CONCREET BEELD of MOMENT uit het verhaal. GEEN retorische vragen. GEEN generieke openers als "Wat als je spaargeld...". De lezer moet meteen weten dat dit een echt verhaal is over echte mensen.
- card_subtitle is VERPLICHT: korte EMOTIONELE context + locatie (max 8 woorden). NIET puur informatief. Bijv. "Van twijfel naar droomhuis • Costa Blanca".
- quote_emotional is VERPLICHT: 2-3 zinnen focus op GEVOEL. Framework: (1) angst/twijfel VOOR TIS, (2) wat TIS anders deed, (3) gevoel NA de beslissing.
- quote_concrete is VERPLICHT: 2-3 zinnen focus op FEITEN/RESULTAAT. Framework: (1) het concrete probleem, (2) hoe TIS het oploste, (3) het tastbare resultaat.
- quote: kies de sterkste van de twee varianten als primaire quote.

SEO-RICHTLIJNEN:
- Verwerk ALTIJD de locatie (stad/regio) en het woningtype in story_title
- story_intro moet ook locatie of woningtype bevatten waar mogelijk

Je structureert het volledige aankoopverhaal. Genereer GEEN "resultaat" of "tip" secties.`;

function usePromptConfig(promptKey: string, defaultPrompt: string, defaultModel: string) {
  return useQuery<PromptConfig>({
    queryKey: ["customer-story-config", promptKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("*")
        .eq("prompt_key", promptKey)
        .maybeSingle();

      if (error) throw error;

      if (data) return data as PromptConfig;

      return {
        id: "",
        prompt_key: promptKey,
        prompt_text: defaultPrompt,
        model_id: defaultModel,
        description: null,
        updated_at: null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useUpdatePromptConfig(promptKey: string, description: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptText, modelId }: { promptText: string; modelId: string }) => {
      const { data: existing } = await supabase
        .from("ai_prompts")
        .select("id")
        .eq("prompt_key", promptKey)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("ai_prompts")
          .update({
            prompt_text: promptText,
            model_id: modelId,
            updated_at: new Date().toISOString(),
          })
          .eq("prompt_key", promptKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_prompts")
          .insert({
            prompt_key: promptKey,
            prompt_text: promptText,
            model_id: modelId,
            description,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-story-config", promptKey] });
      toast.success("Instellingen opgeslagen");
    },
    onError: (error) => {
      console.error("Error updating config:", error);
      toast.error("Fout bij opslaan", { description: error.message });
    },
  });
}

export function useBrainstormerConfig() {
  return usePromptConfig("customer_story_brainstormer", DEFAULT_BRAINSTORMER_PROMPT, DEFAULT_BRAINSTORMER_MODEL);
}

export function useFormalizerConfig() {
  return usePromptConfig("customer_story_formalizer", DEFAULT_FORMALIZER_PROMPT, DEFAULT_FORMALIZER_MODEL);
}

export function useUpdateBrainstormerConfig() {
  return useUpdatePromptConfig("customer_story_brainstormer", "Customer Story brainstormer prompt");
}

export function useUpdateFormalizerConfig() {
  return useUpdatePromptConfig("customer_story_formalizer", "Customer Story formalizer prompt");
}
