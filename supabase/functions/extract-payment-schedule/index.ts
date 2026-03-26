import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url, sale_price } = await req.json();

    if (!file_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing PDF from URL:', file_url);

    // Check file size via HEAD request (optional warning)
    try {
      const headResponse = await fetch(file_url, { method: 'HEAD' });
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        console.log('PDF size:', sizeInMB.toFixed(2), 'MB');
      }
    } catch (headError) {
      console.log('Could not determine file size (HEAD request failed)');
    }

    // Use Lovable AI (Gemini) to extract payment schedule
    // Gemini can process PDFs directly from URL - no download needed!
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Je bent een specialist in het analyseren van Spaanse vastgoedcontracten (koopcontracten/compraventa).
Analyseer dit PDF document en extraheer het betalingsschema.

BELANGRIJK:
- Zoek naar secties over betalingen, "forma de pago", "pagos", "precio", etc.
- Identificeer alle betalingsmomenten (reservatie, aanbetaling, oplevering, etc.)
- Let op bedragen in EUR (€) en percentages
- Spaanse contracten kunnen BTW (IVA) apart vermelden

De totale verkoopprijs is: €${sale_price?.toLocaleString() || 'onbekend'}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: 'Extraheer het betalingsschema uit dit koopcontract. Return een JSON array met alle betalingen.'
              },
              {
                type: 'file',
                file: {
                  url: file_url
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_payments',
              description: 'Extract payment schedule from Spanish real estate contract',
              parameters: {
                type: 'object',
                properties: {
                  payments: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { 
                          type: 'string',
                          description: 'Payment title in Dutch (e.g., "Reservatie", "Aanbetaling 30%", "Sleuteloverdracht")'
                        },
                        amount: { 
                          type: 'number',
                          description: 'Payment amount in EUR'
                        },
                        percentage: { 
                          type: 'number',
                          description: 'Percentage of total price (if applicable)',
                          nullable: true
                        },
                        due_condition: { 
                          type: 'string',
                          description: 'Payment condition in Dutch (e.g., "Bij ondertekening reservatiecontract")'
                        }
                      },
                      required: ['title', 'amount', 'due_condition'],
                      additionalProperties: false
                    }
                  },
                  total_extracted: {
                    type: 'number',
                    description: 'Total amount extracted from all payments'
                  },
                  notes: {
                    type: 'string',
                    description: 'Any additional notes about the payment schedule'
                  }
                },
                required: ['payments', 'total_extracted'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_payments' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Te veel verzoeken, probeer het later opnieuw' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI extractie mislukt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('AI response:', JSON.stringify(aiResponse, null, 2));

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_payments') {
      console.error('No valid tool call in response');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Geen betalingsschema gevonden in het document' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted payments:', extractedData);

    // Validate and clean up the extracted data
    const payments = extractedData.payments.map((p: any, index: number) => ({
      title: p.title || `Betaling ${index + 1}`,
      amount: Number(p.amount) || 0,
      percentage: p.percentage ? Number(p.percentage) : null,
      due_condition: p.due_condition || 'Nader te bepalen',
      order_index: index
    }));

    return new Response(
      JSON.stringify({
        success: true,
        payments,
        total_extracted: extractedData.total_extracted,
        notes: extractedData.notes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-payment-schedule:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Onbekende fout bij extractie' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
