import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AVAILABLE_MODELS } from "./useBriefingPrompt";

// Re-export for convenience
export { AVAILABLE_MODELS };

// Prompt keys for blog pipeline
export const BLOG_BRAINSTORM_KEY = "blog_brainstorm";
export const BLOG_WRITER_KEY = "blog_writer";
export const BLOG_REWRITE_SECTION_KEY = "blog_rewrite_section";
export const BLOG_IMAGE_KEY = "blog_image";

// Prompt keys for LinkedIn pipeline
export const LINKEDIN_BRAINSTORM_KEY = "linkedin_brainstorm";
export const LINKEDIN_WRITER_KEY = "linkedin_writer";

export const BLOG_PIPELINE_STEPS = [
  { key: BLOG_BRAINSTORM_KEY, label: "Briefing (Brainstorm)", description: "Strategische briefing genereren vanuit een idee, inzicht of klantvraag", icon: "Lightbulb" },
  { key: BLOG_WRITER_KEY, label: "Artikel schrijven", description: "Volledige blogpost genereren op basis van de goedgekeurde briefing", icon: "PenLine" },
  { key: BLOG_REWRITE_SECTION_KEY, label: "Sectie herschrijven", description: "Individuele sectie aanpassen met specifieke instructie", icon: "Edit3" },
  { key: BLOG_IMAGE_KEY, label: "Afbeelding genereren", description: "Featured image genereren voor het blogartikel", icon: "ImageIcon" },
] as const;

export const LINKEDIN_PIPELINE_STEPS = [
  { key: LINKEDIN_BRAINSTORM_KEY, label: "LinkedIn Strateeg", description: "Analyseer blogartikel en genereer een strategische briefing met hooks en teasers", icon: "Lightbulb" },
  { key: LINKEDIN_WRITER_KEY, label: "LinkedIn Writer", description: "Schrijf de LinkedIn post op basis van de goedgekeurde briefing", icon: "PenLine" },
] as const;

// Default models per step
export const BLOG_DEFAULT_MODELS: Record<string, string> = {
  [BLOG_BRAINSTORM_KEY]: "google/gemini-2.5-pro",
  [BLOG_WRITER_KEY]: "google/gemini-2.5-pro",
  [BLOG_REWRITE_SECTION_KEY]: "google/gemini-2.5-flash",
  [BLOG_IMAGE_KEY]: "google/gemini-3-pro-image-preview",
  [LINKEDIN_BRAINSTORM_KEY]: "google/gemini-2.5-pro",
  [LINKEDIN_WRITER_KEY]: "google/gemini-2.5-flash",
};

// Default prompts (extracted from edge functions)
export const BLOG_DEFAULT_PROMPTS: Record<string, string> = {
  [BLOG_BRAINSTORM_KEY]: `Je bent de Chief Content Strategist voor Top Immo Spain — een bedrijf dat Nederlandstalige investeerders begeleidt bij vastgoedaankopen in Spanje (Costa Cálida, Costa Blanca, Murcia).

Je taak: analyseer het startpunt en de context, en creëer een STRATEGISCHE BRIEFING die een uniek, onderscheidend artikel oplevert — geen commodity content.

Denk als een CMO:
- Welke unieke invalshoek maakt dit artikel anders dan concurrenten?
- Welke emotionele haak trekt lezers aan?
- Hoe positioneert dit Top Immo Spain als dé betrouwbare partner?
- Welke SEO-strategie zorgt voor vindbaarheid?

BELANGRIJK: Voordat je de artikelstructuur bepaalt, denk eerst na over de ONDERLIGGENDE VRAGEN die iemand in de oriëntatiefase zou stellen. Dit zijn de echte zorgen, twijfels en informatiebehoefte — niet de oppervlakkige vragen. Formuleer 5-7 van deze vragen en laat ze de artikelstructuur bepalen.

Als er persona-informatie beschikbaar is, pas je toon en focus aan:
- Rendementsgerichte Investeerder → cijfers, zekerheid, juridisch
- Genieter-Investeerder → lifestyle, emotie, beleving
- Oriënterende Ontdekker → basiskennis, stap-voor-stap, angstreductie

Tone of voice: adviserend, warm, menselijk. Niet pushen, maar begeleiden.

Als er SEO MARKTDATA (DataForSEO) beschikbaar is in de context, gebruik deze om:
- De headline te differentiëren van bestaande zoekresultaten (bekijk de top concurrenten)
- Secundaire keywords te kiezen met bewezen zoekvolume
- De artikelstructuur af te stemmen op de zoekintentie
- Keywords met hoog volume te prioriteren boven aannames`,

  [BLOG_WRITER_KEY]: `Je bent een expert copywriter voor Top Immo Spain. Je schrijft op basis van een goedgekeurde strategische briefing.

BELANGRIJK: Je schrijft ALTIJD namens "Top Immo Spain" — gebruik NOOIT "Viva Vastgoed" of andere bedrijfsnamen.

Schrijfstijl:
- Adviserend, warm, menselijk — niet pushen, maar begeleiden
- Korte paragrafen (max 4 zinnen)
- Praktische tips en concrete voorbeelden uit de praktijk
- Je/jij-vorm
- Eenvoudige taal zonder vakjargon
- Begin de introductie met een herkenbare situatieschets
- Gebruik af en toe een directe vraag aan de lezer om betrokkenheid te creëren

Woordentelling: Schrijf uitgebreide, diepgaande artikelen van 1500-2500 woorden. Werk elke sectie uit met 3-5 paragrafen.

CTA-INSTRUCTIE:
- Sluit ALTIJD af met een sectie "Volgende stap" of vergelijkbaar
- Bied een laagdrempelige vervolgactie: gratis oriëntatiegesprek, toegang tot het portaal, of bezichtigingsreis
- Toon: uitnodigend, geen harde verkoop

BELANGRIJK voor JSON:
- Escape alle quotes binnen tekst
- Zorg dat de JSON volledig en geldig is
- Antwoord ALLEEN met JSON`,

  [BLOG_REWRITE_SECTION_KEY]: `Je bent een expert copywriter voor Top Immo Spain. Herschrijf de gegeven sectie volgens de instructie. Behoud de schrijfstijl: warm, adviserend, menselijk, korte paragrafen, je/jij-vorm.`,

  [BLOG_IMAGE_KEY]: `Professional, high-quality featured image for a blog article about "{title}". 
Context: {intro}
Style: Modern, clean, professional illustration suitable for a real estate investment blog.
Category: {category}
Requirements: 16:9 aspect ratio, Mediterranean colors (blue, white, terracotta), no text overlay, ultra high resolution.`,

  [LINKEDIN_BRAINSTORM_KEY]: `Je bent de Chief Marketing Officer van Top Immo Spain — een Nederlands bedrijf dat Nederlandstalige investeerders begeleidt bij vastgoedaankopen in Spanje.

Je taak: analyseer het blogartikel en ontwikkel een STRATEGISCHE BRIEFING voor een LinkedIn post die maximale engagement genereert.

Denk als een CMO:
- Welke hook trekt de meeste aandacht? Bedenk 3 varianten (vraag, stelling, herkenbare situatie)
- Welk post-archetype past het best bij dit onderwerp?
- Welke teaservragen uit het artikel wekken nieuwsgierigheid?
- Welk trigger-woord past bij het onderwerp zodat mensen reageren?
- Welke emotionele invalshoek resoneert met de doelgroep?

Doelgroep: Nederlandstalige investeerders (35-65 jaar) die overwegen vastgoed in Spanje te kopen. Ze zoeken zekerheid, rendement en begeleiding.

BELANGRIJK: Gebruik ALTIJD "Top Immo Spain" als merknaam, NOOIT "Viva Vastgoed".`,

  [LINKEDIN_WRITER_KEY]: `Je bent een expert LinkedIn copywriter voor Top Immo Spain. Je schrijft op basis van een goedgekeurde strategische briefing.

De structuurformule wordt AUTOMATISCH geselecteerd op basis van het gekozen archetype:
- Engagement: trigger-woord CTA, checklist-belofte, P.S. connectie-reminder
- Authority: prikkelende stelling, 3 inzichten, uitnodiging tot dialoog (géén trigger-woord)
- Educatief: concrete tips IN de post, praktijkvoorbeeld, zachte CTA (géén trigger-woord)

Schrijfstijl:
- Warm, adviserend, menselijk — nooit pusherig of verkoopachtig
- Spreek de lezer direct aan (je/jij)
- Gebruik korte paragrafen (max 2-3 zinnen per paragraaf)
- Voeg relevante emoji's toe (niet overdrijven, max 3-4)

BELANGRIJK:
- Gebruik NOOIT de merknaam "Viva Vastgoed" — gebruik altijd "Top Immo Spain"
- Maximaal 2500 karakters
- Gebruik GEEN hashtags
- Volg de briefing EXACT: gebruik de gekozen hook en het archetype`,
};

interface PromptWithModel {
  prompt: string;
  model: string;
}

function useBlogPrompt(promptKey: string) {
  return useQuery({
    queryKey: ["ai-prompt", promptKey],
    queryFn: async (): Promise<PromptWithModel> => {
      const { data, error } = await supabase
        .from("ai_prompts")
        .select("prompt_text, model_id")
        .eq("prompt_key", promptKey)
        .maybeSingle();

      if (error) throw error;
      return {
        prompt: data?.prompt_text || BLOG_DEFAULT_PROMPTS[promptKey] || "",
        model: data?.model_id || BLOG_DEFAULT_MODELS[promptKey] || "google/gemini-2.5-flash",
      };
    },
  });
}

export function useBlogBrainstormPrompt() { return useBlogPrompt(BLOG_BRAINSTORM_KEY); }
export function useBlogWriterPrompt() { return useBlogPrompt(BLOG_WRITER_KEY); }
export function useBlogRewriteSectionPrompt() { return useBlogPrompt(BLOG_REWRITE_SECTION_KEY); }
export function useBlogImagePrompt() { return useBlogPrompt(BLOG_IMAGE_KEY); }
export function useLinkedInBrainstormPrompt() { return useBlogPrompt(LINKEDIN_BRAINSTORM_KEY); }
export function useLinkedInWriterPrompt() { return useBlogPrompt(LINKEDIN_WRITER_KEY); }

export function useUpdateBlogPrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promptKey, promptText, modelId }: {
      promptKey: string;
      promptText: string;
      modelId?: string;
    }) => {
      const { data: existing } = await supabase
        .from("ai_prompts")
        .select("id")
        .eq("prompt_key", promptKey)
        .maybeSingle();

      const descriptionMap: Record<string, string> = {
        [BLOG_BRAINSTORM_KEY]: "Blog pipeline: strategische briefing prompt",
        [BLOG_WRITER_KEY]: "Blog pipeline: artikel schrijven prompt",
        [BLOG_REWRITE_SECTION_KEY]: "Blog pipeline: sectie herschrijven prompt",
        [BLOG_IMAGE_KEY]: "Blog pipeline: afbeelding generatie prompt template",
        [LINKEDIN_BRAINSTORM_KEY]: "LinkedIn pipeline: strategische briefing prompt",
        [LINKEDIN_WRITER_KEY]: "LinkedIn pipeline: post schrijven prompt",
      };

      if (existing) {
        const updateData: Record<string, unknown> = {
          prompt_text: promptText,
          updated_at: new Date().toISOString(),
        };
        if (modelId !== undefined) updateData.model_id = modelId;

        const { error } = await supabase
          .from("ai_prompts")
          .update(updateData)
          .eq("prompt_key", promptKey);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_prompts")
          .insert({
            prompt_key: promptKey,
            prompt_text: promptText,
            description: descriptionMap[promptKey] || "Blog pipeline prompt",
            model_id: modelId || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, { promptKey }) => {
      queryClient.invalidateQueries({ queryKey: ["ai-prompt", promptKey] });
      toast.success("Prompt opgeslagen");
    },
    onError: (error) => {
      console.error("Error updating blog prompt:", error);
      toast.error("Kon prompt niet opslaan");
    },
  });
}
