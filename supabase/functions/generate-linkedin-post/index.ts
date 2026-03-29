import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const isInternalCall = token === supabaseServiceKey;

    if (!isInternalCall) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Unauthorized");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) throw new Error("Admin access required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { step, blog_post_id, title, intro, summary, keywords, slug, briefing, debug, dry_run } = body;

    if (!title || !blog_post_id) {
      throw new Error("Missing required fields: title, blog_post_id");
    }

    // Load custom prompts from ai_prompts table
    const promptKey = step === "write" ? "linkedin_writer" : "linkedin_brainstorm";
    const { data: customPrompt } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", promptKey)
      .maybeSingle();

    if (step === "brainstorm" || !step) {
      return await handleBrainstorm({
        supabase, LOVABLE_API_KEY, customPrompt,
        blog_post_id, title, intro, summary, keywords, slug, debug,
      });
    } else if (step === "write") {
      return await handleWrite({
        supabase, LOVABLE_API_KEY, customPrompt,
        blog_post_id, title, briefing, debug, dry_run,
      });
    } else {
      throw new Error("Invalid step: must be 'brainstorm' or 'write'");
    }
  } catch (e) {
    console.error("generate-linkedin-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── HELPERS ──

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromContent(content: any): string {
  if (typeof content === "string") return stripHtml(content);
  if (Array.isArray(content)) {
    return content.map((block: any) => {
      if (typeof block === "string") return stripHtml(block);
      if (block?.content) return extractTextFromContent(block.content);
      if (block?.text) return stripHtml(block.text);
      return "";
    }).filter(Boolean).join("\n");
  }
  if (content?.content) return extractTextFromContent(content.content);
  return JSON.stringify(content).substring(0, 4000);
}

async function fetchBlogEnrichment(supabase: any, blogPostId: string) {
  // Fetch full blog post with content and source links
  const { data: blogPost } = await supabase
    .from("blog_posts")
    .select("content, source_question_id, source_insight_id")
    .eq("id", blogPostId)
    .maybeSingle();

  if (!blogPost) return { articleText: "", customerQuestion: null, briefingData: null };

  // Extract and truncate article text
  const rawText = extractTextFromContent(blogPost.content);
  const articleText = rawText.substring(0, 8000);

  // Fetch customer question if linked
  let customerQuestion: string | null = null;
  if (blogPost.source_question_id) {
    const { data: question } = await supabase
      .from("content_questions")
      .select("question, search_intent, buyer_phases")
      .eq("id", blogPost.source_question_id)
      .maybeSingle();
    if (question) {
      customerQuestion = question.question;
    }
  }

  // Fetch briefing data if available
  let briefingData: any = null;
  if (blogPost.source_question_id) {
    const { data: briefing } = await supabase
      .from("content_briefings")
      .select("briefing_data")
      .eq("source_question_id", blogPost.source_question_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (briefing?.briefing_data) {
      briefingData = briefing.briefing_data;
    }
  }

  return { articleText, customerQuestion, briefingData };
}

async function fetchRecentLinkedInPosts(supabase: any, limit = 5): Promise<string[]> {
  const { data: recentPosts } = await supabase
    .from("social_posts")
    .select("content")
    .eq("platform", "linkedin")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!recentPosts || recentPosts.length === 0) return [];

  // Extract first line (hook) from each post
  return recentPosts.map((p: any) => {
    const firstLine = (p.content || "").split("\n").find((l: string) => l.trim().length > 0);
    return firstLine?.trim() || "";
  }).filter(Boolean);
}

async function fetchTopPerformingHooks(supabase: any, limit = 3): Promise<{ hook: string; archetype: string; rate: number }[]> {
  try {
    const { data: generations } = await supabase
      .from("social_post_generations")
      .select("social_post_id, briefing_snapshot")
      .eq("step", "write")
      .not("social_post_id", "is", null);

    if (!generations || generations.length === 0) return [];

    const postIds = [...new Set(generations.map((g: any) => g.social_post_id).filter(Boolean))];
    const { data: posts } = await supabase
      .from("social_posts")
      .select("id, likes, comments, impressions")
      .in("id", postIds)
      .eq("status", "published")
      .gt("impressions", 0);

    if (!posts || posts.length === 0) return [];

    const postMap = new Map(posts.map((p: any) => [p.id, p]));

    return generations
      .map((g: any) => {
        const post = postMap.get(g.social_post_id);
        if (!post) return null;
        const rate = (post.likes + post.comments) / post.impressions * 100;
        return {
          hook: g.briefing_snapshot?.selected_hook || "",
          archetype: g.briefing_snapshot?.archetype || "",
          rate,
        };
      })
      .filter((h: any) => h && h.hook)
      .sort((a: any, b: any) => b.rate - a.rate)
      .slice(0, limit);
  } catch (err) {
    console.warn("[generate-linkedin-post] Failed to fetch top hooks:", err);
    return [];
  }
}

// ── BRAINSTORM STEP ──
async function handleBrainstorm({ supabase, LOVABLE_API_KEY, customPrompt, blog_post_id, title, intro, summary, keywords, slug, debug }: any) {
  const keywordList = (keywords || []).slice(0, 5).join(", ");
  const blogUrl = `https://www.topimmospain.com/blog/${slug || ""}`;

  // Fetch enrichment data in parallel
  const [enrichment, recentHooks, topPerformingHooks] = await Promise.all([
    fetchBlogEnrichment(supabase, blog_post_id),
    fetchRecentLinkedInPosts(supabase),
    fetchTopPerformingHooks(supabase),
  ]);

  const defaultSystemPrompt = `Je bent de Chief Marketing Officer van Top Immo Spain — een Nederlands bedrijf dat Nederlandstalige investeerders begeleidt bij vastgoedaankopen in Spanje.

Je taak: analyseer het blogartikel en ontwikkel een STRATEGISCHE BRIEFING voor een LinkedIn post die maximale engagement genereert.

Denk als een CMO:
- Welke hook trekt de meeste aandacht? Bedenk 3 varianten (vraag, stelling, herkenbare situatie)
- Welk post-archetype past het best bij dit onderwerp?
- Welke teaservragen uit het artikel wekken nieuwsgierigheid?
- Welk trigger-woord past bij het onderwerp zodat mensen reageren?
- Welke emotionele invalshoek resoneert met de doelgroep?

Doelgroep: Nederlandstalige investeerders (35-65 jaar) die overwegen vastgoed in Spanje te kopen. Ze zoeken zekerheid, rendement en begeleiding.

BELANGRIJK: Gebruik ALTIJD "Top Immo Spain" als merknaam, NOOIT "Viva Vastgoed".`;

  const systemPrompt = customPrompt?.prompt_text || defaultSystemPrompt;
  const model = customPrompt?.model_id || "google/gemini-2.5-pro";

  // Build enriched user prompt
  let userPrompt = `Analyseer dit blogartikel en maak een strategische LinkedIn briefing:

Titel: ${title}
Intro: ${intro || "Niet beschikbaar"}
Samenvatting: ${summary || "Niet beschikbaar"}
Keywords: ${keywordList || "Niet beschikbaar"}
URL: ${blogUrl}`;

  // Add full article content
  if (enrichment.articleText) {
    userPrompt += `\n\n--- VOLLEDIGE ARTIKELINHOUD ---\n${enrichment.articleText}\n--- EINDE ARTIKEL ---`;
  }

  // Add customer question context
  if (enrichment.customerQuestion) {
    userPrompt += `\n\nKLANTVRAAG-CONTEXT: Dit artikel is geschreven naar aanleiding van de klantvraag: "${enrichment.customerQuestion}"
Gebruik deze klantvraag als inspiratie voor de quote-hook — dit is letterlijk wat klanten vragen.`;
  }

  // Add briefing data (buyer phase, unique angle etc.)
  if (enrichment.briefingData) {
    const bd = enrichment.briefingData;
    const briefingContext = [
      bd.buyer_phase ? `Buyer phase: ${bd.buyer_phase}` : null,
      bd.unique_angle ? `Unieke invalshoek: ${bd.unique_angle}` : null,
      bd.search_intent ? `Zoekintentie: ${bd.search_intent}` : null,
      bd.target_audience ? `Doelgroep: ${bd.target_audience}` : null,
      bd.emotional_hook ? `Emotionele hook: ${bd.emotional_hook}` : null,
    ].filter(Boolean).join("\n");

    if (briefingContext) {
      userPrompt += `\n\nSTRATEGISCHE BRIEFING-CONTEXT:\n${briefingContext}`;
    }
  }

  // Add anti-repetition hooks
  if (recentHooks.length > 0) {
    userPrompt += `\n\nEERDERE LINKEDIN HOOKS (vermijd deze patronen en openingszinnen):
${recentHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}

Zorg dat je hooks ANDERS zijn qua structuur en invalshoek dan bovenstaande.`;
  }

  // Add top performing hooks as learning context
  if (topPerformingHooks.length > 0) {
    userPrompt += `\n\nBEST PRESTERENDE HOOKS (hoge engagement rate — gebruik deze stijlen als inspiratie):
${topPerformingHooks.map((h: any, i: number) => `${i + 1}. "${h.hook}" (archetype: ${h.archetype}, engagement: ${h.rate.toFixed(1)}%)`).join("\n")}

Leer van deze patronen: welk type opening en toon werkt het best bij ons publiek.`;
  }

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "create_linkedin_briefing",
          description: "Create a strategic LinkedIn post briefing",
          parameters: {
            type: "object",
            properties: {
              hook_options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["vraag", "stelling", "situatie"] },
                    text: { type: "string" },
                  },
                  required: ["type", "text"],
                  additionalProperties: false,
                },
                description: "3 hook varianten",
              },
              recommended_archetype: {
                type: "string",
                enum: ["engagement", "authority", "educational"],
                description: "Aanbevolen post-archetype",
              },
              archetype_reasoning: {
                type: "string",
                description: "Waarom dit archetype het best past",
              },
              teaser_questions: {
                type: "array",
                items: { type: "string" },
                description: "4-5 teaservragen uit het artikel",
              },
              trigger_word: {
                type: "string",
                description: "Voorgesteld trigger-woord (bijv. SPANJE, LINK, GIDS)",
              },
              emotional_angle: {
                type: "string",
                description: "De emotionele invalshoek / kernboodschap",
              },
              target_audience_insight: {
                type: "string",
                description: "Wie spreek je aan en waarom",
              },
            },
            required: ["hook_options", "recommended_archetype", "archetype_reasoning", "teaser_questions", "trigger_word", "emotional_angle", "target_audience_insight"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_linkedin_briefing" } },
    }),
  });

  if (!aiResponse.ok) {
    return handleAIError(aiResponse);
  }

  const brainstormEnd = Date.now();
  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Unexpected AI response format");

  const briefingData = JSON.parse(toolCall.function.arguments);

  // Log generation to audit trail
  const brainstormDuration = brainstormEnd - Date.now() + Math.round(Math.random() * 100); // approximate
  try {
    await supabase.from("social_post_generations").insert({
      blog_post_id: blog_post_id,
      step: "brainstorm",
      briefing_snapshot: briefingData,
      prompts_snapshot: { systemPrompt, userPrompt },
      model_used: model,
      raw_ai_response: toolCall.function.arguments,
      enrichment_data: { articleTextLength: enrichment.articleText?.length || 0, customerQuestion: enrichment.customerQuestion, recentHooksCount: recentHooks.length },
    });
  } catch (logErr) {
    console.warn("[generate-linkedin-post] Failed to log brainstorm generation:", logErr);
  }

  const responsePayload: any = {
    step: "brainstorm",
    briefing: briefingData,
  };

  if (debug) {
    responsePayload._debug = {
      systemPrompt,
      userPrompt,
      model,
      enrichment,
      recentHooks,
      rawResponse: toolCall.function.arguments,
    };
  }

  return new Response(JSON.stringify(responsePayload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── WRITE STEP ──
async function handleWrite({ supabase, LOVABLE_API_KEY, customPrompt, blog_post_id, title, briefing, debug, dry_run }: any) {
  if (!briefing) throw new Error("Missing briefing data for write step");

  // Fetch article content for concrete facts
  const enrichment = await fetchBlogEnrichment(supabase, blog_post_id);

  // Load active style examples — filter by chosen archetype first, with mapping, fallback to all
  const chosenArchetype = briefing.archetype || null;
  let styleExamples: any[] = [];

  // Archetype mapping: brainstorm archetypes → style_examples archetypes
  const archetypeMapping: Record<string, string[]> = {
    engagement: ["engagement", "lead_magnet"],
    authority: ["authority"],
    educational: ["educational", "authority"],
  };

  if (chosenArchetype) {
    const searchArchetypes = archetypeMapping[chosenArchetype] || [chosenArchetype];
    
    for (const archetype of searchArchetypes) {
      if (styleExamples.length >= 3) break;
      const { data: filtered } = await supabase
        .from("style_examples")
        .select("content_text, archetype")
        .eq("is_active", true)
        .eq("archetype", archetype)
        .order("created_at", { ascending: false })
        .limit(3 - styleExamples.length);
      if (filtered && filtered.length > 0) {
        styleExamples.push(...filtered);
      }
    }
  }

  // Fallback: if no archetype-specific examples, load any active ones
  if (styleExamples.length === 0) {
    const { data: allExamples } = await supabase
      .from("style_examples")
      .select("content_text, archetype")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3);
    styleExamples = allExamples || [];
  }

  let styleReferenceBlock = "";
  if (styleExamples.length > 0) {
    const exampleTexts = styleExamples.map((ex: any, i: number) => 
      `--- VOORBEELD ${i + 1}${ex.archetype ? ` (${ex.archetype})` : ""} ---\n${ex.content_text}\n---`
    ).join("\n\n");
    styleReferenceBlock = `\n\nREFERENTIE POSTS (imiteer deze stijl EXACT — structuur, ritme, emoji-gebruik, witregels):
${exampleTexts}

Analyseer het patroon in deze voorbeelden en pas het toe op het nieuwe onderwerp.`;
  }

  // ── ARCHETYPE-SPECIFIC STRUCTURE FORMULAS ──
  function getStructureFormula(archetype: string): string {
    switch (archetype) {
      case "authority":
        return `STRUCTUURFORMULE — AUTHORITY (volg dit exact):
1. PRIKKELENDE STELLING: Begin met een contrair standpunt of verrassend inzicht (1 zin, kordaat)
2. CONTEXT: Waarom dit NU relevant is — actuele situatie, trend of nieuwsfeit (1-2 zinnen)
3. EIGEN ERVARING: Onderbouw je standpunt met wat je zelf hebt gezien/meegemaakt in de praktijk
4. 3 CONCRETE INZICHTEN met emoji-bullets (📊 🏠 ⚖️ etc.): Feiten, data of voorbeelden die je punt bewijzen. Witregels tussen bullets.
5. NUANCE: "Maar let op..." — toon dat je het hele plaatje ziet, niet alleen je eigen standpunt
6. CONCLUSIE: Herhaal je standpunt, nu versterkt door de inzichten
7. DIALOOG-CTA: Nodig uit tot gesprek ("Wat is jouw ervaring?" / "Eens of oneens?" / "Herken je dit?")

BELANGRIJK voor Authority:
- Géén trigger-woord CTA ("reageer X en ik stuur...")
- Géén P.S. connectie-reminder
- Géén "stuur ik je toe" beloftes
- De waarde zit in het standpunt zelf, niet in een doorverwijzing`;

      case "educational":
        return `STRUCTUURFORMULE — EDUCATIEF (volg dit exact):
1. HERKENBAAR PROBLEEM: Begin met een misvatting, veelgestelde vraag of veelgemaakte fout (1-2 zinnen)
2. WAARDE-BELOFTE: "Hier is wat je moet weten:" of "Dit zijn de X dingen die écht belangrijk zijn:" (1 zin)
3. 4-5 CONCRETE TIPS met nummering of emoji-bullets (1️⃣ 2️⃣ 3️⃣ of ✅): De kennis zit IN de post — de lezer hoeft nergens op te klikken om waarde te krijgen. Witregels tussen tips.
4. PRAKTIJKVOORBEELD: Een concreet voorbeeld uit eigen ervaring dat tip #1 of #2 illustreert
5. SAMENVATTING: "Onthoud dit:" of "Kort samengevat:" — de kernles in 1-2 zinnen
6. ZACHTE CTA: "Sla deze post op 🔖" of "Wil je meer weten? Stuur me een DM" of link naar het artikel

BELANGRIJK voor Educatief:
- Géén trigger-woord CTA ("reageer X en ik stuur...")
- Géén P.S. connectie-reminder
- De waarde staat VOLLEDIG in de post — de lezer leert direct iets
- Focus op bruikbaarheid, niet op nieuwsgierigheid wekken`;

      default: // engagement
        return `STRUCTUURFORMULE — ENGAGEMENT (volg dit exact):
1. CONTEXT-OPENER: Begin met een actuele situatie/trend die herkenbaar is (1-2 zinnen)
2. QUOTE-HOOK: Gebruik een letterlijke vraag die "ik vaak krijg" → dit toont autoriteit
3. NUANCE-BRIDGE: Positioneer het antwoord als "niet zwart-wit" / "een strategische rekensom" → denker-positionering
4. BREAKDOWN met emoji-bullets (📉 🇪🇸 ⚖️ etc.): 3 concrete punten met thematische emoji's als visuele ankers. Gebruik witregels tussen bullets.
5. AUTORITEITS-PIVOT: "Omdat ik X zo vaak heb gehoord/ontvangen, heb ik Y gedaan/gestructureerd"
6. CHECKLIST-BELOFTE (✅ items): 3 concrete dingen die de lezer ontdekt/leert. Gebruik witregels tussen items.
7. TRIGGER-CTA: "Reageer hieronder met '[TRIGGER-WOORD]' en ik stuur het persoonlijk naar je toe 👇"
8. P.S.-URGENTIE: "(⚠️ P.S. Vergeet niet te connecten, anders kan ik je het niet via een privébericht sturen!)"`;
    }
  }

  function getStructureUserPrompt(archetype: string, briefing: any): string {
    switch (archetype) {
      case "authority":
        return `\n\nSTRUCTUUR:
1. Open met de gekozen hook als prikkelende stelling
2. Onderbouw met eigen ervaring en 3 concrete inzichten
3. Voeg nuance toe ("maar let op...")
4. Sluit af met een uitnodiging tot dialoog — GEEN trigger-woord, GEEN "stuur ik je toe"`;

      case "educational":
        return `\n\nSTRUCTUUR:
1. Open met de gekozen hook (herkenbaar probleem of misvatting)
2. Geef 4-5 concrete tips/stappen — de waarde zit IN de post
3. Voeg een praktijkvoorbeeld toe
4. Sluit af met een samenvatting en zachte CTA (opslaan/DM) — GEEN trigger-woord`;

      default: // engagement
        return `\n\nSTRUCTUUR:
1. Open met de gekozen hook (gebruik de STRUCTUURFORMULE)
2. Bouw op naar de autoriteits-pivot en checklist-belofte
3. Sluit af met: Reageer "${briefing.trigger_word}" en ik stuur je het artikel door 👇
4. Eindig met P.S. connectie-reminder`;
    }
  }

  const chosenArchetypeForFormula = briefing.archetype || "engagement";
  const structureFormula = getStructureFormula(chosenArchetypeForFormula);

  const defaultSystemPrompt = `Je bent een expert LinkedIn copywriter voor Top Immo Spain. Je schrijft op basis van een goedgekeurde strategische briefing.

${structureFormula}

Schrijfstijl:
- Warm, adviserend, menselijk — nooit pusherig of verkoopachtig
- Spreek de lezer direct aan (je/jij)
- Gebruik VEEL witregels — elke zin of bullet op eigen regel
- Korte zinnen met krachtig ritme
- Emoji's zijn thematisch en structureel (niet decoratief)

ADEMRUIMTE-REGELS (KRITIEK):
- Nooit meer dan 2 zinnen achter elkaar zonder witregel
- Elke emoji-bullet staat op een eigen regel, gevolgd door een witregel
- De post moet "scanbaar" zijn op mobiel — veel lucht, korte blokken

EMOTIONELE RODE DRAAD:
- Weef de emotionele invalshoek uit de briefing door de HELE post
- Begin met herkenning ("je kent het gevoel..."), bouw op naar inzicht, en eindig met empowerment
- De lezer moet zich begrepen voelen, niet verkocht

BELANGRIJK:
- Gebruik NOOIT de merknaam "Viva Vastgoed" — gebruik altijd "Top Immo Spain"
- Maximaal 2500 karakters
- Gebruik GEEN hashtags
- Volg de briefing EXACT: gebruik de gekozen hook, het archetype, de geselecteerde teasers${chosenArchetypeForFormula === "engagement" ? " en het trigger-woord" : ""}${styleReferenceBlock}`;

  const systemPrompt = customPrompt?.prompt_text || defaultSystemPrompt;
  const model = customPrompt?.model_id || "google/gemini-2.5-pro";

  let userPrompt = `Schrijf een LinkedIn post op basis van deze goedgekeurde briefing:

Artikel titel: ${title}

BRIEFING:
- Gekozen hook: ${briefing.selected_hook}
- Archetype: ${briefing.archetype}
- Teaservragen: ${(briefing.teaser_questions || []).join("\n  - ")}${chosenArchetypeForFormula === "engagement" ? `\n- Trigger-woord: ${briefing.trigger_word}` : ""}
- Emotionele invalshoek: ${briefing.emotional_angle}
- Doelgroep: ${briefing.target_audience_insight}`;

  // Add full article content for concrete facts
  if (enrichment.articleText) {
    userPrompt += `\n\n--- ARTIKELINHOUD (gebruik concrete feiten en cijfers hieruit) ---\n${enrichment.articleText}\n--- EINDE ARTIKEL ---`;
  }

  // Add customer question for quote-hook inspiration
  if (enrichment.customerQuestion) {
    userPrompt += `\n\nORIGINELE KLANTVRAAG: "${enrichment.customerQuestion}"
Overweeg deze letterlijke klantvraag te gebruiken als inspiratie in de post.`;
  }

  userPrompt += getStructureUserPrompt(chosenArchetypeForFormula, briefing);

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "create_linkedin_post",
          description: "Create a LinkedIn post with content and hashtags",
          parameters: {
            type: "object",
            properties: {
              content: { type: "string", description: "The full LinkedIn post text" },
            },
            required: ["content"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_linkedin_post" } },
    }),
  });

  if (!aiResponse.ok) {
    return handleAIError(aiResponse);
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("Unexpected AI response format");

  const generated = JSON.parse(toolCall.function.arguments);
  let postContent = generated.content || "";
  const hashtags: string[] = [];
  let polishResult: any = null;

  // ── POLISH STEP: Senior Editor pass for formatting & brand style ──
  try {
    // Extract hook (first non-empty line) and CTA (last meaningful paragraph)
    const lines = postContent.split("\n").filter((l: string) => l.trim().length > 0);
    const selectedHook = lines[0] || "";
    
    // Find CTA: look for trigger-word line or last line
    const ctaIndex = lines.findIndex((l: string) => l.includes("👇") || l.toLowerCase().includes("reageer"));
    const draftCta = ctaIndex >= 0 ? lines.slice(ctaIndex).join("\n") : lines[lines.length - 1] || "";
    const draftBody = ctaIndex >= 0 
      ? lines.slice(1, ctaIndex).join("\n") 
      : lines.slice(1, -1).join("\n");

    // Fetch polish prompt settings
    const { data: polishPrompt } = await supabase
      .from("ai_prompts")
      .select("prompt_text, model_id")
      .eq("prompt_key", "senior_editor")
      .maybeSingle();

    const polishModel = polishPrompt?.model_id || "google/gemini-3-flash-preview";

    // Build archetype-specific polish instructions
    const archetypePolishRules: Record<string, string> = {
      authority: `
ARCHETYPE-SPECIFIEKE REGELS (Authority):
- Gebruik GEEN emoji-bullets (📊 🏠 etc.) voor opsommingen — gebruik nummering of streepjes
- Toon is formeel-professioneel, niet casual
- Geen 🟩 status-emoji's
- GEEN trigger-woord CTA of P.S. sectie
- De post moet voelen als een thought leader die zijn standpunt deelt`,
      educational: `
ARCHETYPE-SPECIFIEKE REGELS (Educatief):
- Gebruik nummering (1️⃣ 2️⃣ 3️⃣) of ✅ voor tips — spaarzaam met andere emoji's
- Toon is helder en didactisch
- GEEN trigger-woord CTA of P.S. sectie
- De waarde moet VOLLEDIG in de post staan — niets achter een klik verstoppen
- Eindig met een zachte CTA (opslaan, DM, of link)`,
      engagement: `
ARCHETYPE-SPECIFIEKE REGELS (Engagement):
- Emoji-bullets (📉 🇪🇸 ⚖️ etc.) zijn GEWENST als visuele ankers
- Gebruik '🟩' voor status/thema
- '➡️' of '✅' voor opsommingen, '💡' voor inzichten
- De trigger-CTA ("reageer X") MOET behouden blijven
- P.S. connectie-reminder MOET behouden blijven`,
    };

    const archetypeRules = archetypePolishRules[chosenArchetypeForFormula] || archetypePolishRules.engagement;

    const polishSystemPrompt = polishPrompt?.prompt_text || `Jij bent de Hoofdredacteur van Top Immo Spain.

Je ontvangt een ruwe tekst (draft) en een gekozen opening (hook).

JOUW TAAK:
Smeed deze samen tot één perfect lopende LinkedIn post.

STIJLREGELS (STRICT):

1. HET RITME (Witregels):
   - Schrijf nooit alinea's van meer dan 2 regels.
   - Gebruik veel witregels. LinkedIn is mobiel; witruimte is lucht.
   - Wissel af: Een statement van 1 zin. Dan een blokje van 2 zinnen.

2. SCHRAP WOLLIGHEID (Kill your darlings):
   - Verwijder woorden als: 'eigenlijk', 'in principe', 'zullen', 'worden', 'echter'.
   - Maak zinnen actief.

3. DE CONNECTIE (Hook -> Body):
   - Begin DIRECT met de selected_hook.
   - Zorg dat de eerste zin daarna de belofte van de hook waarmaakt.
   - Verwijder herhalingen.

4. TONE OF VOICE:
   - Kordaat. Zelfverzekerd.
   - Geen HOOFDLETTERS in zinnen.
   - Eindig met de specifieke CTA.
${archetypeRules}

OUTPUT FORMAT:
- Retourneer de complete post als één doorlopende TEKST.
- Begin direct met de hook.
- GEEN JSON of labels.`;

    const polishUserPrompt = `ARCHETYPE: ${chosenArchetypeForFormula}\n\nGESELECTEERDE HOOK:\n${selectedHook}\n\nDRAFT BODY:\n${draftBody}\n\nDRAFT CTA:\n${draftCta}\n\nDOELGROEP: ${briefing.target_audience_insight || "BOTH"}\n\nSmeed dit nu samen tot één perfecte LinkedIn post volgens de ${chosenArchetypeForFormula}-regels.`;

    const polishResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: polishModel,
        messages: [
          { role: "system", content: polishSystemPrompt },
          { role: "user", content: polishUserPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_polished_post",
            description: "Return the polished LinkedIn post as plain text.",
            parameters: {
              type: "object",
              properties: {
                polishedPost: { type: "string", description: "The complete polished LinkedIn post text." },
              },
              required: ["polishedPost"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_polished_post" } },
      }),
    });

    if (polishResponse.ok) {
      const polishData = await polishResponse.json();
      const polishToolCall = polishData.choices?.[0]?.message?.tool_calls?.[0];
      if (polishToolCall?.function?.arguments) {
        const polished = JSON.parse(polishToolCall.function.arguments);
        if (polished.polishedPost) {
          polishResult = { raw: postContent, polished: polished.polishedPost };
          postContent = polished.polishedPost;
          console.log("[generate-linkedin-post] Polish step succeeded");
        }
      }
    } else {
      console.warn("[generate-linkedin-post] Polish step failed, using raw output:", polishResponse.status);
    }
  } catch (polishError) {
    console.warn("[generate-linkedin-post] Polish step error, using raw output:", polishError);
  }

  let postId: string | null = null;

  // ── ARCHETYPE-AWARE PHOTO SELECTION ──
  const archetypePhotoMap: Record<string, string[]> = {
    engagement: ["headshot", "lifestyle"],
    authority: ["speaking", "office"],
    educational: ["location", "office"],
  };
  const postArchetype = briefing?.archetype || null;
  const photoCategories = postArchetype ? archetypePhotoMap[postArchetype] : null;

  let photoQuery = supabase
    .from("linkedin_photo_library")
    .select("id, times_used")
    .eq("is_archived", false)
    .order("is_favorite", { ascending: false })
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .order("times_used", { ascending: true })
    .limit(1);

  if (photoCategories) {
    photoQuery = photoQuery.in("category", photoCategories);
  }

  let { data: selectedPhoto } = await photoQuery.maybeSingle();

  // Fallback: if no photo in archetype categories, pick any
  if (!selectedPhoto && photoCategories) {
    const { data: fallback } = await supabase
      .from("linkedin_photo_library")
      .select("id, times_used")
      .eq("is_archived", false)
      .order("is_favorite", { ascending: false })
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .order("times_used", { ascending: true })
      .limit(1)
      .maybeSingle();
    selectedPhoto = fallback;
  }

  if (selectedPhoto) {
    console.log(`[generate-linkedin-post] Selected photo ${selectedPhoto.id} for archetype "${postArchetype || "none"}"`);
  }

  if (!dry_run) {
    const { data: post, error: insertError } = await supabase
      .from("social_posts")
      .insert({
        platform: "linkedin",
        content: postContent,
        status: "draft",
        blog_post_id: blog_post_id,
        photo_id: selectedPhoto?.id || null,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    postId = post.id;

    // Update photo usage stats
    if (selectedPhoto) {
      await supabase
        .from("linkedin_photo_library")
        .update({
          times_used: (selectedPhoto.times_used || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", selectedPhoto.id);
    }
  }

  // Log write generation to audit trail
  try {
    await supabase.from("social_post_generations").insert({
      blog_post_id: blog_post_id,
      social_post_id: postId || null,
      step: "write",
      briefing_snapshot: briefing,
      prompts_snapshot: { systemPrompt, userPrompt },
      model_used: model,
      raw_ai_response: toolCall.function.arguments,
      polish_result: polishResult?.polished || null,
      enrichment_data: { articleTextLength: enrichment.articleText?.length || 0, customerQuestion: enrichment.customerQuestion, styleExamplesCount: styleExamples.length },
    });
  } catch (logErr) {
    console.warn("[generate-linkedin-post] Failed to log write generation:", logErr);
  }

  const responsePayload: any = {
    step: "write",
    id: postId,
    content: postContent,
    hashtags,
    blog_post_id,
  };

  if (debug) {
    responsePayload._debug = {
      systemPrompt,
      userPrompt,
      model,
      styleExamples,
      rawResponse: toolCall.function.arguments,
      polishResult,
    };
  }

  return new Response(JSON.stringify(responsePayload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAIError(aiResponse: Response) {
  const status = aiResponse.status;
  const errorText = await aiResponse.text();
  if (status === 429) {
    return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === 402) {
    return new Response(JSON.stringify({ error: "Credits op, voeg credits toe aan je workspace." }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  console.error("AI gateway error:", status, errorText);
  throw new Error("AI generatie mislukt");
}
