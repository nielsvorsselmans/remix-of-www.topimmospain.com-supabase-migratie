import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Types ───────────────────────────────────────────────────────────

interface GenerateRequest {
  step: 'brainstorm' | 'write' | 'rewrite-section';
  idea?: string;
  category?: string;
  source_type?: 'idea' | 'insight' | 'tension' | 'feedback' | 'question';
  source_data?: any;
  insight_id?: string;
  tension_id?: string;
  context?: BlogContext;
  briefing?: BriefingResult;
  section_index?: number;
  section_instruction?: string;
  full_content?: any;
  source_context?: SourceContext;
  briefing_id?: string;
  custom_instructions?: string;
}

interface SourceContext {
  answer_fragments?: string[];
  raw_quotes?: string[];
  conversation_notes?: string[];
  persona_instructions?: string[];
  question_id?: string;
  insight_id?: string;
}

interface BlogContext {
  popular_articles?: { title: string; category: string; view_count: number }[];
  missing_topics?: string[];
  existing_titles?: string[];
  tensions?: { tension_title: string; old_belief: string; new_reality: string; emotional_undercurrent: string }[];
  style_dna?: string;
}

interface BriefingResult {
  unique_angle: string;
  emotional_hook: string;
  target_audience: string;
  seo_strategy: {
    primary_keyword: string;
    secondary_keywords: string[];
    search_intent: string;
  };
  article_structure: {
    headline: string;
    subheadline: string;
    sections: { heading: string; purpose: string; key_points: string[] }[];
  };
  differentiation: string;
  tone_notes: string;
  underlying_questions?: string[];
  raw_brainstorm?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[áàäâã]/g, 'a').replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i').replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u').replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').trim().substring(0, 80);
}

function cleanJsonString(str: string): string {
  return str.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

function safeJsonParse(content: string): any {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in AI response");
  let jsonStr = cleanJsonString(jsonMatch[0]);
  try { return JSON.parse(jsonStr); } catch (firstError) {
    jsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    try { return JSON.parse(jsonStr); } catch {
      console.error("JSON parse failed. First 500 chars:", jsonStr.substring(0, 500));
      throw new Error(`Invalid JSON from AI: ${(firstError as Error).message}`);
    }
  }
}

class RateLimitError extends Error { constructor(msg: string) { super(msg); this.name = "RateLimitError"; } }
class PaymentError extends Error { constructor(msg: string) { super(msg); this.name = "PaymentError"; } }

async function callAI(messages: any[], model = "google/gemini-2.5-flash"): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI API error:", response.status, errorText);
    if (response.status === 429) throw new RateLimitError("Rate limit bereikt. Probeer het over een minuut opnieuw.");
    if (response.status === 402) throw new PaymentError("AI-tegoed onvoldoende. Vul je credits aan in Settings → Workspace → Usage.");
    throw new Error(`AI API error: ${response.status}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── DB Prompt Loader ───────────────────────────────────────────────

const DEFAULT_PROMPTS: Record<string, string> = {
  blog_brainstorm: `Je bent de Chief Content Strategist voor Top Immo Spain — een bedrijf dat Nederlandstalige investeerders begeleidt bij vastgoedaankopen in Spanje (Costa Cálida, Costa Blanca, Murcia).

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

Tone of voice: adviserend, warm, menselijk. Niet pushen, maar begeleiden.`,

  blog_writer: `Je bent een expert copywriter voor Top Immo Spain. Je schrijft op basis van een goedgekeurde strategische briefing.

BELANGRIJK: Je schrijft ALTIJD namens "Top Immo Spain" — gebruik NOOIT "Viva Vastgoed" of andere bedrijfsnamen.

Schrijfstijl:
- Adviserend, warm, menselijk — niet pushen, maar begeleiden
- Korte paragrafen (max 4 zinnen)
- Praktische tips en concrete voorbeelden uit de praktijk
- Je/jij-vorm
- Eenvoudige taal zonder vakjargon
- Begin de introductie met een herkenbare situatieschets ("Je zit 's avonds op de bank en scrollt door Funda...")
- Gebruik af en toe een directe vraag aan de lezer om betrokkenheid te creëren

Woordentelling: Schrijf uitgebreide, diepgaande artikelen van 1500-2500 woorden. Werk elke sectie uit met 3-5 paragrafen. Oppervlakkige content scoort niet in Google.

CTA-INSTRUCTIE:
- Sluit ALTIJD af met een sectie "Volgende stap" of vergelijkbaar
- Bied een laagdrempelige vervolgactie: gratis oriëntatiegesprek, toegang tot het portaal, of aanmelding voor een bezichtigingsreis
- Toon: uitnodigend, geen harde verkoop. Voorbeeld: "Wil je weten wat dit voor jouw situatie betekent? Plan een vrijblijvend oriëntatiegesprek met een van onze adviseurs."
- Voeg de CTA toe als een aparte sectie in de JSON output

BELANGRIJK voor JSON:
- Escape alle quotes binnen tekst
- Zorg dat de JSON volledig en geldig is
- Antwoord ALLEEN met JSON`,

  blog_rewrite_section: `Je bent een expert copywriter voor Top Immo Spain. Herschrijf de gegeven sectie volgens de instructie. Behoud de schrijfstijl: warm, adviserend, menselijk, korte paragrafen, je/jij-vorm.`,
};

const DEFAULT_MODELS: Record<string, string> = {
  blog_brainstorm: "google/gemini-2.5-pro",
  blog_writer: "google/gemini-2.5-pro",
  blog_rewrite_section: "google/gemini-2.5-flash",
};

async function loadPromptConfig(promptKey: string): Promise<{ prompt: string; model: string }> {
  try {
    const sb = getSupabaseClient();
    const { data, error } = await sb
      .from('ai_prompts')
      .select('prompt_text, model_id')
      .eq('prompt_key', promptKey)
      .maybeSingle();
    
    if (!error && data) {
      return {
        prompt: data.prompt_text || DEFAULT_PROMPTS[promptKey] || "",
        model: data.model_id || DEFAULT_MODELS[promptKey] || "google/gemini-2.5-flash",
      };
    }
  } catch (e) {
    console.warn(`Could not load prompt config for ${promptKey}:`, e);
  }
  return {
    prompt: DEFAULT_PROMPTS[promptKey] || "",
    model: DEFAULT_MODELS[promptKey] || "google/gemini-2.5-flash",
  };
}

// ─── Deep Context Enrichment ────────────────────────────────────────

function getSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// ─── Pipeline Logging ───────────────────────────────────────────────

async function logPipelineStep(opts: {
  briefing_id?: string;
  step: string;
  model_id?: string;
  prompt_snapshot?: string;
  input_context?: any;
  output_data?: any;
  output_raw?: string;
  version?: number;
}): Promise<void> {
  try {
    const sb = getSupabaseClient();
    await sb.from('content_pipeline_logs').insert({
      briefing_id: opts.briefing_id || null,
      step: opts.step,
      model_id: opts.model_id || null,
      prompt_snapshot: opts.prompt_snapshot?.substring(0, 50000) || null,
      input_context: opts.input_context || null,
      output_data: opts.output_data || null,
      output_raw: opts.output_raw?.substring(0, 100000) || null,
      version: opts.version || 1,
    });
  } catch (e) {
    console.warn('Pipeline logging failed (non-blocking):', e);
  }
}

async function enrichInsightContext(insightId: string): Promise<string> {
  const sb = getSupabaseClient();
  const { data: insight, error: insightErr } = await sb
    .from('insights')
    .select('*')
    .eq('id', insightId)
    .single();

  if (insightErr || !insight) {
    console.error("Could not fetch insight:", insightErr);
    return `KLANTINZICHT (id: ${insightId}) — kon niet worden opgehaald.`;
  }

  const { data: linkedConvos } = await sb
    .from('conversation_insights')
    .select('conversation_id, conversations(anonymized_notes)')
    .eq('insight_id', insightId)
    .limit(3);

  const conversationNotes = (linkedConvos || [])
    .map((ci: any) => ci.conversations?.anonymized_notes)
    .filter(Boolean);

  const parts: string[] = [];

  if (insight.raw_quote) {
    parts.push(`ORIGINELE KLANTSTEM:\n"${insight.raw_quote}"`);
  }

  const insightText = insight.refined_insight || insight.normalized_insight || insight.label;
  const scoreLabel = insight.icp_score ? ` (ICP-score: ${insight.icp_score}/5)` : '';
  parts.push(`GEVALIDEERD INZICHT${scoreLabel}:\n${insightText}`);

  if (insight.icp_persona_match?.length || insight.icp_validation_notes) {
    let icpBlock = 'ICP-VALIDATIE:';
    if (insight.icp_persona_match?.length) icpBlock += `\nPersona's: ${insight.icp_persona_match.join(', ')}`;
    if (insight.icp_validation_notes) icpBlock += `\nNotities: ${insight.icp_validation_notes}`;
    parts.push(icpBlock);
  }

  if (insight.suggested_archetype) {
    const archetypeDescriptions: Record<string, string> = {
      'HOT_TAKE': 'Provocerend standpunt dat aandacht trekt en discussie uitlokt',
      'LEAD_MAGNET': 'Diepgaand, educatief artikel dat als magneet werkt voor oriënterende beleggers',
      'AUTHORITY': 'Expertartikel dat Top Immo Spain positioneert als dé specialist',
      'STORYTELLING': 'Verhaal dat emotie en identificatie oproept bij de lezer',
    };
    const desc = archetypeDescriptions[insight.suggested_archetype] || '';
    parts.push(`CONTENT ARCHETYPE: ${insight.suggested_archetype}${desc ? `\n→ ${desc}` : ''}`);
  }

  if (insight.underlying_questions?.length) {
    parts.push(`ONDERLIGGENDE VRAGEN (direct uit klantgesprekken):\n${insight.underlying_questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}\n\nDeze vragen zijn geëxtraheerd uit echte gesprekken — gebruik ze als basis voor de artikelstructuur.`);
  }

  parts.push(`THEMA: ${insight.theme || 'Onbekend'}\nIMPACT: ${insight.impact_score || 'Onbekend'}`);

  if (conversationNotes.length > 0) {
    parts.push(`GESPREKSCONTEXT (geanonimiseerd):\n${conversationNotes.map((n: string) => `- "${n.substring(0, 200)}${n.length > 200 ? '...' : ''}"`).join('\n')}`);
  }

  if (insight.icp_persona_match?.length) {
    const personaInstructions: Record<string, string> = {
      'Rendementsgerichte Investeerder': 'Focus op cijfers, risicoreductie, juridische zekerheid en concrete ROI.',
      'Genieter-Investeerder': 'Focus op lifestyle, emotie, levenskwaliteit en "de droom tastbaar maken".',
      'Oriënterende Ontdekker': 'Focus op basiskennis, stap-voor-stap uitleg, angstreductie. Vermijd vakjargon.',
    };
    const instructions = insight.icp_persona_match.map((p: string) => personaInstructions[p]).filter(Boolean);
    if (instructions.length) {
      parts.push(`SCHRIJFINSTRUCTIES PER PERSONA:\n${instructions.map((i: string) => `→ ${i}`).join('\n')}`);
    }
  }

  parts.push('Verwerk dit inzicht tot een informatief blogartikel dat de onderliggende vragen van de doelgroep beantwoordt.');
  return parts.join('\n\n');
}

async function enrichTensionContext(tensionId: string): Promise<string> {
  const sb = getSupabaseClient();
  const { data: tension, error: tensionErr } = await sb
    .from('content_tensions')
    .select('*')
    .eq('id', tensionId)
    .single();

  if (tensionErr || !tension) {
    console.error("Could not fetch tension:", tensionErr);
    return `SPANNING (id: ${tensionId}) — kon niet worden opgehaald.`;
  }

  const { data: relatedInsights } = await sb
    .from('insights')
    .select('label, raw_quote, refined_insight, icp_persona_match')
    .eq('theme', tension.category)
    .eq('icp_validated', true)
    .order('icp_score', { ascending: false })
    .limit(3);

  const parts: string[] = [];
  parts.push(`EMOTIONELE SPANNING als startpunt:\nTitel: ${tension.tension_title}\nOude overtuiging: "${tension.old_belief}"\nNieuwe realiteit: "${tension.new_reality}"\nEmotionele onderstroom: ${tension.emotional_undercurrent}\nHaak-invalshoek: ${tension.hook_angle}\nCategorie: ${tension.category}`);

  if (relatedInsights?.length) {
    const voices = relatedInsights
      .filter((i: any) => i.raw_quote)
      .map((i: any) => `- "${i.raw_quote.substring(0, 200)}${i.raw_quote.length > 200 ? '...' : ''}"${i.icp_persona_match?.length ? ` (${i.icp_persona_match.join(', ')})` : ''}`);
    if (voices.length) parts.push(`GERELATEERDE KLANTSTEMMEN (zelfde thema):\n${voices.join('\n')}`);

    const refinedInsights = relatedInsights.filter((i: any) => i.refined_insight).map((i: any) => `- ${i.refined_insight}`);
    if (refinedInsights.length) parts.push(`GERELATEERDE INZICHTEN:\n${refinedInsights.join('\n')}`);
  }

  parts.push('Gebruik deze spanning als kern van het artikel. Valideer eerst het gevoel van de lezer (oude overtuiging) voordat je de perspectief-verschuiving introduceert.');
  return parts.join('\n\n');
}

async function enrichQuestionContext(questionId: string): Promise<string> {
  const sb = getSupabaseClient();

  const { data: question, error: qErr } = await sb
    .from('content_questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (qErr || !question) {
    console.error("Could not fetch question:", qErr);
    return `KLANTVRAAG (id: ${questionId}) — kon niet worden opgehaald.`;
  }

  const { data: answers } = await sb
    .from('question_answers')
    .select('answer_fragment, confidence, conversation_id')
    .eq('content_question_id', questionId)
    .order('confidence', { ascending: false });

  const conversationIds = [...new Set((answers || []).map((a: any) => a.conversation_id).filter(Boolean))];
  let conversationMap = new Map<string, any>();
  if (conversationIds.length > 0) {
    const { data: convos } = await sb
      .from('conversations')
      .select('id, anonymized_notes, buyer_phase, source_type, conversation_richness, crm_lead_id')
      .in('id', conversationIds);
    for (const c of (convos || [])) conversationMap.set(c.id, c);
  }

  const uniqueCustomerIds = new Set(Array.from(conversationMap.values()).map((c: any) => c.crm_lead_id).filter(Boolean));
  const uniqueCustomerCount = uniqueCustomerIds.size;

  let relatedInsights: any[] = [];
  if (question.source_insight_ids?.length) {
    const { data: insights } = await sb
      .from('insights')
      .select('label, raw_quote, refined_insight, impact_score, icp_persona_match, theme')
      .in('id', question.source_insight_ids.slice(0, 5));
    relatedInsights = insights || [];
  }

  let matchingTension: any = null;
  const themes = relatedInsights.map((i: any) => i.theme).filter(Boolean);
  if (themes.length > 0) {
    const { data: tensions } = await sb
      .from('content_tensions')
      .select('tension_title, old_belief, new_reality, emotional_undercurrent, hook_angle')
      .in('category', themes)
      .eq('is_active', true)
      .limit(1);
    matchingTension = tensions?.[0] || null;
  }

  let relatedQuestions: string[] = [];
  const { data: rqs } = await sb
    .from('content_questions')
    .select('question')
    .neq('id', questionId)
    .eq('search_intent', question.search_intent)
    .order('frequency', { ascending: false })
    .limit(5);
  relatedQuestions = (rqs || []).map((q: any) => q.question);

  const parts: string[] = [];
  parts.push(`KLANTVRAAG: "${question.question}"`);

  const phases = question.buyer_phases || [];
  if (phases.length > 0) {
    const phaseDescriptions: Record<string, string> = {
      'ORIENTATIE': 'klanten stellen dit in de allereerste verkenningsfase',
      'VERGELIJKING': 'klanten vragen dit als ze actief opties vergelijken',
      'BESLISSING': 'klanten willen dit weten vlak voor een koopbeslissing',
    };
    const phaseWritingInstructions: Record<string, string> = {
      'ORIENTATIE': 'Schrijf toegankelijk en educatief. Vermijd vakjargon. Leg basisconcepten uit en reduceer angst.',
      'VERGELIJKING': 'Bied vergelijkende informatie, concrete cijfers en checklists. Help de lezer opties af te wegen.',
      'BESLISSING': 'Focus op zekerheid, juridische details en concrete stappen. Neem laatste twijfels weg.',
    };
    const phaseDescs = phases.map((p: string) => phaseDescriptions[p] || p).join('; ');
    parts.push(`BESLISFASE: ${phases.join(', ')} (${phaseDescs})`);
    const writeInstr = phases.map((p: string) => phaseWritingInstructions[p]).filter(Boolean);
    if (writeInstr.length) parts.push(`SCHRIJFSTIJL PER FASE:\n${writeInstr.map((i: string) => `→ ${i}`).join('\n')}`);
  }

  if (question.frequency && question.frequency > 1) parts.push(`FREQUENTIE: ${question.frequency}× gevraagd in klantgesprekken — dit is een veelgestelde vraag`);
  parts.push(`ZOEKINTENTIE: ${question.search_intent}`);
  if (uniqueCustomerCount > 1) parts.push(`BEREIK: ${uniqueCustomerCount} verschillende klanten stelden deze vraag — dit is een breed gedeelde informatiebehoefte.`);

  if (answers && answers.length > 0) {
    const sortedAnswers = [...answers].sort((a: any, b: any) => {
      const richA = a.conversation_id ? (conversationMap.get(a.conversation_id)?.conversation_richness || 0) : 0;
      const richB = b.conversation_id ? (conversationMap.get(b.conversation_id)?.conversation_richness || 0) : 0;
      if (richA >= 3 && richB < 3) return -1;
      if (richB >= 3 && richA < 3) return 1;
      return (b.confidence || 0) - (a.confidence || 0);
    });

    const answerLines = sortedAnswers.map((a: any, i: number) => {
      const convo = a.conversation_id ? conversationMap.get(a.conversation_id) : null;
      const richness = convo?.conversation_richness || 0;
      const richnessLabel = richness >= 3 ? ' ⭐ rijk gesprek' : '';
      let line = `${i + 1}. [Confidence ${a.confidence}/5${richnessLabel}] "${a.answer_fragment}"`;
      if (convo) {
        const phaseLabel = convo.buyer_phase ? `, fase ${convo.buyer_phase}` : '';
        const notePreview = (richness >= 3 && convo.anonymized_notes)
          ? convo.anonymized_notes.substring(0, 200) + (convo.anonymized_notes.length > 200 ? '...' : '')
          : (convo.anonymized_notes ? convo.anonymized_notes.substring(0, 100) + '...' : null);
        line += `\n   → Bron: ${convo.source_type} gesprek${phaseLabel}`;
        if (notePreview) line += `\n   → Context: "${notePreview}"`;
      }
      return line;
    });
    parts.push(`BEWEZEN ANTWOORDEN (uit ${conversationIds.length} gesprek${conversationIds.length !== 1 ? 'ken' : ''}):\n${answerLines.join('\n')}`);
  }

  if (relatedQuestions.length > 0) parts.push(`GERELATEERDE KLANTVRAGEN (zelfde zoekintentie):\n${relatedQuestions.map(q => `- "${q}"`).join('\n')}`);

  if (relatedInsights.length > 0) {
    const insightLines = relatedInsights.map((i: any) => {
      let line = `- "${i.refined_insight || i.label}" (Impact: ${i.impact_score || 'Onbekend'})`;
      if (i.raw_quote) line += `\n  Klantstem: "${i.raw_quote.substring(0, 150)}${i.raw_quote.length > 150 ? '...' : ''}"`;
      if (i.icp_persona_match?.length) line += `\n  Persona's: ${i.icp_persona_match.join(', ')}`;
      return line;
    });
    parts.push(`GERELATEERDE INZICHTEN:\n${insightLines.join('\n')}`);

    const allPersonas = [...new Set(relatedInsights.flatMap((i: any) => i.icp_persona_match || []))];
    if (allPersonas.length > 0) {
      const personaInstructions: Record<string, string> = {
        'Rendementsgerichte Investeerder': 'Focus op cijfers, risicoreductie, juridische zekerheid en concrete ROI.',
        'Genieter-Investeerder': 'Focus op lifestyle, emotie, levenskwaliteit en "de droom tastbaar maken".',
        'Oriënterende Ontdekker': 'Focus op basiskennis, stap-voor-stap uitleg, angstreductie. Vermijd vakjargon.',
      };
      const instructions = allPersonas.map(p => personaInstructions[p]).filter(Boolean);
      if (instructions.length) parts.push(`SCHRIJFINSTRUCTIES PER PERSONA:\n${instructions.map(i => `→ ${i}`).join('\n')}`);
    }
  }

  if (matchingTension) {
    parts.push(`EMOTIONELE SPANNING (gebruik als invalshoek):\n→ Oude overtuiging: "${matchingTension.old_belief}"\n→ Nieuwe realiteit: "${matchingTension.new_reality}"\n→ Emotionele onderstroom: ${matchingTension.emotional_undercurrent}\n→ Haak: ${matchingTension.hook_angle}`);
  }

  const { data: existingBlogs } = await sb
    .from('blog_posts')
    .select('title, summary, category, slug')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(5);

  if (existingBlogs && existingBlogs.length > 0) {
    const blogLines = existingBlogs.map((b: any) =>
      `- "${b.title}" (${b.category})${b.summary ? `: ${b.summary.substring(0, 100)}...` : ''}`
    );
    parts.push(`BESTAANDE ARTIKELEN OVER DIT THEMA (vermijd overlap, bied een unieke invalshoek):\n${blogLines.join('\n')}`);
  }

  parts.push('Verwerk deze vraag en alle beschikbare context tot een informatief blogartikel. Structureer en verrijk de bewezen antwoorden — verzin geen informatie die niet uit de bronnen komt.');
  return parts.join('\n\n');
}

// ─── Stage 1: Brainstorm ────────────────────────────────────────────

function buildSourceDescription(source_type: string, source_data: any, idea: string): string {
  if (source_type === 'insight' && source_data) {
    return `KLANTINZICHT als startpunt:\nLabel: ${source_data.label}\nInzicht: ${source_data.normalized_insight || source_data.refined_insight}\nThema: ${source_data.theme}\nImpact: ${source_data.impact_score}\n\nVerwerk dit inzicht tot een informatief blogartikel.`;
  }
  if (source_type === 'tension' && source_data) {
    return `EMOTIONELE SPANNING als startpunt:\nTitel: ${source_data.tension_title}\nOude overtuiging: ${source_data.old_belief}\nNieuwe realiteit: ${source_data.new_reality}\nEmotionele onderstroom: ${source_data.emotional_undercurrent}\nHaak-invalshoek: ${source_data.hook_angle}\n\nGebruik deze spanning als kern van het artikel.`;
  }
  if (source_type === 'feedback' && source_data) {
    return `LEZERSFEEDBACK als startpunt:\nGevraagd topic: ${source_data.topic}\nContext: ${source_data.context || 'Lezers missen informatie over dit onderwerp'}\n\nSchrijf een artikel dat deze informatiebehoefte invult.`;
  }
  if (source_type === 'question' && source_data) {
    const parts = [`KLANTVRAAG als startpunt:\nVraag: "${source_data.question}"`];
    if (source_data.answer_fragments?.length) {
      parts.push(`\nBEWEZEN ANTWOORDEN uit echte klantgesprekken (gebruik deze als expertkennis):`);
      source_data.answer_fragments.forEach((f: string, i: number) => { parts.push(`${i + 1}. ${f}`); });
      parts.push(`\nDeze antwoorden komen uit echte adviesgesprekken — structureer en verrijk ze tot een volledig artikel. Verzin geen informatie die niet in de antwoorden staat.`);
    }
    return parts.join('\n');
  }
  return `IDEE: ${idea}`;
}

async function fetchSeoResearch(keyword: string): Promise<any | null> {
  try {
    const SUPABASE_URL_ENV = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL_ENV || !SUPABASE_ANON_KEY) return null;

    const response = await fetch(`${SUPABASE_URL_ENV}/functions/v1/seo-keyword-research`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyword, language_code: 'nl', location_code: 2528 }),
    });

    if (!response.ok) {
      console.warn(`SEO research failed for "${keyword}":`, response.status);
      const text = await response.text();
      console.warn(text);
      return null;
    }

    return await response.json();
  } catch (e) {
    console.warn('SEO research call failed:', e);
    return null;
  }
}

function buildSeoContextBlock(seoData: any): string {
  if (!seoData) return '';

  const parts: string[] = [];
  const kd = seoData.keyword_data;
  if (kd) {
    const volLabel = kd.search_volume !== null ? `${kd.search_volume}/maand` : 'onbekend';
    const compLabel = kd.competition_level || (kd.competition !== null ? (kd.competition < 0.3 ? 'laag' : kd.competition < 0.7 ? 'middel' : 'hoog') : 'onbekend');
    const cpcLabel = kd.cpc !== null ? `€${kd.cpc.toFixed(2)}` : 'onbekend';
    parts.push(`- Zoekvolume "${kd.keyword}": ${volLabel} (concurrentie: ${compLabel}, CPC: ${cpcLabel})`);
  }

  if (seoData.serp_results?.length > 0) {
    parts.push(`\nTop concurrenten op dit keyword:`);
    seoData.serp_results.forEach((sr: any, i: number) => {
      parts.push(`  ${i + 1}. "${sr.title}" — ${sr.snippet?.substring(0, 120) || ''}${sr.snippet?.length > 120 ? '...' : ''}`);
    });
  }

  if (seoData.related_keywords?.length > 0) {
    const kwList = seoData.related_keywords
      .filter((k: any) => k.search_volume !== null)
      .slice(0, 8)
      .map((k: any) => `${k.keyword} (${k.search_volume}/m)`)
      .join(', ');
    if (kwList) parts.push(`\nGerelateerde zoektermen met bewezen volume: ${kwList}`);
  }

  if (parts.length === 0) return '';
  return `\n\nSEO MARKTDATA (DataForSEO):\n${parts.join('\n')}\n\nGebruik deze data om:\n- De headline te differentiëren van bestaande zoekresultaten\n- Secundaire keywords te kiezen met bewezen zoekvolume\n- De artikelstructuur af te stemmen op de zoekintentie`;
}

async function brainstorm(req: GenerateRequest): Promise<any> {
  let sourceDesc: string;

  if (req.source_type === 'insight' && req.insight_id) {
    sourceDesc = await enrichInsightContext(req.insight_id);
  } else if (req.source_type === 'tension' && req.tension_id) {
    sourceDesc = await enrichTensionContext(req.tension_id);
  } else if (req.source_type === 'question' && req.source_data?.question_id) {
    sourceDesc = await enrichQuestionContext(req.source_data.question_id);
  } else {
    sourceDesc = buildSourceDescription(req.source_type || 'idea', req.source_data, req.idea || '');
  }

  const ctx = req.context || {};
  const contextBlock = [
    ctx.popular_articles?.length ? `\nPOPULAIRE ARTIKELEN (top ${ctx.popular_articles.length}):\n${ctx.popular_articles.map(a => `- "${a.title}" (${a.category}, ${a.view_count} views)`).join('\n')}` : '',
    ctx.missing_topics?.length ? `\nGEVRAAGDE TOPICS door lezers:\n${ctx.missing_topics.map(t => `- ${t}`).join('\n')}` : '',
    ctx.existing_titles?.length ? `\nBESTAANDE ARTIKELEN (vermijd overlap):\n${ctx.existing_titles.map(t => `- ${t}`).join('\n')}` : '',
    ctx.tensions?.length ? `\nBESCHIKBARE SPANNINGEN voor invalshoek:\n${ctx.tensions.map(t => `- "${t.tension_title}": ${t.old_belief} → ${t.new_reality} (${t.emotional_undercurrent})`).join('\n')}` : '',
    ctx.style_dna ? `\nSTIJL DNA:\n${ctx.style_dna}` : '',
  ].filter(Boolean).join('\n');

  // Load configurable prompt + model from DB
  const config = await loadPromptConfig('blog_brainstorm');

  const customInstructionsBlock = req.custom_instructions
    ? `\n\nAANVULLENDE INSTRUCTIES VAN DE REDACTEUR:\n${req.custom_instructions}\n\nVerwerk deze instructies in je briefing — ze hebben voorrang op standaard aannames.`
    : '';

  const userPrompt = `${sourceDesc}

Categorie: ${req.category || 'Algemeen'}
${contextBlock}${customInstructionsBlock}

Genereer een strategische briefing als JSON:
{
  "underlying_questions": [
    "Vraag 1 die de doelgroep zou stellen",
    "Vraag 2 over zorgen of twijfels",
    "..."
  ],
  "unique_angle": "Wat maakt dit artikel uniek t.o.v. concurrenten?",
  "emotional_hook": "Welk gevoel/spanning trekt de lezer aan?",
  "target_audience": "Welk persona spreek je primair aan en waarom?",
  "suggested_category": "De best passende categorie voor dit artikel (Aankoopproces, Financiering, Regio-informatie, Veelgestelde vragen, Juridisch, Fiscaliteit, Rendement, Lifestyle, of Algemeen)",
  "seo_strategy": {
    "primary_keyword": "Hoofdzoekwoord",
    "secondary_keywords": ["zoekwoord2", "zoekwoord3"],
    "search_intent": "informational/navigational/transactional"
  },
  "article_structure": {
    "headline": "Krachtige titel (max 60 karakters)",
    "subheadline": "Ondertitel die de invalshoek verduidelijkt",
    "sections": [
      {
        "heading": "Sectiekop",
        "purpose": "Wat bereikt deze sectie?",
        "key_points": ["punt 1", "punt 2"]
      }
    ]
  },
  "differentiation": "Waarom is dit artikel beter dan wat er al bestaat?",
  "tone_notes": "Specifieke toontips voor dit artikel"
}

Genereer 5-7 underlying_questions die de ECHTE zorgen van de doelgroep weerspiegelen. Genereer 4-6 secties die deze vragen beantwoorden. Focus op praktische waarde voor Nederlandse investeerders.`;

  const content = await callAI([
    { role: "system", content: config.prompt },
    { role: "user", content: userPrompt },
  ], config.model);

  const parsed = safeJsonParse(content);
  parsed.raw_brainstorm = content;

  // ─── SEO Research Enrichment ──────────────────────────────────
  const primaryKeyword = parsed.seo_strategy?.primary_keyword;
  if (primaryKeyword && primaryKeyword.length >= 2) {
    console.log(`Fetching SEO research for keyword: "${primaryKeyword}"`);
    const seoData = await fetchSeoResearch(primaryKeyword);
    if (seoData) {
      parsed.seo_research = seoData;
      console.log(`SEO data attached: vol=${seoData.keyword_data?.search_volume}, ${seoData.related_keywords?.length || 0} related, ${seoData.serp_results?.length || 0} SERP`);

      // ─── Competitive Position Analysis ──────────────────────────
      if (seoData.serp_results?.length > 0) {
        try {
          console.log('Running competitive position analysis...');
          const serpSummary = seoData.serp_results.map((sr: any, i: number) =>
            `${i + 1}. "${sr.title}" — ${sr.snippet?.substring(0, 200) || 'Geen snippet'}`
          ).join('\n');

          const competitivePrompt = `Analyseer deze top ${seoData.serp_results.length} Google zoekresultaten voor het keyword "${primaryKeyword}":

${serpSummary}

Context: Top Immo Spain is een bedrijf dat Nederlandstalige investeerders begeleidt bij vastgoedaankopen in Spanje. Het artikel dat we gaan schrijven heeft deze invalshoek: ${parsed.unique_angle || 'nog niet bepaald'}

Geef je analyse als JSON:
{
  "content_gaps": [
    "Wat missen de bestaande resultaten? Noem 3-5 concrete gaps"
  ],
  "competitive_advantage": "Eén krachtige zin over hoe Top Immo Spain zich kan onderscheiden",
  "positioning_tip": "Concrete schrijftip om beter te scoren dan deze concurrenten"
}`;

          const compAnalysis = await callAI([
            { role: "system", content: "Je bent een SEO content strateeg. Analyseer concurrerende zoekresultaten en identificeer kansen. Antwoord ALLEEN met JSON." },
            { role: "user", content: competitivePrompt },
          ], "google/gemini-2.5-flash");

          const compParsed = safeJsonParse(compAnalysis);
          parsed.seo_research.competitive_analysis = compParsed;
          console.log(`Competitive analysis complete: ${compParsed.content_gaps?.length || 0} gaps identified`);
        } catch (e) {
          console.warn('Competitive analysis failed (non-blocking):', e);
        }
      }
    }
  }

  return parsed;
}

// ─── Stage 2: Write ─────────────────────────────────────────────────

async function writeArticle(briefing: BriefingResult, category: string, sourceContext?: SourceContext): Promise<any> {
  const underlyingQuestionsBlock = briefing.underlying_questions?.length
    ? `\nONDERLIGGENDE VRAGEN VAN DE DOELGROEP (beantwoord deze in het artikel):\n${briefing.underlying_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : '';

  // Build source evidence block from source_context
  let sourceEvidenceBlock = '';
  if (sourceContext) {
    const parts: string[] = [];
    if (sourceContext.answer_fragments?.length) {
      parts.push(`BEWEZEN ANTWOORDEN (gebruik als feitelijke basis — verzin GEEN informatie die hier niet in staat):\n${sourceContext.answer_fragments.map((f, i) => `${i + 1}. ${f}`).join('\n')}`);
    }
    if (sourceContext.raw_quotes?.length) {
      parts.push(`ORIGINELE KLANTSTEMMEN (verwerk als citaten of parafraseer):\n${sourceContext.raw_quotes.map(q => `- "${q}"`).join('\n')}`);
    }
    if (sourceContext.conversation_notes?.length) {
      parts.push(`GESPREKSCONTEXT (achtergrond, niet letterlijk overnemen):\n${sourceContext.conversation_notes.map(n => `- ${n.substring(0, 300)}`).join('\n')}`);
    }
    if (sourceContext.persona_instructions?.length) {
      parts.push(`SCHRIJFINSTRUCTIES PER PERSONA:\n${sourceContext.persona_instructions.map(i => `→ ${i}`).join('\n')}`);
    }
    if (parts.length > 0) {
      sourceEvidenceBlock = `\nBRON-CONTEXT (evidence-based schrijven):\n${parts.join('\n\n')}\n`;
    }
  }

  // Load configurable prompt + model from DB
  const config = await loadPromptConfig('blog_writer');

  const sectionsDesc = briefing.article_structure.sections
    .map(s => `## ${s.heading}\nDoel: ${s.purpose}\n${s.key_points.map(p => `- ${p}`).join('\n')}`)
    .join('\n\n');

  // Build SEO context if available in briefing
  const seoResearch = (briefing as any).seo_research;
  const seoBlock = seoResearch ? buildSeoContextBlock(seoResearch) : '';

  const userPrompt = `Schrijf een volledig blogartikel op basis van deze briefing:

TITEL: ${briefing.article_structure.headline}
ONDERTITEL: ${briefing.article_structure.subheadline}
CATEGORIE: ${category}
INVALSHOEK: ${briefing.unique_angle}
EMOTIONELE HAAK: ${briefing.emotional_hook}
DOELGROEP: ${briefing.target_audience}
TOONTIPS: ${briefing.tone_notes}
SEO KEYWORD: ${briefing.seo_strategy.primary_keyword}
${underlyingQuestionsBlock}${sourceEvidenceBlock}${seoBlock}
STRUCTUUR:
${sectionsDesc}

Geef je antwoord als JSON:
{
  "title": "${briefing.article_structure.headline}",
  "intro": "Pakkende introductie van 2-3 zinnen die de emotionele haak gebruikt",
  "summary": "Korte samenvatting voor previews (max 200 karakters)",
  "content": {
    "sections": [
      { "type": "heading", "level": 2, "text": "Sectie titel" },
      { "type": "paragraph", "text": "Paragraaf...", "source_refs": ["label van bronmateriaal"] },
      { "type": "list", "items": ["Item 1", "Item 2"] }
    ]
  },
  "meta_description": "SEO meta beschrijving (max 155 karakters)",
  "meta_keywords": ["${briefing.seo_strategy.primary_keyword}", ${briefing.seo_strategy.secondary_keywords.map(k => `"${k}"`).join(', ')}],
  "seo_bullets": ["Kernpunt 1", "Kernpunt 2", "Kernpunt 3"]
}

Werk elke sectie uit met 3-5 paragrafen. 1500-2500 woorden totaal. Schrijf diepgaand en uitgebreid — oppervlakkige content scoort niet. Bij elke paragraaf die gebaseerd is op bronmateriaal, voeg een "source_refs" array toe. Sluit ALTIJD af met een CTA-sectie (type "heading" + "paragraph") die een laagdrempelige vervolgactie biedt (oriëntatiegesprek, portaal, bezichtigingsreis). Gebruik ALTIJD "Top Immo Spain" als bedrijfsnaam, NOOIT "Viva Vastgoed".`;

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const aiContent = await callAI([
        { role: "system", content: config.prompt },
        { role: "user", content: userPrompt },
      ], config.model);
      const parsed = safeJsonParse(aiContent);
      parsed.slug = generateSlug(parsed.title || briefing.article_structure.headline);
      return parsed;
    } catch (error) {
      lastError = error as Error;
      console.log(`Write attempt ${attempt + 1} failed:`, lastError.message);
    }
  }
  throw lastError || new Error("Failed to write article after retries");
}

// ─── Rewrite section ────────────────────────────────────────────────

async function rewriteSection(sectionIndex: number, instruction: string, fullContent: any): Promise<any> {
  const sections = fullContent?.sections || [];
  const section = sections[sectionIndex];
  if (!section) throw new Error("Section not found");

  // Load configurable prompt + model from DB
  const config = await loadPromptConfig('blog_rewrite_section');

  const userPrompt = `Herschrijf deze sectie:
${JSON.stringify(section)}

Instructie: ${instruction}

Context (omliggende secties):
${sections.slice(Math.max(0, sectionIndex - 1), sectionIndex + 2).map((s: any) => s.text || s.heading || s.items?.join(', ')).join('\n')}

Antwoord met een JSON array van content blokken (zelfde formaat als input):
[
  { "type": "heading", "level": 2, "text": "..." },
  { "type": "paragraph", "text": "..." }
]`;

  const content = await callAI([
    { role: "system", content: config.prompt },
    { role: "user", content: userPrompt },
  ], config.model);

  const parsed = safeJsonParse(content);
  return Array.isArray(parsed) ? parsed : parsed.sections || [parsed];
}

// ─── Main handler ───────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json() as GenerateRequest;
    const { step } = body;

    console.log(`Blog pipeline step: ${step}`);

    let result: any;

    if (step === 'brainstorm') {
      if (!body.idea && !body.source_data && !body.insight_id && !body.tension_id) {
        return new Response(
          JSON.stringify({ error: "Missing idea, source_data, insight_id, or tension_id for brainstorm" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = await brainstorm(body);

      // Log brainstorm step
      await logPipelineStep({
        briefing_id: body.briefing_id,
        step: 'brainstorm',
        model_id: (await loadPromptConfig('blog_brainstorm')).model,
        input_context: { idea: body.idea, category: body.category, source_type: body.source_type, insight_id: body.insight_id, tension_id: body.tension_id, custom_instructions: body.custom_instructions || null },
        output_data: result,
        output_raw: result.raw_brainstorm,
      });

      // If SEO research was fetched, log that too
      if (result.seo_research) {
        await logPipelineStep({
          briefing_id: body.briefing_id,
          step: 'seo_research',
          input_context: { keyword: result.seo_strategy?.primary_keyword },
          output_data: result.seo_research,
        });
      }
    } else if (step === 'write') {
      if (!body.briefing) {
        return new Response(
          JSON.stringify({ error: "Missing briefing for write step" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = await writeArticle(body.briefing, body.category || 'Algemeen', body.source_context);

      // Log write step
      await logPipelineStep({
        briefing_id: body.briefing_id,
        step: 'write',
        model_id: (await loadPromptConfig('blog_writer')).model,
        input_context: { briefing_headline: body.briefing?.article_structure?.headline, category: body.category, has_source_context: !!body.source_context },
        output_data: { title: result.title, slug: result.slug, section_count: result.content?.sections?.length },
        output_raw: JSON.stringify(result).substring(0, 100000),
      });
    } else if (step === 'rewrite-section') {
      if (body.section_index === undefined || !body.section_instruction || !body.full_content) {
        return new Response(
          JSON.stringify({ error: "Missing section_index, section_instruction, or full_content" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      result = { sections: await rewriteSection(body.section_index, body.section_instruction, body.full_content) };

      // Log rewrite step
      await logPipelineStep({
        briefing_id: body.briefing_id,
        step: 'rewrite_section',
        model_id: (await loadPromptConfig('blog_rewrite_section')).model,
        input_context: { section_index: body.section_index, instruction: body.section_instruction },
        output_data: result,
      });
    } else {
      return new Response(
        JSON.stringify({ error: `Invalid step: ${step}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Blog pipeline complete for step:", step);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in generate-blog-content:", error);
    const status = error instanceof RateLimitError ? 429 : error instanceof PaymentError ? 402 : 500;
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
