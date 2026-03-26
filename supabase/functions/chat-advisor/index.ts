import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserPreferences {
  budget_min?: number;
  budget_max?: number;
  preferred_regions?: string[];
  property_types?: string[];
  investment_goal?: string;
  experience_level?: string;
  timeline?: string;
  project_opinions?: Record<string, any>;
  data_completeness_score?: number;
  call_interest?: string;
  viewed_project_ids?: string[];
}

function analyzeBehaviorPatterns(conversations: any[]): string {
  if (!conversations || conversations.length === 0) {
    return 'Nieuwe gebruiker - geen eerdere gesprekken';
  }
  
  const hasDeclinedCall = conversations.some(
    c => c.metadata?.call_interest === 'declined'
  );
  
  const totalConversations = conversations.length;
  const completedConversations = conversations.filter(c => c.completed_at).length;
  const converted = conversations.some(c => c.converted);
  
  let patterns = `
- Totaal gesprekken: ${totalConversations}
- Afgeronde gesprekken: ${completedConversations}
- Conversie status: ${converted ? 'GECONVERTEERD ✅' : 'Nog niet geconverteerd'}
`;

  if (hasDeclinedCall) {
    patterns += '\n⚠️ BELANGRIJK: Gebruiker heeft eerder call afgewezen - gebruik zachte nurture benadering';
  }
  
  if (totalConversations > 3) {
    patterns += '\n📈 Terugkerende bezoeker - toon expertise en bouw op eerdere gesprekken';
  }
  
  return patterns;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { 
      user_id, 
      visitor_id,
      conversation_id, 
      current_project_id, 
      conversation_goal, 
      last_user_message,
      page_context,
      visitor_type 
    } = body;

    // If user_id is provided, validate JWT and ensure it matches
    if (user_id) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // Enforce: only allow fetching your own data
      if (claimsData.claims.sub !== user_id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Fetch user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();
    
    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', prefError);
    }

    // LAAG 1: Short-term memory - Recent messages
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = recentMessages && recentMessages.length > 0
      ? recentMessages
          .reverse()
          .map(m => `${m.role === 'user' ? 'Gebruiker' : 'Assistent'}: ${m.content}`)
          .join('\n')
      : 'Geen eerdere berichten in dit gesprek';

    // LAAG 2: Medium-term memory - Viewing patterns
    let viewingPatterns = '';
    if (preferences?.viewed_project_ids && preferences.viewed_project_ids.length > 0) {
      const { data: viewedProjects } = await supabase
        .from('projects')
        .select('name, city, region, price_from, price_to')
        .in('id', preferences.viewed_project_ids)
        .limit(10);
      
      if (viewedProjects && viewedProjects.length > 0) {
        const avgPrice = viewedProjects.reduce((sum, p) => sum + ((p.price_from || 0) + (p.price_to || 0)) / 2, 0) / viewedProjects.length;
        const regionCounts = viewedProjects.reduce((acc, p) => {
          acc[p.region || 'Onbekend'] = (acc[p.region || 'Onbekend'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const mostViewedRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        viewingPatterns = `
BEKEKEN PROJECTEN (${viewedProjects.length}):
${viewedProjects.map(p => `- ${p.name} (${p.city}, ${p.region}, €${p.price_from?.toLocaleString()}-€${p.price_to?.toLocaleString()})`).join('\n')}

PATRONEN:
- Gemiddelde prijs bekeken: €${Math.round(avgPrice).toLocaleString()}
- Meest bekeken regio: ${mostViewedRegion}
- Aantal bekeken projecten: ${viewedProjects.length}
`;
      }
    }

    // LAAG 3: Long-term memory - Past conversations
    const { data: pastConversations } = await supabase
      .from('chat_conversations')
      .select('metadata, completed_at, converted, created_at')
      .eq('user_id', user_id)
      .neq('id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const behaviorPatterns = analyzeBehaviorPatterns(pastConversations || []);

    // 2. Fetch project context if available
    let projectContext = null;
    if (current_project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name, city, region, price_from, price_to, display_title')
        .eq('id', current_project_id)
        .single();
      projectContext = project;
    }

    // 3. Calculate data completeness
    const calculateCompleteness = (prefs: UserPreferences | null): number => {
      if (!prefs) return 0;
      let score = 0;
      
      // Essential data (60 points)
      if (prefs.budget_min && prefs.budget_max) score += 20;
      if (prefs.preferred_regions && prefs.preferred_regions.length > 0) score += 20;
      if (prefs.investment_goal) score += 20;
      
      // Additional data (40 points)
      if (prefs.experience_level) score += 10;
      if (prefs.timeline) score += 10;
      if (prefs.property_types && prefs.property_types.length > 0) score += 10;
      if (prefs.project_opinions && Object.keys(prefs.project_opinions).length > 0) score += 5;
      if (prefs.call_interest) score += 5;
      
      return score;
    };

    const completenessScore = calculateCompleteness(preferences);

    // 4. Build AI prompt with context
    const pageContextInfo = page_context ? `
HUIDIGE PAGINA CONTEXT:
- Type: ${page_context.type}
- URL: ${page_context.pageUrl}
- Titel: ${page_context.pageTitle || 'Onbekend'}
${page_context.projectId ? `- Project ID: ${page_context.projectId}` : ''}
${page_context.blogCategory ? `- Blog Categorie: ${page_context.blogCategory}` : ''}
` : 'Geen pagina context';

    const visitorTypeInfo = `
BEZOEKER TYPE: ${visitor_type}
${visitor_type === 'anonymous' ? '→ Focus op account aanmaak na waarde tonen' : ''}
${visitor_type === 'logged_in' ? '→ Focus op lead qualification en videocall booking' : ''}
${visitor_type === 'returning' ? '→ Verwijs naar vorige bezoek, bouw op eerdere interesse' : ''}
`;

    const systemPrompt = `Je bent een slimme vastgoed adviseur voor Top Immo Spain die investeerders helpt met Spaanse vastgoed.

${pageContextInfo}

${visitorTypeInfo}

CONVERSATIE GESCHIEDENIS (laatste berichten):
${conversationHistory}

${viewingPatterns}

GEDRAGSPATRONEN:
${behaviorPatterns}

HUIDIGE GEBRUIKER DATA:
${JSON.stringify(preferences || {}, null, 2)}

DATA VOLLEDIGHEID SCORE: ${completenessScore}%

CURRENT PROJECT CONTEXT:
${projectContext ? JSON.stringify(projectContext, null, 2) : 'Geen specifiek project'}

CONVERSATIE DOEL: ${conversation_goal}

PAGINA-SPECIFIEKE STRATEGIEËN:

HOMEPAGE:
- Start met: "Wat brengt je hier?" 
- Persona detectie (Rendement/Genieten/Oriënteren)
- Route naar relevante content
- Voor anonymous: zachte lead naar account aanmaak

PROJECT PAGINA:
- Start met: "Wat vind je van dit project?" 
- Budget/regio check tegen project specs
- Voor logged-in: direct naar matching en call
- Voor anonymous: toon waarde (exclusieve data) → account CTA

BLOG PAGINA:
- Start met: "Was dit artikel nuttig?"
- Suggereer gerelateerde content
- Voor anonymous: "Bewaar je favoriete artikelen" → account CTA
- Voor logged-in: "Wil je een persoonlijk advies gesprek?"

PORTAAL PAGINA:
- Direct signup prompt met voordelen
- Focus op exclusieve data en matches
- Toon wat ze krijgen (FOMO strategie)

REGIO OPTIES EN URL FORMAAT:
- "Costa Cálida" of "Costa Calida" → database: ['Costa Calida', 'Costa Calida - Inland'] → URL: ?region=costa-calida
- "Costa Blanca Zuid" → database: ['Costa Blanca South', 'Costa Blanca South - Inland'] → URL: ?region=costa-blanca-zuid  
- "Costa Blanca Noord" → database: ['Costa Blanca North', 'Costa Blanca North - Inland'] → URL: ?region=costa-blanca-noord
- "Andere" → geen filter

BELANGRIJK: Bij doorverwijzen naar projecten pagina, gebruik ALTIJD kebab-case URL parameters (costa-calida, costa-blanca-zuid, etc.)

PROJECT MENING OPTIES:
- "😍 Super interessant!" → Direct sterke call-to-action
- "🤔 Ziet er goed uit, wil meer weten" → Zachte call CTA na interesses verzamelen
- "📊 Wil dit vergelijken met andere opties" → Toon 3 matches, dan call voorstel
- "❓ Heb wat vragen over het project" → Beantwoord 1-2 vragen, bied dan call aan
- "🤷 Nog niet zeker, ben aan het oriënteren" → Bied content aan, zachte call later

JOUW TAAK:
1. Analyseer CONVERSATIE GESCHIEDENIS - welke vragen zijn al gesteld?
2. Bekijk BEKEKEN PROJECTEN - wat zegt dit over voorkeuren?
3. Analyseer GEDRAGSPATRONEN - hoe moet je deze gebruiker benaderen?
4. Bepaal de MEEST WAARDEVOLLE volgende vraag die je NOG NIET hebt gesteld
5. Personaliseer de vraag op basis van wat je AL WEET
6. Vermijd HERHALING - stel NOOIT dezelfde vraag 2x
7. Verwijs naar eerdere antwoorden om continuïteit te tonen ("Je zei eerder dat...")
8. Hou het natuurlijk en conversationeel

PRIORITEIT VOLGORDE (gebaseerd op completeness score + project context):

BUDGET STRATEGIE (BELANGRIJK):
- Als budget onbekend → Vraag budget met dynamische ranges gebaseerd op huidig project
- Als budget bekend maar project valt er BUITEN:
  * Voorbeeld: Budget €250k-€350k maar project kost €560k
  * → Vraag: "Ik zie dat je naar [PROJECT NAAM] kijkt vanaf €560k, terwijl je eerder €250k-€350k aangaf. Overweeg je om je budget aan te passen voor dit project?"
  * → Genereer opties: ["Ja, ik overweeg hoger budget", "Nee, toon me projecten binnen mijn budget (Costa Cálida)", "Ik wil meer weten over financieringsmogelijkheden"]
  * → Als gebruiker kiest "Nee, toon me projecten binnen mijn budget":
      - Set should_ask = false
      - Set suggested_actions = ["show_matching_projects"]
      - Return: "Perfect! Ik ga op zoek naar projecten binnen je budget..."
- Als budget bekend en project past erbinnen → SKIP budget vraag volledig

REGIO STRATEGIE:
- Als regio onbekend maar gebruiker zit op project in specifieke regio:
  * → "Ik zie dat je naar [REGIO] kijkt. Is dit je voorkeur regio of ben je ook geïnteresseerd in andere gebieden?"
  * → Genereer opties op basis van huidige regio als eerste optie

Als score < 40%:
  - Budget onbekend → Vraag budget (zie BUDGET STRATEGIE)
  - Budget bekend maar regio onbekend → Vraag regio (zie REGIO STRATEGIE)

Als score 40-60%:
  - Als op project pagina en geen mening → Vraag: "Wat vind je van dit project?"
  - Als investment_goal onbekend → Vraag: "Ben je vooral op zoek naar huurinkomsten, waardestijging, of een combinatie?"

Als score 60-80%:
  - Timeline onbekend → Vraag: "Wat is je tijdlijn?"
  - Experience onbekend → Vraag: "Heb je al eerder in buitenlands vastgoed geïnvesteerd?"

Als score > 80%:
  - Call interest onbekend → Vraag: "Ik heb een goed beeld van je wensen! Zullen we een 30-min videocall inplannen?"
  - Als call al declined → "Wil je dat ik je een overzicht stuur van projecten die perfect passen?"

DYNAMISCHE BUDGET OPTIES GENEREREN:
Als je budget opties moet geven:
1. Check of er een huidig project is (price_from, price_to)
2. Genereer ranges ROND dat project:
   - Als project €560k: ["€400k-€500k", "€500k-€600k", "€600k-€750k", "€750k+"]
   - Als project €250k: ["€150k-€200k", "€200k-€300k", "€300k-€400k", "€400k+"]
3. Als geen project context: ["€150k-€250k", "€250k-€350k", "€350k-€500k", "€500k+"]
4. Leg uit dat binnen projecten verschillende woningtypes met verschillende prijzen zijn

REGELS:
- KRITIEK: Check CONVERSATIE GESCHIEDENIS - als een vraag al gesteld is, stel deze NOOIT opnieuw
- Als gebruiker eerder een antwoord gaf, verwijs daarnaar ("Je noemde €200k-€300k budget...")
- Gebruik bekeken projecten om patronen te herkennen ("Ik zie dat je interesse hebt in Costa Cálida...")
- Respecteer gedragspatronen (bijv. call declination betekent zachte nurture)
- Bouw op eerdere gesprekken ("Vorige keer sprak je over...")
- Maximaal 2-3 zinnen per vraag
- Wees warm, menselijk en adviserend
- Focus op FOMO en vertrouwen opbouwen
- Bij project mening: gebruik emoji opties voor makkelijke selectie
- Genereer ALTIJD relevante 'options' array (2-5 opties) voor elke vraag

LAATSTE BERICHT VAN GEBRUIKER:
${last_user_message || 'Geen recent bericht'}

Bepaal nu de volgende beste vraag of actie.`;

    // 5. Call Lovable AI
    console.log('Calling Lovable AI with completeness score:', completenessScore);
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: last_user_message || 'Bepaal de volgende beste vraag op basis van de context.' }
        ],
        tools: [{
          type: "function",
          function: {
            name: "determine_next_question",
            description: "Bepaal de volgende beste vraag of actie voor de gebruiker",
            parameters: {
              type: "object",
              properties: {
                next_question: { 
                  type: "string",
                  description: "De vraag of boodschap om te tonen aan de gebruiker"
                },
                question_type: { 
                  type: "string",
                  enum: ["budget", "region", "opinion", "timeline", "experience", "investment_goal", "call_booking", "show_matches", "answer_question"],
                  description: "Type vraag of actie"
                },
                reasoning: { 
                  type: "string",
                  description: "Waarom deze vraag of actie (voor debugging)"
                },
                should_ask: { 
                  type: "boolean",
                  description: "Of we een vraag moeten stellen (false = toon matches of beëindig)"
                },
                suggested_actions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Acties die de frontend moet nemen. Mogelijke waarden: ['show_matching_projects', 'enable_call_booking', 'prompt_account_creation', 'show_related_content']. Gebruik 'prompt_account_creation' voor engaged anonymous users, 'show_matching_projects' wanneer gebruiker projecten binnen hun budget wil zien."
                },
                options: {
                  type: "array",
                  items: { type: "string" },
                  description: "VERPLICHT: Antwoord opties voor de gebruiker. Minimaal 2, maximaal 5 opties die passen bij de vraag."
                }
              },
              required: ["next_question", "question_type", "reasoning", "should_ask", "options"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "determine_next_question" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      // Return fallback question based on completeness
      const fallbackResponse = {
        next_question: completenessScore < 40 
          ? "Om je goed te kunnen helpen, wat is ongeveer je budget voor een investering in Spanje?"
          : "Heb je nog specifieke vragen over dit project?",
        question_type: completenessScore < 40 ? "budget" : "answer_question",
        reasoning: "Fallback due to AI error",
        should_ask: true,
        suggested_actions: []
      };
      
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await aiResponse.json();
    const toolCall = result.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }
    
    const decision = JSON.parse(toolCall.function.arguments);
    
    console.log('AI Decision:', decision);
    
    return new Response(JSON.stringify(decision), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in chat-advisor:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      next_question: "Er ging iets mis. Kan ik je op een andere manier helpen?",
      question_type: "answer_question",
      reasoning: "Error fallback",
      should_ask: true,
      suggested_actions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});