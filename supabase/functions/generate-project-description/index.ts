import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAnthropicWithTool, MODEL_SONNET } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error("Missing projectId");
    }

    console.log("Generating description for project:", projectId);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project data from local database
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) {
      console.error("Project not found in local database:", projectId);
      throw new Error("Project not found in database. Make sure it has been imported via RedSP sync.");
    }

    console.log("Found project in local database:", project.name);

    // Check if description already exists and is not generic
    if (project.description &&
        !project.description.includes('Automatisch gegenereerd') &&
        project.description.length > 100) {
      console.log("Using existing description for project:", projectId);
      return new Response(
        JSON.stringify({ description: project.description, highlights: project.highlights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all properties for this project from local database
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('project_id', projectId);

    if (!properties || properties.length === 0) {
      console.error("No properties found for project in local database:", projectId);
      throw new Error("No properties found for this project. Make sure properties have been imported via RedSP sync.");
    }

    console.log(`Found ${properties.length} properties in local database for AI generation`);

    // Prepare data for AI
    const city = project.city || properties[0].city;
    const propertyTypes = [...new Set(properties.map((p: any) => p.property_type))];
    const minPrice = Math.min(...properties.map((p: any) => Number(p.price)));
    const maxPrice = Math.max(...properties.map((p: any) => Number(p.price)));
    const totalUnits = properties.length;

    const bedroomRange = {
      min: Math.min(...properties.map((p: any) => p.bedrooms)),
      max: Math.max(...properties.map((p: any) => p.bedrooms))
    };

    // Collect unique features from all properties
    const allFeatures: string[] = [];
    properties.forEach((p: any) => {
      if (p.features && Array.isArray(p.features)) {
        allFeatures.push(...p.features);
      }
    });
    const uniqueFeatures = [...new Set(allFeatures)].slice(0, 10);

    // Collect property descriptions (first 3 most detailed ones)
    const propertyDescriptions = properties
      .filter((p: any) => p.description && p.description.length > 50)
      .sort((a: any, b: any) => (b.description?.length || 0) - (a.description?.length || 0))
      .slice(0, 3)
      .map((p: any) => p.description);

    const prompt = `Schrijf een professionele en aantrekkelijke beschrijving voor een vastgoedproject in ${city}, Spanje.

Details van het project:
- Locatie: ${city}, Spanje
- Types woningen: ${propertyTypes.join(', ')}
- Aantal beschikbare units: ${totalUnits}
- Prijsrange: €${minPrice.toLocaleString('nl-NL')} - €${maxPrice.toLocaleString('nl-NL')}
- Slaapkamers: ${bedroomRange.min} tot ${bedroomRange.max}
- Unieke features: ${uniqueFeatures.join(', ')}

${propertyDescriptions.length > 0 ? `Voorbeelden van pand beschrijvingen uit dit project:
${propertyDescriptions.map((desc, i) => `${i + 1}. ${desc.substring(0, 200)}...`).join('\n')}` : ''}

Schrijf de beschrijving in het Nederlands, tussen 150-250 woorden. Focus op:
1. De unieke voordelen van de locatie ${city}
2. De verschillende woningtypes en hun geschiktheid (zowel voor eigen gebruik als investering)
3. Investeringspotentieel en rendementskansen
4. Lifestyle voordelen en levenskwaliteit
5. De specifieke features die dit project uniek maken

Maak de beschrijving warm, adviserend en menselijk - niet pusherig of verkoperig.

Geef ook 5 korte highlights (max 6 woorden elk) die de belangrijkste voordelen benadrukken.`;

    // Generate description using Anthropic API
    let parsed: { description: string; highlights: string[] };
    try {
      parsed = await callAnthropicWithTool<{ description: string; highlights: string[] }>(
        'Je bent een professionele vastgoedcopywriter gespecialiseerd in Spaanse vastgoedprojecten. Je schrijft altijd warm, adviserend en menselijk - nooit pusherig. Je helpt mensen begrijpen hoe investeren in Spanje werkt.',
        prompt,
        {
          name: 'set_project_description',
          description: 'Sla de gegenereerde projectbeschrijving en highlights op',
          input_schema: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'De volledige projectbeschrijving in het Nederlands (150-250 woorden)'
              },
              highlights: {
                type: 'array',
                items: { type: 'string' },
                description: '5 korte highlights (max 6 woorden elk)'
              }
            },
            required: ['description', 'highlights']
          }
        },
        { model: MODEL_SONNET, maxTokens: 1024 }
      );
    } catch (aiError) {
      console.error('AI API Error:', aiError);

      // Fallback: use best property description
      console.log("AI failed, using property description as fallback");
      const bestProperty = properties
        .filter((p: any) => p.description && p.description.length > 50)
        .sort((a: any, b: any) => (b.description?.length || 0) - (a.description?.length || 0))[0];

      if (bestProperty?.description) {
        const fallbackDescription = bestProperty.description;

        await supabase
          .from('projects')
          .update({ description: fallbackDescription })
          .eq('id', projectId);

        console.log("Saved fallback description to local database");

        return new Response(
          JSON.stringify({ description: fallbackDescription, highlights: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw aiError;
    }

    console.log("Generated description for project:", projectId);

    // Race condition check: verify description wasn't generated by another request
    const { data: recheckProject } = await supabase
      .from('projects')
      .select('description')
      .eq('id', projectId)
      .single();

    if (recheckProject?.description &&
        !recheckProject.description.includes('Automatisch gegenereerd') &&
        recheckProject.description.length > 100) {
      console.log("Description was generated by another request, using that");
      return new Response(
        JSON.stringify({
          description: recheckProject.description,
          highlights: project.highlights || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save to local database
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        description: parsed.description,
        highlights: parsed.highlights || []
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error saving description:', updateError);
      throw updateError;
    }

    console.log("Saved AI-generated description to local database");

    return new Response(
      JSON.stringify({
        description: parsed.description,
        highlights: parsed.highlights
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-project-description:', error);
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
