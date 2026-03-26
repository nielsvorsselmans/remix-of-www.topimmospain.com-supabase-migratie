import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= HARDCODED PATTERNS =============
// These are the most reliable patterns based on known document naming conventions
const HARDCODED_PATTERNS: { pattern: RegExp; documentType: string }[] = [
  // Prijslijsten / Availability
  { pattern: /disponibilidad/i, documentType: 'prijslijst' },
  { pattern: /pricelist/i, documentType: 'prijslijst' },
  { pattern: /prijslijst/i, documentType: 'prijslijst' },
  { pattern: /precios/i, documentType: 'prijslijst' },
  { pattern: /tarifa/i, documentType: 'prijslijst' },
  { pattern: /price[\s_-]*list/i, documentType: 'prijslijst' },
  { pattern: /lista[\s_-]*de[\s_-]*precios/i, documentType: 'prijslijst' },
  { pattern: /availability/i, documentType: 'prijslijst' },
  
  // Specificaties / Memory de Calidades
  { pattern: /memoria[\s_-]*(de[\s_-]*)?calidades/i, documentType: 'specifications' },
  { pattern: /specifications?/i, documentType: 'specifications' },
  { pattern: /especificacion(es)?/i, documentType: 'specifications' },
  { pattern: /technical[\s_-]*specs/i, documentType: 'specifications' },
  { pattern: /specificatielijst/i, documentType: 'specifications' },
  { pattern: /calidades/i, documentType: 'specifications' },
  
  // Grondplannen / Floor plans
  { pattern: /planos?[\s_-]*(de[\s_-]*)?vivienda/i, documentType: 'floorplan' },
  { pattern: /planos?[\s_-]*(de[\s_-]*)?venta/i, documentType: 'floorplan' },
  { pattern: /floor[\s_-]*plan/i, documentType: 'floorplan' },
  { pattern: /grondplan/i, documentType: 'floorplan' },
  { pattern: /plant(a|as)/i, documentType: 'floorplan' },
  { pattern: /layout/i, documentType: 'floorplan' },
  { pattern: /blueprint/i, documentType: 'floorplan' },
  
  // Elektriciteitsplan (mapped to 'other' as electrical_plan not in DB constraint)
  { pattern: /plano[\s_-]*electrico/i, documentType: 'other' },
  { pattern: /electrical[\s_-]*plan/i, documentType: 'other' },
  { pattern: /elektriciteit/i, documentType: 'other' },
  
  // Betalingsschema / Payment schedule
  { pattern: /calendario[\s_-]*(de[\s_-]*)?pagos/i, documentType: 'payment_schedule' },
  { pattern: /payment[\s_-]*schedule/i, documentType: 'payment_schedule' },
  { pattern: /betalingsschema/i, documentType: 'payment_schedule' },
  { pattern: /forma[\s_-]*(de[\s_-]*)?pago/i, documentType: 'payment_schedule' },
  
  // Contracten
  { pattern: /contrato[\s_-]*(de[\s_-]*)?reserva/i, documentType: 'reservation_contract' },
  { pattern: /reservatiecontract/i, documentType: 'reservation_contract' },
  { pattern: /reservation[\s_-]*contract/i, documentType: 'reservation_contract' },
  { pattern: /contrato[\s_-]*(de[\s_-]*)?compraventa/i, documentType: 'purchase_contract' },
  { pattern: /koopcontract/i, documentType: 'purchase_contract' },
  { pattern: /purchase[\s_-]*contract/i, documentType: 'purchase_contract' },
  
  // Masterplan / Site plan
  { pattern: /masterplan/i, documentType: 'master_plan' },
  { pattern: /site[\s_-]*plan/i, documentType: 'master_plan' },
  { pattern: /ubicacion/i, documentType: 'master_plan' },
  { pattern: /situatieplan/i, documentType: 'master_plan' },
  { pattern: /urbanizacion/i, documentType: 'master_plan' },
  
  // Bankgarantie
  { pattern: /bankgarantie/i, documentType: 'bank_guarantee' },
  { pattern: /bank[\s_-]*guarantee/i, documentType: 'bank_guarantee' },
  { pattern: /garantia[\s_-]*bancaria/i, documentType: 'bank_guarantee' },
  { pattern: /aval[\s_-]*bancario/i, documentType: 'bank_guarantee' },
  
  // Bouwvergunning
  { pattern: /licencia[\s_-]*(de[\s_-]*)?obra/i, documentType: 'building_permit' },
  { pattern: /building[\s_-]*permit/i, documentType: 'building_permit' },
  { pattern: /bouwvergunning/i, documentType: 'building_permit' },
  { pattern: /permiso[\s_-]*(de[\s_-]*)?construccion/i, documentType: 'building_permit' },
  
  // Eigendomsregister
  { pattern: /nota[\s_-]*simple/i, documentType: 'ownership_extract' },
  { pattern: /eigendomsregister/i, documentType: 'ownership_extract' },
  { pattern: /title[\s_-]*deed/i, documentType: 'ownership_extract' },
  
  // Kadastrale fiche
  { pattern: /catastro/i, documentType: 'cadastral_file' },
  { pattern: /ficha[\s_-]*catastral/i, documentType: 'cadastral_file' },
  { pattern: /kadaster/i, documentType: 'cadastral_file' },
  { pattern: /cadastral/i, documentType: 'cadastral_file' },
  
  // Kelderplan
  { pattern: /plano[\s_-]*(de[\s_-]*)?sotano/i, documentType: 'basement_plan' },
  { pattern: /basement[\s_-]*plan/i, documentType: 'basement_plan' },
  { pattern: /kelderplan/i, documentType: 'basement_plan' },
  { pattern: /parking[\s_-]*plan/i, documentType: 'basement_plan' },
  { pattern: /garaje/i, documentType: 'basement_plan' },
  
  // Afmetingenplan
  { pattern: /plano[\s_-]*(de[\s_-]*)?cotas/i, documentType: 'measurement_plan' },
  { pattern: /measurement[\s_-]*plan/i, documentType: 'measurement_plan' },
  { pattern: /afmetingen/i, documentType: 'measurement_plan' },
  { pattern: /dimensiones/i, documentType: 'measurement_plan' },
];

// Valid document types for AI classification (must match DB constraint)
const VALID_DOCUMENT_TYPES = [
  'prijslijst',
  'specifications',
  'floorplan',
  'grondplan',
  'payment_schedule',
  'reservation_contract',
  'purchase_contract',
  'masterplan',
  'bank_guarantee',
  'building_permit',
  'ownership_extract',
  'cadastral_file',
  'basement_plan',
  'measurement_plan',
  'home_plan',
  'other_plan',
  'brochure',
  'andere',
];

interface ClassificationResult {
  type: string;
  confidence: number;
  source: 'hardcoded' | 'learned' | 'ai';
  suggestLearn: boolean;
  matchedPattern?: string;
}

// Check hardcoded patterns
function checkHardcodedPatterns(fileName: string): ClassificationResult | null {
  for (const { pattern, documentType } of HARDCODED_PATTERNS) {
    if (pattern.test(fileName)) {
      return {
        type: documentType,
        confidence: 1.0,
        source: 'hardcoded',
        suggestLearn: false,
        matchedPattern: pattern.source,
      };
    }
  }
  return null;
}

// Check learned patterns from database
async function checkLearnedPatterns(
  supabase: any,
  fileName: string
): Promise<ClassificationResult | null> {
  const { data: mappings, error } = await supabase
    .from('document_type_mappings')
    .select('pattern, document_type, confidence');

  if (error || !mappings) {
    console.log('[classify-document] Error fetching learned patterns:', error);
    return null;
  }

  const lowerFileName = fileName.toLowerCase();

  for (const mapping of mappings) {
    const pattern = mapping.pattern.toLowerCase();
    if (lowerFileName.includes(pattern)) {
      // Update match count
      await supabase
        .from('document_type_mappings')
        .update({ 
          match_count: (mapping.match_count || 0) + 1,
          last_matched_at: new Date().toISOString(),
        })
        .eq('pattern', mapping.pattern);

      return {
        type: mapping.document_type,
        confidence: mapping.confidence || 0.9,
        source: 'learned',
        suggestLearn: false,
        matchedPattern: mapping.pattern,
      };
    }
  }

  return null;
}

// Use AI to classify document
async function classifyWithAI(fileName: string, title?: string): Promise<ClassificationResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('[classify-document] No LOVABLE_API_KEY, returning default');
    return {
      type: 'other',
      confidence: 0.1,
      source: 'ai',
      suggestLearn: false,
    };
  }

  const prompt = `Classificeer dit document op basis van de bestandsnaam en/of titel.

Bestandsnaam: "${fileName}"
${title ? `Titel: "${title}"` : ''}

Kies één van deze types:
- prijslijst (beschikbaarheid, prijzen, tarieven, disponibilidad, pricelist)
- specifications (memoria de calidades, technische specificaties, kwaliteitsomschrijving)
- floor_plan (planos, grondplan, floor plan, plattegrond woning)
- electrical_plan (elektriciteitsplan, plano electrico)
- payment_schedule (betalingsschema, calendario de pagos)
- reservation_contract (reservatiecontract, contrato de reserva)
- purchase_contract (koopcontract, contrato de compraventa)
- master_plan (masterplan, sitemap, projectoverzicht, ubicacion)
- bank_guarantee (bankgarantie, garantia bancaria)
- building_permit (bouwvergunning, licencia de obra)
- ownership_extract (eigendomsregister, nota simple)
- cadastral_file (kadastrale fiche, catastro)
- basement_plan (kelderplan, parkeerplan, plano de sotano)
- measurement_plan (afmetingenplan, plano de cotas)
- home_plan (woningplan, plano de vivienda)
- brochure (commercieel materiaal, marketing)
- other (onbekend of past niet in bovenstaande categorieën)

Antwoord ALLEEN met geldige JSON, geen andere tekst:
{"type": "...", "confidence": 0.9}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Je bent een document classificatie expert. Antwoord alleen met geldige JSON.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[classify-document] AI API error:', response.status, errorText);
      return {
        type: 'other',
        confidence: 0.1,
        source: 'ai',
        suggestLearn: false,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('[classify-document] AI response:', content);

    // Parse JSON from response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonContent);
    const aiType = parsed.type || 'other';
    const aiConfidence = parsed.confidence || 0.5;

    // Validate the type
    const validType = VALID_DOCUMENT_TYPES.includes(aiType) ? aiType : 'other';

    return {
      type: validType,
      confidence: aiConfidence,
      source: 'ai',
      suggestLearn: aiConfidence >= 0.7 && validType !== 'other',
    };
  } catch (err) {
    console.error('[classify-document] AI classification error:', err);
    return {
      type: 'other',
      confidence: 0.1,
      source: 'ai',
      suggestLearn: false,
    };
  }
}

// Save a new learned pattern
async function saveLearnedPattern(
  supabase: any,
  pattern: string,
  documentType: string,
  confidence: number,
  userId?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('document_type_mappings')
    .insert({
      pattern: pattern.toLowerCase().trim(),
      document_type: documentType,
      confidence,
      created_by: userId,
      match_count: 1,
      last_matched_at: new Date().toISOString(),
    });

  if (error) {
    // Check if it's a duplicate key error
    if (error.code === '23505') {
      console.log('[classify-document] Pattern already exists:', pattern);
      return true; // Not an error, pattern already learned
    }
    console.error('[classify-document] Error saving pattern:', error);
    return false;
  }

  console.log('[classify-document] Saved new pattern:', pattern, '->', documentType);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { fileName, title, action, pattern, documentType, confidence, userId } = await req.json();

    // Action: learn - save a new pattern
    if (action === 'learn') {
      if (!pattern || !documentType) {
        return new Response(
          JSON.stringify({ error: 'Missing pattern or documentType' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const success = await saveLearnedPattern(
        supabase,
        pattern,
        documentType,
        confidence || 0.9,
        userId
      );

      return new Response(
        JSON.stringify({ success, message: success ? 'Pattern saved' : 'Failed to save pattern' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: classify (default)
    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing fileName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[classify-document] Classifying:', fileName);

    // Layer 1: Check hardcoded patterns
    const hardcodedResult = checkHardcodedPatterns(fileName);
    if (hardcodedResult) {
      console.log('[classify-document] Hardcoded match:', hardcodedResult.type);
      return new Response(
        JSON.stringify(hardcodedResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Layer 2: Check learned patterns
    const learnedResult = await checkLearnedPatterns(supabase, fileName);
    if (learnedResult) {
      console.log('[classify-document] Learned match:', learnedResult.type);
      return new Response(
        JSON.stringify(learnedResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Layer 3: AI classification
    const aiResult = await classifyWithAI(fileName, title);
    console.log('[classify-document] AI result:', aiResult.type, 'confidence:', aiResult.confidence);

    return new Response(
      JSON.stringify(aiResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[classify-document] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
