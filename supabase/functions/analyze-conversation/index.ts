import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_SYSTEM_PROMPT = `Jij bent een Expert Consumentenpsycholoog en Senior Data Analist.

Je analyseert ruwe notities van oriëntatie- en salesgesprekken over vastgoed in Spanje.

HARD REQUIREMENTS:

1) PRIVACY/GDPR: vervang alle herleidbare persoonsgegevens (namen, adressen, telefoonnummers) door placeholders zoals [PERSOON], [ADRES].

2) EXTRACTIE: haal beslissingspsychologie en voice-of-customer taal uit de notities.

3) JSON-ONLY: geef uitsluitend een geldig JSON-object terug.

INPUT:
Rauwe notities van de gebruiker.

OUTPUT FORMAAT (JSON):
{
  "anonymized_notes": "De volledige samenvatting, maar 100% geanonimiseerd.",
  "sentiment": "Enthousiast" | "Twijfelend" | "Bezorgd",
  "buyer_phase": "ORIENTATIE" | "VERGELIJKING" | "BESLISSING",
  "conversation_richness": 1-5,
  "insights": [
    {
      "label": "Korte titel (max 6 woorden)",
      "type": "Angst" | "Verlangen" | "Misvatting" | "Blokkade" | "Quote",
      "theme": "Zie lijst hieronder",
      "subtheme": "Kort kernwoord (hoofdletters)",
      "normalized_insight": "THEMA::SUBTHEME::KERN (Canonical format)",
      "raw_quote": "Letterlijke zin uit de mond van de klant",
      "impact_score": "High" | "Medium" | "Low",
      "extraction_confidence": 1-5,
      "suggested_archetype": "LEAD_MAGNET" | "HOT_TAKE" | "AUTHORITY",
      "underlying_questions": [
        {
          "question": "De echte vraag achter wat de klant zegt",
          "search_intent": "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL",
          "existing_question_id": "UUID van bestaande vraag als die semantisch overeenkomt, anders null"
        }
      ],
      "answer_hints": [
        {
          "question": "De EXACTE vraag-tekst uit underlying_questions waar dit antwoord op slaat",
          "answer_fragment": "Het stuk uit de notities dat antwoord geeft",
          "confidence": 1-5
        }
      ]
    }
  ]
}

BESLISFASE-DETECTIE:
- ORIENTATIE: klant verzamelt informatie, geen concreet plan, "ik kijk eens rond", "misschien over een paar jaar"
- VERGELIJKING: klant vergelijkt actief opties, heeft budget/regio in beeld, "wat is het verschil tussen..."
- BESLISSING: klant wil doorzetten, zoekt bevestiging/laatste antwoorden, "wanneer kan ik tekenen?"

GESPREKRIJKHEID (conversation_richness):
1 = Nauwelijks bruikbare klant-taal, alleen feiten/afspraken
2 = Beperkte context, weinig emotie of motivatie
3 = Redelijke context, enkele directe uitspraken
4 = Rijke context met emoties en duidelijke motivaties
5 = Zeer rijk: directe quotes, emoties, besliscontext, twijfels

EXTRACTION CONFIDENCE per insight (extraction_confidence):
5 = Directe quote aanwezig, duidelijke context
4 = Sterke parafrase, context ondersteunt de conclusie
3 = Afgeleid uit context, geen letterlijke woorden
2 = Interpretatie op basis van beperkte aanwijzingen
1 = Speculatief, minimale basis in de tekst

ZOEKINTENTIE per onderliggende vraag:
- INFORMATIONAL: wil iets leren → past bij blog/gids ("Hoe werkt de notaris in Spanje?")
- COMMERCIAL: vergelijkt opties → past bij vergelijkingsartikel ("Costa Blanca vs Costa Cálida")
- TRANSACTIONAL: wil actie ondernemen → past bij landingspagina/CTA ("Bezichtigingsreis boeken")

Formuleer onderliggende vragen zoals een klant ze in Google zou typen.

CANONICAL FORMAT REGELS:
- Gebruik voor 'theme' UITSLUITEND één van deze categorieën:
  [JURIDISCH, FINANCIEEL, LOCATIE, PROCES, EMOTIE, BOUWTECHNISCH, VERHUUR, BELASTING]

- 'normalized_insight' moet altijd de structuur THEMA::SUBTHEME::KERN hebben.
  Voorbeeld: "JURIDISCH::EIGENDOM::ANGST_KRAKERS"

BESLISREGELS VOOR ARCHETYPE (Volg dit strikt):

1. KIES 'LEAD_MAGNET' ALS:
   - Het inzicht gaat over complexiteit, regels, wetten, berekeningen of processen.
   - De klant zegt: "Hoe werkt dat?", "Ik snap de regels niet", "Wat kost dat?".
   - Thema's: JURIDISCH, FINANCIEEL, BELASTING.

2. KIES 'HOT_TAKE' ALS:
   - Het inzicht gaat over een angst, mythe, vooroordeel of 'kuddegedrag'.
   - De klant zegt: "Ik hoor dat...", "Ik ben bang voor...", "Iedereen zegt...".
   - Thema's: KRAKERS (Juridisch), MARKT TIMING (Financieel), LOCATIE VOOROORDELEN.

3. KIES 'AUTHORITY' ALS:
   - Het inzicht gaat over vertrouwen, emotie, partner-twijfels of de relatie.
   - De klant zegt: "Ik vind het spannend", "Te mooi om waar te zijn", "Mijn gevoel zegt...".
   - Thema's: EMOTIE, PROCES (de menselijke kant), VERHUUR (zorgen).

ANSWER HINTS extractie:
- Zoek in de notities naar stukken tekst die een ANTWOORD geven op een klantvraag.
- Dit zijn expert-uitleg, marktdata, procesinformatie, rendementscijfers, juridische uitleg etc.
- Koppel elk antwoord-fragment aan de meest relevante underlying_question door EXACT dezelfde vraagtekst te gebruiken.
- Geef alleen answer_hints als er daadwerkelijk inhoudelijke antwoorden in de notities staan.
- confidence: 5 = letterlijk citaat, 4 = sterke parafrase, 3 = afgeleid, 2 = interpretatie, 1 = speculatief.

VRAAG-DEDUPLICATIE:
- Je ontvangt een lijst met BESTAANDE VRAGEN (met ID) uit de database.
- Voor elke underlying_question: controleer of deze semantisch overeenkomt met een bestaande vraag.
- Als ja: gebruik het existing_question_id van die bestaande vraag en herformuleer NIET.
- Als nee: zet existing_question_id op null — dit wordt een nieuwe vraag.
- Twee vragen zijn semantisch equivalent als ze over hetzelfde onderwerp gaan, ook als de formulering verschilt.
  Voorbeeld: "Hoe werkt de notaris in Spanje?" ≈ "Wat doet een notaris bij een Spaanse aankoop?"

EXTRACTIE RICHTLIJNEN:
- Vermijd corporate taal. Gebruik woorden die de klant gebruikt.
- Bij 'Quotes': behoud de emotie en ruwheid.
- 'Misvatting': iets dat de klant gelooft maar feitelijk onjuist is.
- 'Blokkade': de echte reden waarom ze vandaag niet beslissen.`;

interface QuestionFromAI {
  question: string;
  search_intent: "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL";
  existing_question_id?: string | null;
}

interface AnswerHintFromAI {
  question: string;
  answer_fragment: string;
  confidence: number;
}

interface InsightFromAI {
  label: string;
  type: string;
  theme: string;
  subtheme: string;
  normalized_insight: string;
  raw_quote: string;
  impact_score: string;
  extraction_confidence: number;
  suggested_archetype: "LEAD_MAGNET" | "HOT_TAKE" | "AUTHORITY";
  underlying_questions: QuestionFromAI[];
  answer_hints?: AnswerHintFromAI[];
}

interface AIResponse {
  anonymized_notes: string;
  sentiment: string;
  buyer_phase: string;
  conversation_richness: number;
  insights: InsightFromAI[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check - require authenticated user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { error: authError } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (authError) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional conversationId
    const body = await req.json().catch(() => ({}));
    const conversationId = body?.conversationId;
    const dryRun = body?.dryRun === true;
    const customPrompt = body?.customPrompt;
    const customModel = body?.customModel;

    // Load prompt from database, fallback to default
    const { data: promptData } = await supabase
      .from('ai_prompts')
      .select('prompt_text, model_id')
      .eq('prompt_key', 'analyze_conversation')
      .single();

    // In dry run mode, allow custom overrides; in production always use stored/default
    const systemPrompt = (dryRun && customPrompt) ? customPrompt : (promptData?.prompt_text || DEFAULT_SYSTEM_PROMPT);
    const modelToUse = (dryRun && customModel) ? customModel : (promptData?.model_id || "google/gemini-2.5-flash");

    // ===== IMPROVEMENT #3: Fetch existing questions for AI-based dedup =====
    const { data: existingQuestions } = await supabase
      .from('content_questions')
      .select('id, question, search_intent')
      .order('frequency', { ascending: false })
      .limit(50);

    const existingQuestionsContext = (existingQuestions && existingQuestions.length > 0)
      ? `\n\nBESTAANDE VRAGEN IN DE DATABASE (gebruik existing_question_id als een nieuwe vraag semantisch overeenkomt):\n${existingQuestions.map((q: any) => `- ID: ${q.id} | "${q.question}" [${q.search_intent}]`).join('\n')}`
      : '';

    // Build query based on whether we're analyzing a specific conversation or all unprocessed
    let query = supabase
      .from('conversations')
      .select('id, raw_notes');

    if (conversationId) {
      if (!dryRun) {
        // Reset processed status for re-analysis (skip in dry run)
        await supabase
          .from('conversations')
          .update({ processed: false, processing_error: null })
          .eq('id', conversationId);
      }
      
      query = query.eq('id', conversationId);
    } else {
      // Existing logic: only unprocessed conversations
      query = query.eq('processed', false).is('processing_error', null);
    }

    const { data: conversations, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch conversations: ${fetchError.message}`);
    }

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No conversations to process", processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${conversations.length} conversation(s) to process`);

    let processedCount = 0;
    let errorCount = 0;

    for (const conversation of conversations) {
      try {
        console.log(`Processing conversation ${conversation.id}`);

        // ===== IMPROVEMENT #2: Re-analysis cleanup =====
        if (!dryRun) {
          // Find question_answers linked to this conversation to decrement frequency
          const { data: existingAnswers } = await supabase
            .from('question_answers')
            .select('content_question_id')
            .eq('conversation_id', conversation.id);

          if (existingAnswers && existingAnswers.length > 0) {
            // Get unique question IDs
            const affectedQuestionIds = [...new Set(existingAnswers.map((a: any) => a.content_question_id))];
            
            // Decrement frequency for each affected question
            for (const qId of affectedQuestionIds) {
              const { data: qRow } = await supabase
                .from('content_questions')
                .select('id, frequency')
                .eq('id', qId)
                .single();
              
              if (qRow) {
                const newFreq = Math.max(0, (qRow.frequency || 1) - 1);
                if (newFreq === 0) {
                  // Remove orphan questions with no frequency
                  await supabase.from('content_questions').delete().eq('id', qId);
                } else {
                  await supabase.from('content_questions').update({ frequency: newFreq }).eq('id', qId);
                }
              }
            }

            // Delete question_answers for this conversation
            await supabase
              .from('question_answers')
              .delete()
              .eq('conversation_id', conversation.id);
          }

          // ===== INSIGHT CLEANUP: prevent duplicates on re-analysis =====
          const { data: linkedInsights } = await supabase
            .from('conversation_insights')
            .select('insight_id')
            .eq('conversation_id', conversation.id);

          if (linkedInsights && linkedInsights.length > 0) {
            for (const link of linkedInsights) {
              // Count how many OTHER conversations reference this insight
              const { count } = await supabase
                .from('conversation_insights')
                .select('*', { count: 'exact', head: true })
                .eq('insight_id', link.insight_id)
                .neq('conversation_id', conversation.id);

              if ((count || 0) === 0) {
                // Orphan insight — only linked to this conversation, delete it
                await supabase.from('insights').delete().eq('id', link.insight_id);
                // Remove dangling reference from content_questions.source_insight_ids
                await supabase.rpc('remove_insight_from_questions', { p_insight_id: link.insight_id });
              } else {
                // Shared insight — decrement frequency
                const { data: insightRow } = await supabase
                  .from('insights')
                  .select('id, frequency')
                  .eq('id', link.insight_id)
                  .single();
                if (insightRow) {
                  await supabase
                    .from('insights')
                    .update({ frequency: Math.max(1, (insightRow.frequency || 1) - 1) })
                    .eq('id', link.insight_id);
                }
              }
            }

            // Delete all conversation_insights links for this conversation
            await supabase
              .from('conversation_insights')
              .delete()
              .eq('conversation_id', conversation.id);
          }
        }

        // Call Lovable AI Gateway with tool calling for structured output
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Analyseer deze notities:\n\n${conversation.raw_notes}${existingQuestionsContext}` }
            ],
            tools: [{
              type: "function",
              function: {
                name: "analyze_conversation",
                description: "Analyseer een gesprek en extraheer geanonimiseerde notities, sentiment, beslisfase, rijkheid en insights",
                parameters: {
                  type: "object",
                  properties: {
                    anonymized_notes: { 
                      type: "string",
                      description: "De volledige samenvatting, maar 100% geanonimiseerd"
                    },
                    sentiment: { 
                      type: "string", 
                      enum: ["Enthousiast", "Twijfelend", "Bezorgd"],
                      description: "Het algemene sentiment van het gesprek"
                    },
                    buyer_phase: {
                      type: "string",
                      enum: ["ORIENTATIE", "VERGELIJKING", "BESLISSING"],
                      description: "De beslisfase waarin de klant zich bevindt"
                    },
                    conversation_richness: {
                      type: "integer",
                      minimum: 1,
                      maximum: 5,
                      description: "Hoe rijk het gesprek is aan bruikbare klantdata (1=nauwelijks, 5=zeer rijk)"
                    },
                    insights: {
                      type: "array",
                      description: "Geëxtraheerde insights uit het gesprek",
                      items: {
                        type: "object",
                        properties: {
                          label: { 
                            type: "string",
                            description: "Korte titel (max 6 woorden)"
                          },
                          type: { 
                            type: "string", 
                            enum: ["Angst", "Verlangen", "Misvatting", "Blokkade", "Quote"],
                            description: "Type insight"
                          },
                          theme: { 
                            type: "string", 
                            enum: ["JURIDISCH", "FINANCIEEL", "LOCATIE", "PROCES", "EMOTIE", "BOUWTECHNISCH", "VERHUUR", "BELASTING"],
                            description: "Hoofdthema"
                          },
                          subtheme: { 
                            type: "string",
                            description: "Kort kernwoord in hoofdletters"
                          },
                          normalized_insight: { 
                            type: "string",
                            description: "Canonical format: THEMA::SUBTHEME::KERN"
                          },
                          raw_quote: { 
                            type: "string",
                            description: "Letterlijke zin uit de mond van de klant"
                          },
                          impact_score: { 
                            type: "string", 
                            enum: ["High", "Medium", "Low"],
                            description: "Impact score van het insight"
                          },
                          extraction_confidence: {
                            type: "integer",
                            minimum: 1,
                            maximum: 5,
                            description: "Betrouwbaarheid van extractie (1=speculatief, 5=directe quote)"
                          },
                          suggested_archetype: {
                            type: "string",
                            enum: ["LEAD_MAGNET", "HOT_TAKE", "AUTHORITY"],
                            description: "Aanbevolen content archetype"
                          },
                          underlying_questions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                question: { 
                                  type: "string",
                                  description: "De vraag zoals een klant die in Google zou typen"
                                },
                                search_intent: {
                                  type: "string",
                                  enum: ["INFORMATIONAL", "COMMERCIAL", "TRANSACTIONAL"],
                                  description: "Type zoekintentie"
                                },
                                existing_question_id: {
                                  type: ["string", "null"],
                                  description: "UUID van een bestaande vraag als deze semantisch overeenkomt, anders null"
                                }
                              },
                              required: ["question", "search_intent"]
                            },
                            description: "1-3 onderliggende vragen met zoekintentie en optioneel existing_question_id"
                          },
                          answer_hints: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                question: {
                                  type: "string",
                                  description: "De EXACTE vraagtekst uit underlying_questions waar dit antwoord op slaat"
                                },
                                answer_fragment: {
                                  type: "string",
                                  description: "Het stuk uit de notities dat antwoord geeft op de vraag"
                                },
                                confidence: {
                                  type: "integer",
                                  minimum: 1,
                                  maximum: 5,
                                  description: "Betrouwbaarheid: 5=letterlijk, 3=afgeleid, 1=speculatief"
                                }
                              },
                              required: ["question", "answer_fragment", "confidence"]
                            },
                            description: "Antwoord-fragmenten uit de notities die klantvragen beantwoorden"
                          }
                        },
                        required: ["label", "type", "theme", "subtheme", "normalized_insight", "raw_quote", "impact_score", "extraction_confidence", "suggested_archetype", "underlying_questions"]
                      }
                    }
                  },
                  required: ["anonymized_notes", "sentiment", "buyer_phase", "conversation_richness", "insights"]
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "analyze_conversation" } }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          if (aiResponse.status === 429) {
            throw new Error("Rate limit bereikt. Probeer het later opnieuw.");
          }
          if (aiResponse.status === 402) {
            throw new Error("Onvoldoende credits. Voeg credits toe aan je workspace.");
          }
          throw new Error(`AI Gateway error: ${aiResponse.status} - ${errorText}`);
        }

        const aiData = await aiResponse.json();
        
        // Extract tool call response
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall || !toolCall.function?.arguments) {
          throw new Error("No tool call response from AI");
        }

        // Parse the AI response
        let parsedResult: AIResponse;
        try {
          parsedResult = JSON.parse(toolCall.function.arguments);
        } catch (parseError) {
          throw new Error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
        }

        // Validate required fields
        if (!parsedResult.anonymized_notes || !parsedResult.sentiment) {
          throw new Error("Missing required fields in AI response");
        }

        // In dry run mode, return the result without saving
        if (dryRun) {
          return new Response(
            JSON.stringify({ dryRunResult: parsedResult }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the conversation with anonymized notes, sentiment, buyer_phase, richness
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            anonymized_notes: parsedResult.anonymized_notes,
            sentiment: parsedResult.sentiment,
            buyer_phase: parsedResult.buyer_phase || null,
            conversation_richness: parsedResult.conversation_richness || null,
            processed: true,
            processing_error: null
          })
          .eq('id', conversation.id);

        if (updateError) {
          throw new Error(`Failed to update conversation: ${updateError.message}`);
        }

        // conversation_insights cleanup already handled in the re-analysis cleanup block above

        // Process each insight
        if (parsedResult.insights && Array.isArray(parsedResult.insights)) {
          for (const insight of parsedResult.insights) {
            try {
              // Extract plain question strings for backward compat
              const questionStrings = (insight.underlying_questions || []).map(q => 
                typeof q === 'string' ? q : q.question
              );

              // Call upsert_insight function
              const { data: insightId, error: upsertError } = await supabase
                .rpc('upsert_insight', {
                  p_label: insight.label,
                  p_type: insight.type,
                  p_raw_quote: insight.raw_quote,
                  p_normalized_insight: insight.normalized_insight,
                  p_impact_score: insight.impact_score,
                  p_theme: insight.theme,
                  p_subtheme: insight.subtheme,
                  p_suggested_archetype: insight.suggested_archetype,
                  p_underlying_questions: questionStrings,
                  p_extraction_confidence: insight.extraction_confidence || null
                });

              if (upsertError) {
                console.error(`Failed to upsert insight: ${upsertError.message}`);
                continue;
              }

              // Store structured questions as jsonb on insight
              if (insightId && insight.underlying_questions?.length) {
                const structuredQuestions = insight.underlying_questions.map(q => 
                  typeof q === 'string' ? { question: q, search_intent: 'INFORMATIONAL' } : q
                );
                await supabase
                  .from('insights')
                  .update({ structured_questions: structuredQuestions })
                  .eq('id', insightId);
              }

              // Link insight to conversation
              if (insightId) {
                const { error: linkError } = await supabase
                  .from('conversation_insights')
                  .insert({
                    conversation_id: conversation.id,
                    insight_id: insightId
                  })
                  .select();

                if (linkError && !linkError.message.includes('duplicate')) {
                  console.error(`Failed to link insight: ${linkError.message}`);
                }
              }

              // ===== IMPROVEMENT #1 + #3: Upsert content_questions with AI-based dedup =====
              // Build a map of question_text → content_question_id for answer_hint linking
              const questionTextToId = new Map<string, string>();

              if (insightId && insight.underlying_questions?.length) {
                for (const q of insight.underlying_questions) {
                  const questionText = typeof q === 'string' ? q : q.question;
                  const searchIntent = typeof q === 'string' ? 'INFORMATIONAL' : q.search_intent;
                  const existingId = (typeof q !== 'string' && q.existing_question_id) ? q.existing_question_id : null;
                  
                  if (existingId) {
                    // AI matched to an existing question — increment frequency and merge metadata
                    const { data: row } = await supabase
                      .from('content_questions')
                      .select('id, source_insight_ids, buyer_phases, frequency')
                      .eq('id', existingId)
                      .single();

                    if (row) {
                      const newInsightIds = Array.from(new Set([...(row.source_insight_ids || []), insightId]));
                      const newPhases = Array.from(new Set([...(row.buyer_phases || []), parsedResult.buyer_phase].filter(Boolean)));
                      await supabase
                        .from('content_questions')
                        .update({
                          frequency: (row.frequency || 1) + 1,
                          source_insight_ids: newInsightIds,
                          buyer_phases: newPhases,
                          search_intent: searchIntent,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', row.id);
                      questionTextToId.set(questionText, row.id);
                    } else {
                      // Fallback: existing_question_id was invalid, treat as new
                      const { data: newQ } = await supabase
                        .from('content_questions')
                        .insert({
                          question: questionText,
                          search_intent: searchIntent,
                          source_insight_ids: [insightId],
                          buyer_phases: parsedResult.buyer_phase ? [parsedResult.buyer_phase] : [],
                          frequency: 1
                        })
                        .select('id')
                        .single();
                      if (newQ) questionTextToId.set(questionText, newQ.id);
                    }
                  } else {
                    // New question — check for exact match first (safety net), then insert
                    const { data: existing } = await supabase
                      .from('content_questions')
                      .select('id, source_insight_ids, buyer_phases, frequency')
                      .ilike('question', questionText)
                      .limit(1);

                    if (existing && existing.length > 0) {
                      const row = existing[0];
                      const newInsightIds = Array.from(new Set([...(row.source_insight_ids || []), insightId]));
                      const newPhases = Array.from(new Set([...(row.buyer_phases || []), parsedResult.buyer_phase].filter(Boolean)));
                      await supabase
                        .from('content_questions')
                        .update({
                          frequency: (row.frequency || 1) + 1,
                          source_insight_ids: newInsightIds,
                          buyer_phases: newPhases,
                          search_intent: searchIntent,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', row.id);
                      questionTextToId.set(questionText, row.id);
                    } else {
                      const { data: newQ } = await supabase
                        .from('content_questions')
                        .insert({
                          question: questionText,
                          search_intent: searchIntent,
                          source_insight_ids: [insightId],
                          buyer_phases: parsedResult.buyer_phase ? [parsedResult.buyer_phase] : [],
                          frequency: 1
                        })
                        .select('id')
                        .single();
                      if (newQ) questionTextToId.set(questionText, newQ.id);
                    }
                  }
                }
              }

              // ===== IMPROVEMENT #1: Store answer_hints via ID instead of text-matching =====
              if (insight.answer_hints?.length) {
                for (const hint of insight.answer_hints) {
                  // First try direct match from our map (same insight's questions)
                  let matchedQuestionId = questionTextToId.get(hint.question);

                  // Fallback: try fuzzy match against all questions we just processed
                  if (!matchedQuestionId) {
                    const hintLower = hint.question.toLowerCase();
                    for (const [text, id] of questionTextToId.entries()) {
                      if (text.toLowerCase() === hintLower) {
                        matchedQuestionId = id;
                        break;
                      }
                    }
                  }

                  // Last resort: query DB by text (for cross-insight answers)
                  if (!matchedQuestionId) {
                    const { data: matchingQ } = await supabase
                      .from('content_questions')
                      .select('id')
                      .ilike('question', hint.question)
                      .limit(1);
                    if (matchingQ && matchingQ.length > 0) {
                      matchedQuestionId = matchingQ[0].id;
                    }
                  }

                  if (matchedQuestionId) {
                    await supabase
                      .from('question_answers')
                      .upsert({
                        content_question_id: matchedQuestionId,
                        conversation_id: conversation.id,
                        answer_fragment: hint.answer_fragment,
                        confidence: hint.confidence || 3,
                      }, { onConflict: 'content_question_id,conversation_id' });
                  } else {
                    console.warn(`Could not match answer_hint to any question: "${hint.question}"`);
                  }
                }
              }
            } catch (insightError) {
              console.error(`Error processing insight: ${insightError}`);
            }
          }
        }

        processedCount++;
        console.log(`Successfully processed conversation ${conversation.id}`);

      } catch (convError) {
        errorCount++;
        const errorMessage = convError instanceof Error ? convError.message : 'Unknown error';
        console.error(`Error processing conversation ${conversation.id}: ${errorMessage}`);
        
        // Log error to the conversation record
        await supabase
          .from('conversations')
          .update({
            processing_error: errorMessage,
            processed: false
          })
          .eq('id', conversation.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Processing complete",
        processed: processedCount,
        errors: errorCount,
        total: conversations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('analyze-conversation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
