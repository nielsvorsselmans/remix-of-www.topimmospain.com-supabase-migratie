import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MaterialOptionImage {
  id: string;
  image_url: string;
  is_primary: boolean;
}

interface MaterialOption {
  id: string;
  name: string;
  nameTranslated?: string | null; // Spanish translation of option name
  brand: string | null;
  product_code: string | null;
  color_code: string | null;
  description: string | null;
  is_default: boolean;
  price: number | null;
  material_option_images: MaterialOptionImage[];
}

interface MaterialSelection {
  id: string;
  category: string;
  room: string | null;
  title: string;
  titleTranslated?: string | null; // Spanish translation of title
  notes: string | null;
  notesOriginal?: string | null; // Original Dutch notes (for bilingual display)
  customer_visible: boolean;
  chosen_option_id: string | null;
  material_options: MaterialOption[];
}

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  is_primary: boolean;
}

interface SaleData {
  id: string;
  property_description: string | null;
  project: {
    name: string;
    city: string | null;
    featured_image: string | null;
  } | null;
  sale_customers: {
    role: string;
    crm_lead: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  }[];
}

// Translations dictionary
const translations = {
  nl: {
    documentTitle: "Materiaal Selecties",
    generatedOn: "Gegenereerd op",
    summaryTitle: "Samenvatting Materiaal Selecties",
    category: "Categorie",
    selection: "Selectie",
    chosenOption: "Gekozen Optie",
    extraCost: "Meerprijs",
    total: "Totaal meerprijzen",
    approval: "Voor Akkoord",
    approvalText: "Ondergetekende(n) verklaren kennis te hebben genomen van bovenstaande materiaal selecties en gaan hiermee akkoord. Deze selecties vormen onderdeel van de koopovereenkomst.",
    signatureBuyer1: "Handtekening koper 1:",
    signatureBuyer2: "Handtekening koper 2:",
    date: "Datum",
    place: "Plaats",
    notes: "Toelichting",
    chosen: "GEKOZEN",
    default: "Standaard",
    noImage: "Geen afbeelding",
    page: "Pagina"
  },
  es: {
    documentTitle: "Selecciones de Materiales",
    generatedOn: "Generado el",
    summaryTitle: "Resumen de Selecciones de Materiales",
    category: "Categoría",
    selection: "Selección",
    chosenOption: "Opción Elegida",
    extraCost: "Coste Adicional",
    total: "Total costes adicionales",
    approval: "Para Aprobación",
    approvalText: "El/los abajo firmante(s) declaran haber tomado conocimiento de las selecciones de materiales anteriores y estar de acuerdo con las mismas. Estas selecciones forman parte del contrato de compraventa.",
    signatureBuyer1: "Firma comprador 1:",
    signatureBuyer2: "Firma comprador 2:",
    date: "Fecha",
    place: "Lugar",
    notes: "Notas",
    chosen: "ELEGIDO",
    default: "Estándar",
    noImage: "Sin imagen",
    page: "Página"
  }
};

// Category translations NL -> ES
const categoryTranslations: Record<string, string> = {
  'Vloeren': 'Suelos',
  'Keuken': 'Cocina',
  'Badkamer': 'Baño',
  'Tegels': 'Azulejos',
  'Schilderwerk': 'Pintura',
  'Elektra': 'Electricidad',
  'Sanitair': 'Sanitarios',
  'Buitenruimte': 'Exterior',
  'Overig': 'Otros'
};

// Room translations NL -> ES
const roomTranslations: Record<string, string> = {
  'Woonkamer': 'Salón',
  'Slaapkamer': 'Dormitorio',
  'Badkamer': 'Baño',
  'Keuken': 'Cocina',
  'Terras': 'Terraza',
  'Tuin': 'Jardín',
  'Hal': 'Entrada',
  'Toilet': 'Aseo',
  'Garage': 'Garaje',
  'Berging': 'Trastero'
};

// Translate texts using Lovable AI with timeout protection
async function translateTexts(texts: string[], apiKey: string): Promise<string[]> {
  if (!texts.length || !apiKey) return texts;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TRANSLATION_MODEL,
        messages: [
          { 
            role: "system", 
            content: `Vertaal de volgende Nederlandse teksten naar professioneel Spaans.
            Dit zijn materiaal- en productbeschrijvingen voor vastgoed.
            Behoud de technische termen en merknamen indien van toepassing.
            Geef de vertalingen terug als JSON array met exact dezelfde volgorde.
            Voorbeeld input: ["Accent wanden", "Terracotta muurverf", "Kijk ook naar de afwerking"]
            Voorbeeld output: ["Paredes de acento", "Pintura mural terracota", "Mira también el acabado"]
            Geef ALLEEN de JSON array terug, geen andere tekst.` 
          },
          { role: "user", content: JSON.stringify(texts) }
        ],
      }),
    });
    
    if (!response.ok) {
      console.error('Translation API error:', response.status);
      return texts;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      // Try to parse the JSON response
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const translated = JSON.parse(cleanContent);
      if (Array.isArray(translated) && translated.length === texts.length) {
        return translated;
      }
    }
    
    return texts;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Translation timeout - using original texts');
    } else {
      console.error('Translation error:', error);
    }
    return texts;
  } finally {
    clearTimeout(timeout);
  }
}

// PDF version - increment when CSS/layout changes to invalidate cache
const PDF_VERSION = 'v3';

// Helper: convert Supabase Storage URL to use Image Transformation (actual server-side resize)
function toThumbnailUrl(url: string, width = 240, quality = 60): string {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  const transformed = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return `${transformed}?width=${width}&quality=${quality}&resize=contain`;
}

// Configuration constants for easy maintenance
const LOGO_URL = 'https://topimmo.lovable.app/logo-email.png';
const COMPANY_WEBSITE = 'www.topimmospain.com';
const COMPANY_EMAIL = 'info@topimmospain.com';
const TRANSLATION_MODEL = 'google/gemini-3-flash-preview';

// Calculate content hash for cache invalidation
async function calculateContentHash(supabase: any, saleId: string): Promise<string> {
  // Get MAX updated_at from all related tables in parallel
  const [selectionResult, optionResult, imageResult] = await Promise.all([
    supabase
      .from('material_selections')
      .select('updated_at')
      .eq('sale_id', saleId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('material_options')
      .select('updated_at')
      .eq('sale_id', saleId)
      .order('updated_at', { ascending: false })
      .limit(1),
    // Check material_option_images filtered by sale_id via inner join
    supabase
      .from('material_option_images')
      .select('updated_at, material_options!inner(sale_id)')
      .eq('material_options.sale_id', saleId)
      .order('updated_at', { ascending: false })
      .limit(1)
  ]);

  // Combine timestamps into a hash string - include PDF_VERSION for layout changes
  const timestamps = [
    PDF_VERSION,
    (selectionResult.data as any)?.updated_at || '',
    (optionResult.data as any)?.[0]?.updated_at || '',
    (imageResult.data as any)?.[0]?.updated_at || ''
  ].join('|');

  // SHA-256 hash for reliable cache invalidation
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(timestamps));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { saleId, language = 'nl', forceRegenerate = false } = await req.json();

    if (!saleId) {
      throw new Error('Sale ID is required');
    }

    console.log('Generating materials PDF for sale:', saleId, 'language:', language, 'forceRegenerate:', forceRegenerate);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate content hash for cache lookup
    const contentHash = await calculateContentHash(supabase, saleId);
    console.log('Content hash:', contentHash);

    // Check cache (skip if forceRegenerate)
    if (!forceRegenerate) {
      const { data: cached } = await supabase
        .from('cached_pdfs')
        .select('*')
        .eq('sale_id', saleId)
        .eq('pdf_type', 'materials')
        .single();

      if (cached && cached.content_hash === contentHash) {
        console.log('Returning cached PDF URL:', cached.file_url);
        return new Response(
          JSON.stringify({ cached: true, url: cached.file_url }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    }

    // Fetch sale data with project and customers
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .select(`
        id,
        property_description,
        project:projects (
          name,
          city,
          featured_image
        ),
        sale_customers (
          role,
          crm_lead:crm_leads (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', saleId)
      .single();

    if (saleError) {
      console.error('Error fetching sale:', saleError);
      throw new Error(`Failed to fetch sale data: ${saleError.message}`);
    }

    // Fetch material selections with options and images
    const { data: selections, error: selectionsError } = await supabase
      .from('material_selections')
      .select(`
        id,
        category,
        room,
        title,
        notes,
        customer_visible,
        chosen_option_id,
        material_options!material_options_selection_id_fkey (
          id,
          name,
          brand,
          product_code,
          color_code,
          description,
          is_default,
          price,
          material_option_images (
            id,
            image_url,
            is_primary
          )
        )
      `)
      .eq('sale_id', saleId)
      .eq('customer_visible', true)
      .order('category', { ascending: true });

    if (selectionsError) {
      console.error('Error fetching material selections:', selectionsError);
      throw new Error(`Failed to fetch material selections: ${selectionsError.message} (${selectionsError.code})`);
    }

    console.log(`Found ${selections?.length || 0} material selections`);

    // Transform the data
    const transformedSaleData: SaleData = {
      id: saleData.id,
      property_description: saleData.property_description,
      project: Array.isArray(saleData.project) ? saleData.project[0] || null : saleData.project,
      sale_customers: (saleData.sale_customers || []).map((sc: { role: string; crm_lead: unknown }) => ({
        role: sc.role,
        crm_lead: Array.isArray(sc.crm_lead) ? sc.crm_lead[0] || null : sc.crm_lead
      }))
    };

    // Translate all texts if Spanish is selected - keep originals for bilingual display
    let processedSelections = selections as MaterialSelection[] || [];
    
    if (language === 'es' && lovableApiKey) {
      // Collect all texts for batch translation
      const textsToTranslate: string[] = [];
      const textMapping: { type: 'title' | 'optionName' | 'note'; selectionIndex: number; optionIndex?: number }[] = [];
      
      processedSelections.forEach((sel, selIndex) => {
        // Add selection title
        textsToTranslate.push(sel.title);
        textMapping.push({ type: 'title', selectionIndex: selIndex });
        
        // Add option names
        sel.material_options?.forEach((opt, optIndex) => {
          textsToTranslate.push(opt.name);
          textMapping.push({ type: 'optionName', selectionIndex: selIndex, optionIndex: optIndex });
        });
        
        // Add notes
        if (sel.notes) {
          textsToTranslate.push(sel.notes);
          textMapping.push({ type: 'note', selectionIndex: selIndex });
        }
      });
      
      if (textsToTranslate.length > 0) {
        console.log('Translating', textsToTranslate.length, 'texts to Spanish');
        const translatedTexts = await translateTexts(textsToTranslate, lovableApiKey);
        console.log('Translation result count:', translatedTexts.length);
        
        // Apply translations back using mapping
        textMapping.forEach((mapping, index) => {
          const translatedText = translatedTexts[index];
          const sel = processedSelections[mapping.selectionIndex];
          
          if (mapping.type === 'title') {
            sel.titleTranslated = translatedText;
          } else if (mapping.type === 'optionName' && mapping.optionIndex !== undefined) {
            if (sel.material_options && sel.material_options[mapping.optionIndex]) {
              sel.material_options[mapping.optionIndex].nameTranslated = translatedText;
            }
          } else if (mapping.type === 'note') {
            sel.notesOriginal = sel.notes; // Keep original Dutch
            sel.notes = translatedText; // Spanish translation
          }
        });
        
        // Log summary
        console.log('Processed selections with translations:', processedSelections.map(sel => ({
          title: sel.title,
          titleTranslated: sel.titleTranslated,
          optionCount: sel.material_options?.length,
          hasNotes: !!sel.notes
        })));
      }
    }

    // Generate the HTML
    const html = generatePdfHtml(transformedSaleData, processedSelections, language as 'nl' | 'es');

    // Store in cache - upload HTML to storage
    let cachedFileUrl: string | null = null;
    try {
      // First, get and delete old cached file if exists to prevent orphaned files
      const { data: existingCache } = await supabase
        .from('cached_pdfs')
        .select('file_path')
        .eq('sale_id', saleId)
        .eq('pdf_type', 'materials')
        .single();

      if (existingCache?.file_path) {
        console.log('Removing old cached file:', existingCache.file_path);
        await supabase.storage
          .from('sale-documents')
          .remove([existingCache.file_path]);
      }

      const fileName = `materials-${saleId}-${contentHash}.html`;
      const filePath = `cached-pdfs/${fileName}`;
      
      // Upload new HTML to storage
      const { error: uploadError } = await supabase.storage
        .from('sale-documents')
        .upload(filePath, html, {
          contentType: 'text/html',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading cached PDF:', uploadError);
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('sale-documents')
          .getPublicUrl(filePath);

        cachedFileUrl = urlData?.publicUrl || '';

        // Upsert cache record
        const { error: cacheError } = await supabase
          .from('cached_pdfs')
          .upsert({
            sale_id: saleId,
            pdf_type: 'materials',
            file_path: filePath,
            file_url: cachedFileUrl,
            content_hash: contentHash,
            generated_at: new Date().toISOString()
          }, {
            onConflict: 'sale_id,pdf_type'
          });

        if (cacheError) {
          console.error('Error updating cache record:', cacheError);
        } else {
          console.log('PDF cached successfully:', cachedFileUrl);
        }
      }
    } catch (cacheErr) {
      console.error('Cache storage error:', cacheErr);
    }

    // Return URL if upload succeeded, fallback to HTML if not
    if (cachedFileUrl) {
      return new Response(
        JSON.stringify({ cached: true, url: cachedFileUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: return HTML directly if caching failed
    return new Response(
      JSON.stringify({ html }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating materials PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function generatePdfHtml(sale: SaleData, selections: MaterialSelection[], language: 'nl' | 'es'): string {
  const t = translations[language];
  const project = sale.project;
  const projectName = project?.name || 'Onbekend Project';
  const projectCity = project?.city || '';
  const projectImage = project?.featured_image || '';
  const propertyDescription = sale.property_description || '';
  
  // Get customer names
  const getCustomerName = (sc: SaleData['sale_customers'][0] | undefined) => {
    if (!sc || !sc.crm_lead) return null;
    const lead = sc.crm_lead;
    const firstName = lead.first_name || '';
    const lastName = lead.last_name || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || null;
  };

  const buyerCustomer = sale.sale_customers?.find(sc => sc.role === 'buyer');
  const coBuyerCustomer = sale.sale_customers?.find(sc => sc.role === 'co_buyer');
  
  const primaryCustomer = getCustomerName(buyerCustomer) || 
    getCustomerName(sale.sale_customers?.[0]) || 
    (language === 'es' ? 'Cliente Desconocido' : 'Onbekende Klant');
  const secondaryCustomer = getCustomerName(coBuyerCustomer) || 
    (sale.sale_customers?.[1] ? getCustomerName(sale.sale_customers[1]) : null);

  const currentDate = new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Group selections by category
  const groupedSelections = selections.reduce((acc, sel) => {
    const category = sel.category || (language === 'es' ? 'Otros' : 'Overig');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(sel);
    return acc;
  }, {} as Record<string, MaterialSelection[]>);

  // Get category groups
  const categoryGroups = Object.entries(groupedSelections);

  // Calculate total extra costs
  let totalExtraCosts = 0;
  const summaryItems: { categoryNl: string; categoryEs: string; titleNl: string; titleEs: string; chosenOptionNl: string; chosenOptionEs: string; price: number | null }[] = [];

  selections.forEach(sel => {
    const chosenOption = sel.material_options?.find(opt => opt.id === sel.chosen_option_id);
    if (chosenOption) {
      const categoryNl = sel.category;
      const categoryEs = categoryTranslations[sel.category] || sel.category;
      summaryItems.push({
        categoryNl: categoryNl,
        categoryEs: categoryEs,
        titleNl: sel.title,
        titleEs: sel.titleTranslated || sel.title,
        chosenOptionNl: chosenOption.name,
        chosenOptionEs: chosenOption.nameTranslated || chosenOption.name,
        price: chosenOption.price
      });
      if (chosenOption.price && chosenOption.price > 0) {
        totalExtraCosts += chosenOption.price;
      }
    }
  });

  // Generate category sections - content flows naturally across pages
  const categorySections = categoryGroups.map(([category, categorySelections], index) => {
    const categoryNl = category;
    const categoryEs = categoryTranslations[category] || category;
    const isFirstCategory = index === 0;
    
    const selectionsHtml = categorySelections.map(sel => {
      const optionsHtml = sel.material_options?.map(opt => {
        const isChosen = opt.id === sel.chosen_option_id;
        const primaryImage = opt.material_option_images?.find(img => img.is_primary)?.image_url 
          || opt.material_option_images?.[0]?.image_url;
        
        const priceHtml = opt.price && opt.price > 0 
          ? `<span class="price-badge">+€${opt.price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>` 
          : '';
        
        const defaultBadge = opt.is_default 
          ? `<span class="default-badge">${t.default}</span>` 
          : '';

        // Bilingual option name
        const optionNameHtml = opt.nameTranslated && opt.nameTranslated !== opt.name
          ? `<div class="option-name">${opt.name}<span class="option-translation">${opt.nameTranslated}</span></div>`
          : `<div class="option-name">${opt.name}</div>`;

        return `
          <div class="option-card ${isChosen ? 'chosen' : ''}">
            ${primaryImage ? `<img src="${toThumbnailUrl(primaryImage, 300, 65)}" alt="${opt.name}" class="option-image" />` : 
              opt.color_code ? `<div class="color-swatch" style="background-color: ${opt.color_code};"></div>` :
              `<div class="no-image">${t.noImage}</div>`
            }
            <div class="option-content">
              ${optionNameHtml}
              ${opt.brand || opt.product_code ? `
                <div class="option-details">${[opt.brand, opt.product_code].filter(Boolean).join(' - ')}</div>
              ` : ''}
              ${opt.color_code ? `
                <div class="color-indicator">
                  <span class="color-dot" style="background-color: ${opt.color_code};"></span>
                  <span class="color-code">${opt.color_code}</span>
                </div>
              ` : ''}
              <div class="badges">
                ${defaultBadge}
                ${priceHtml}
              </div>
              ${isChosen ? `<div class="chosen-label">✓ ${t.chosen}</div>` : ''}
            </div>
          </div>
        `;
      }).join('') || '';

      // Bilingual room display
      const roomNl = sel.room;
      const roomEs = sel.room ? (roomTranslations[sel.room] || sel.room) : null;
      const roomHtml = roomNl 
        ? (roomEs && roomEs !== roomNl 
          ? ` <span class="room-label">(${roomNl} / <em>${roomEs}</em>)</span>`
          : ` <span class="room-label">(${roomNl})</span>`)
        : '';
      
      // Bilingual title
      const titleHtml = sel.titleTranslated && sel.titleTranslated !== sel.title
        ? `<h3 class="selection-title">${sel.title}<span class="title-translation">${sel.titleTranslated}</span>${roomHtml}</h3>`
        : `<h3 class="selection-title">${sel.title}${roomHtml}</h3>`;
      
      // For Spanish: show bilingual notes (Dutch original + Spanish translation)
      let notesHtml = '';
      if (sel.notes) {
        if (language === 'es' && sel.notesOriginal) {
          // Bilingual display for Spanish PDF
          notesHtml = `
            <div class="selection-notes bilingual">
              <div class="note-original">
                <strong>🇳🇱 Toelichting:</strong> ${sel.notesOriginal}
              </div>
              <div class="note-translated">
                <strong>🇪🇸 Notas:</strong> ${sel.notes}
              </div>
            </div>
          `;
        } else {
          // Single language display
          notesHtml = `
            <div class="selection-notes">
              <strong>${t.notes}:</strong> ${sel.notes}
            </div>
          `;
        }
      }

      return `
        <div class="selection-block">
          ${titleHtml}
          ${notesHtml}
          <div class="options-grid">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    // Bilingual category title
    const categoryTitleHtml = categoryEs !== categoryNl
      ? `${categoryNl}<span class="category-translation">${categoryEs}</span>`
      : categoryNl;

    return `
      <div class="category-section${isFirstCategory ? ' first-category' : ''}">
        <h2 class="category-title">
          <span class="category-decoration"></span>
          ${categoryTitleHtml}
        </h2>
        ${selectionsHtml}
      </div>
    `;
  }).join('');

  // Generate summary table rows - bilingual
  const summaryRows = summaryItems.map((item, index) => `
    <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
      <td>
        <span class="summary-nl">${item.categoryNl}</span>
        <span class="summary-es">${item.categoryEs}</span>
      </td>
      <td>
        <span class="summary-nl">${item.titleNl}</span>
        <span class="summary-es">${item.titleEs}</span>
      </td>
      <td>
        <span class="summary-nl">${item.chosenOptionNl}</span>
        <span class="summary-es">${item.chosenOptionEs}</span>
      </td>
      <td class="price-cell">${item.price && item.price > 0 ? `€${item.price.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}` : '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${t.documentTitle} - ${projectName}</title>
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        :root {
          --primary-color: #2a7fba;
          --primary-dark: #1e5f8a;
          --accent-color: #c9a962;
          --accent-light: #e8d9b0;
          --warm-bg: #faf8f5;
          --warm-bg-alt: #f5f0e8;
          --text-dark: #1e3a5f;
          --text-medium: #4a5568;
          --text-light: #718096;
          --border-color: #e2e8f0;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: var(--text-dark);
          background: white;
        }
        
        .page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 15mm 25mm 15mm; /* Extra bottom padding for footer */
          margin: 0 auto;
          background: white;
          page-break-after: always;
          position: relative;
          box-sizing: border-box;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
        
        /* Page Header */
        .page-header {
          position: absolute;
          top: 8mm;
          right: 15mm;
        }
        
        .header-logo {
          width: 60px;
          opacity: 0.7;
        }
        
        /* Page Footer */
        /* Print footer styling */
        @media print {
          .page {
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: avoid;
          }
        }
        
        /* Cover Page */
        .cover-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          text-align: center;
          padding-top: 10mm;
          height: 267mm;
          background: linear-gradient(180deg, var(--warm-bg) 0%, white 50%);
        }
        
        .cover-logo {
          width: 140px;
          margin-bottom: 5mm;
        }
        
        .cover-decoration {
          width: 60mm;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
          margin-bottom: 8mm;
        }
        
        .project-image {
          width: 100%;
          max-height: 90mm;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 8mm;
          box-shadow: 0 8px 30px rgba(30, 58, 95, 0.15);
          border: 3px solid white;
        }
        
        .project-name {
          font-size: 24pt;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 2mm;
          letter-spacing: -0.5px;
        }
        
        .project-city {
          font-size: 14pt;
          color: var(--text-medium);
          margin-bottom: 5mm;
          font-style: italic;
        }
        
        .property-description {
          font-size: 12pt;
          color: var(--text-dark);
          margin-bottom: 8mm;
          padding: 4mm 8mm;
          background: white;
          border-radius: 6px;
          border-left: 4px solid var(--accent-color);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        
        .customer-names {
          font-size: 13pt;
          color: var(--text-dark);
          margin-bottom: 8mm;
        }
        
        .customer-names div {
          margin-bottom: 2mm;
        }
        
        .customer-names strong {
          color: var(--primary-dark);
        }
        
        .document-footer {
          margin-top: auto;
          padding-top: 5mm;
          border-top: 1px solid var(--border-color);
          width: 80%;
        }
        
        .document-title {
          font-size: 16pt;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 2mm;
        }
        
        .generation-date {
          font-size: 10pt;
          color: var(--text-light);
        }
        
        /* Content Flow - allows natural page breaks */
        .content-flow {
          width: 210mm;
          padding: 15mm;
          margin: 0 auto;
          background: white;
        }
        
        /* Category Sections */
        .category-section {
          page-break-before: always;
          padding-top: 5mm;
          margin-bottom: 10mm;
        }
        
        /* First category should not force page break (follows cover) */
        .category-section.first-category {
          page-break-before: always; /* Still break after cover */
        }
        
        .category-title {
          font-size: 18pt;
          font-weight: 700;
          color: var(--primary-color);
          padding-bottom: 4mm;
          margin-bottom: 8mm;
          position: relative;
          display: flex;
          align-items: center;
          gap: 4mm;
        }
        
        .category-title::after {
          content: '';
          flex: 1;
          height: 3px;
          background: linear-gradient(90deg, var(--primary-color), var(--accent-color), transparent);
          border-radius: 2px;
        }
        
        .category-decoration {
          width: 8px;
          height: 8px;
          background: var(--accent-color);
          border-radius: 2px;
          transform: rotate(45deg);
        }
        
        .selection-block {
          margin-bottom: 10mm;
          page-break-inside: avoid;
        }
        
        .selection-title {
          font-size: 13pt;
          font-weight: 600;
          color: var(--text-dark);
          margin-bottom: 3mm;
          padding-left: 3mm;
          border-left: 3px solid var(--accent-color);
        }
        
        /* Bilingual translation styling */
        .title-translation {
          display: block;
          font-style: italic;
          font-size: 10pt;
          font-weight: 400;
          color: var(--text-light);
          margin-top: 1mm;
        }
        
        .category-translation {
          font-style: italic;
          font-size: 14pt;
          font-weight: 400;
          color: var(--text-light);
          margin-left: 3mm;
        }
        
        .option-translation {
          display: block;
          font-style: italic;
          font-size: 8pt;
          font-weight: 400;
          color: var(--text-light);
          margin-top: 0.5mm;
        }
        
        /* Summary table bilingual styling */
        .summary-nl {
          display: block;
          font-weight: 500;
        }
        
        .summary-es {
          display: block;
          font-style: italic;
          font-size: 8pt;
          color: var(--text-light);
          margin-top: 0.5mm;
        }
        
        .room-label {
          font-weight: 400;
          color: var(--text-light);
        }
        
        .room-label em {
          font-style: italic;
        }
        
        .selection-notes {
          background: var(--warm-bg);
          border-left: 4px solid var(--accent-color);
          padding: 3mm 4mm;
          margin-bottom: 4mm;
          font-size: 10pt;
          color: var(--text-medium);
          border-radius: 0 4px 4px 0;
        }
        
        /* Bilingual notes styling */
        .selection-notes.bilingual {
          display: flex;
          flex-direction: column;
          gap: 3mm;
          background: transparent;
          border-left: none;
          padding: 0;
        }
        
        .note-original {
          padding: 3mm 4mm;
          background: #f0f7fc;
          border-left: 4px solid var(--primary-color);
          border-radius: 0 4px 4px 0;
        }
        
        .note-translated {
          padding: 3mm 4mm;
          background: #fef9ee;
          border-left: 4px solid var(--accent-color);
          border-radius: 0 4px 4px 0;
        }
        
        .options-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4mm;
        }
        
        .option-card {
          width: calc(33.333% - 3mm);
          border: 2px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
          background: white;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        
        .option-card.chosen {
          border-color: var(--accent-color);
          box-shadow: 0 4px 12px rgba(201, 169, 98, 0.25);
        }
        
        .option-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
        }
        
        .color-swatch {
          width: 100%;
          height: 150px;
        }
        
        .no-image {
          width: 100%;
          height: 150px;
          background: var(--warm-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-light);
          font-size: 9pt;
        }
        
        .option-content {
          padding: 3mm;
        }
        
        .option-name {
          font-size: 10pt;
          font-weight: 600;
          color: var(--text-dark);
          margin-bottom: 1mm;
        }
        
        .option-details {
          font-size: 8pt;
          color: var(--text-light);
          margin-bottom: 2mm;
        }
        
        .color-indicator {
          display: flex;
          align-items: center;
          gap: 2mm;
          margin-bottom: 2mm;
        }
        
        .color-dot {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        
        .color-code {
          font-size: 8pt;
          color: var(--text-light);
          font-family: monospace;
        }
        
        .badges {
          display: flex;
          gap: 2mm;
          flex-wrap: wrap;
          margin-bottom: 2mm;
        }
        
        .default-badge {
          font-size: 7pt;
          background: var(--warm-bg-alt);
          color: var(--text-medium);
          padding: 1mm 2mm;
          border-radius: 3px;
          font-weight: 500;
        }
        
        .price-badge {
          font-size: 7pt;
          background: var(--accent-light);
          color: #8b6914;
          padding: 1mm 2mm;
          border-radius: 3px;
          font-weight: 600;
        }
        
        .chosen-label {
          font-size: 9pt;
          font-weight: 700;
          color: var(--accent-color);
          margin-top: 2mm;
        }
        
        /* Summary Page */
        .summary-page {
          padding-top: 20mm;
        }
        
        .summary-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8mm;
        }
        
        .summary-page h2 {
          font-size: 18pt;
          font-weight: 700;
          color: var(--primary-color);
        }
        
        .summary-logo {
          width: 80px;
        }
        
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10mm;
          font-size: 10pt;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        
        .summary-table th {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          color: white;
          padding: 4mm;
          text-align: left;
          font-weight: 600;
        }
        
        .summary-table td {
          padding: 3mm 4mm;
        }
        
        .summary-table .even-row {
          background: var(--warm-bg);
        }
        
        .summary-table .odd-row {
          background: white;
        }
        
        .price-cell {
          text-align: right;
          font-weight: 500;
          font-family: 'Segoe UI', monospace;
        }
        
        .total-row {
          background: linear-gradient(135deg, var(--accent-light), var(--warm-bg)) !important;
        }
        
        .total-row td {
          border-top: 3px solid var(--accent-color);
          font-weight: 700;
          color: var(--text-dark);
          padding: 4mm;
        }
        
        .approval-section {
          margin-top: 12mm;
          padding: 8mm;
          background: var(--warm-bg);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        
        .approval-section h3 {
          font-size: 14pt;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 4mm;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 3mm;
        }
        
        .approval-section h3::before {
          content: '';
          width: 6px;
          height: 6px;
          background: var(--accent-color);
          border-radius: 50%;
        }
        
        .approval-title-translation {
          width: 100%;
          font-style: italic;
          font-size: 11pt;
          font-weight: 400;
          color: var(--text-light);
          margin-left: 12px;
        }
        
        .approval-text {
          font-size: 10pt;
          color: var(--text-medium);
          margin-bottom: 8mm;
          line-height: 1.6;
        }
        
        .approval-text-translation {
          display: block;
          font-style: italic;
          font-size: 9pt;
          color: var(--text-light);
          margin-top: 3mm;
          line-height: 1.5;
        }
        
        .signature-grid {
          display: flex;
          gap: 20mm;
        }
        
        .signature-block {
          flex: 1;
          background: white;
          padding: 4mm;
          border-radius: 6px;
        }
        
        .signature-label {
          font-size: 9pt;
          color: var(--text-light);
          margin-bottom: 12mm;
        }
        
        .signature-label-translation {
          display: block;
          font-style: italic;
          font-size: 8pt;
          color: var(--text-light);
          margin-top: 1mm;
        }
        
        .date-place-label-translation {
          display: block;
          font-style: italic;
          font-size: 8pt;
          color: var(--text-light);
          margin-top: 1mm;
        }
        
        .signature-line {
          border-bottom: 1px solid var(--text-dark);
          height: 10mm;
          margin-bottom: 2mm;
        }
        
        .signature-name {
          font-size: 10pt;
          font-weight: 500;
          color: var(--text-dark);
        }
        
        .date-place-row {
          display: flex;
          gap: 20mm;
          margin-top: 8mm;
        }
        
        .date-place-block {
          flex: 1;
          background: white;
          padding: 4mm;
          border-radius: 6px;
        }
        
        .date-place-label {
          font-size: 9pt;
          color: var(--text-light);
          margin-bottom: 2mm;
        }
        
        .date-place-line {
          border-bottom: 1px solid var(--text-dark);
          height: 8mm;
        }
        
        .company-footer {
          margin-top: 6mm;
          padding-top: 4mm;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4mm;
        }
        
        .company-footer img {
          width: 40px;
          opacity: 0.6;
        }
        
        .company-footer span {
          font-size: 8pt;
          color: var(--text-light);
        }
        
        /* Summary content wrapper - keeps approval and footer together */
        .summary-content-wrapper {
          page-break-inside: avoid;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm; /* Browser handles margins */
            
            /* Hide browser's automatic headers and footers */
            @top-left { content: ''; }
            @top-center { content: ''; }
            @top-right { content: ''; }
            @bottom-left { content: ''; }
            @bottom-center { content: ''; }
            @bottom-right { content: ''; }
          }
          
          html, body {
            margin: 0;
            padding: 0;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          /* Cover page stays fixed height */
          .page.cover-page {
            margin: 0;
            padding: 15mm 15mm 25mm 15mm;
            page-break-after: always;
            box-sizing: border-box;
            height: 297mm;
          }
          
          /* Summary page */
          .page.summary-page {
            page-break-before: always;
            height: auto;
            min-height: auto;
          }
          
          /* Content flow - lets browser manage page breaks */
          .content-flow {
            padding: 0; /* Margins handled by @page */
          }
          
          /* Category sections */
          .category-section {
            page-break-before: always;
            padding-top: 0;
          }
          
          /* Ensure selection blocks don't split awkwardly */
          .selection-block {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Options grid can split if needed (when there are many options) */
          .options-grid {
            page-break-inside: auto;
            break-inside: auto;
          }
          
          /* Individual option cards should stay together */
          .option-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Notes sections stay together */
          .selection-notes {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Category titles stay with first content */
          .category-title {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          /* Keep signature blocks together */
          .signature-block {
            page-break-inside: avoid;
          }
          
          .signature-grid {
            page-break-inside: avoid;
          }
          
          .date-place-row {
            page-break-inside: avoid;
          }
          
          /* Keep approval section together if possible */
          .approval-section {
            page-break-inside: avoid;
          }
          
          /* Keep total row with table */
          .total-row {
            page-break-before: avoid;
          }
          
          /* Prevent orphan/widow rows in summary table */
          .summary-table tbody tr {
            page-break-inside: avoid;
          }
          
          /* Summary content wrapper */
          .summary-content-wrapper {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <!-- Cover Page -->
      <div class="page cover-page">
        <img src="${LOGO_URL}" alt="Top Immo Spain" class="cover-logo" />
        <div class="cover-decoration"></div>
        
        ${projectImage ? `<img src="${toThumbnailUrl(projectImage, 800, 75)}" alt="${projectName}" class="project-image" />` : ''}
        
        <div class="project-name">${projectName}</div>
        ${projectCity ? `<div class="project-city">${projectCity}, España</div>` : ''}
        
        ${propertyDescription ? `<div class="property-description">${propertyDescription}</div>` : ''}
        
        <div class="customer-names">
          <div><strong>${primaryCustomer}</strong></div>
          ${secondaryCustomer ? `<div>${secondaryCustomer}</div>` : ''}
        </div>
        
        <div class="document-footer">
          <div class="document-title">${t.documentTitle}</div>
          <div class="generation-date">${t.generatedOn} ${currentDate}</div>
        </div>
      </div>
      
      <!-- Category Content - flows naturally across pages -->
      <div class="content-flow">
        ${categorySections}
      </div>
      
      <!-- Summary Page -->
      <div class="page summary-page">
        <div class="summary-page-header">
          <h2>${t.summaryTitle}</h2>
          <img src="${LOGO_URL}" alt="Top Immo Spain" class="summary-logo" />
        </div>
        
        <table class="summary-table">
          <thead>
            <tr>
              <th>${t.category}</th>
              <th>${t.selection}</th>
              <th>${t.chosenOption}</th>
              <th style="text-align: right;">${t.extraCost}</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRows}
            <tr class="total-row">
              <td colspan="3"><strong>${t.total}</strong></td>
              <td class="price-cell">€${totalExtraCosts.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="summary-content-wrapper">
          <div class="approval-section">
            <h3>
              ${translations.nl.approval}
              <span class="approval-title-translation">${translations.es.approval}</span>
            </h3>
            <p class="approval-text">
              ${translations.nl.approvalText}
              <span class="approval-text-translation">${translations.es.approvalText}</span>
            </p>
            
            <div class="signature-grid">
              <div class="signature-block">
                <div class="signature-label">
                  ${translations.nl.signatureBuyer1}
                  <span class="signature-label-translation">${translations.es.signatureBuyer1}</span>
                </div>
                <div class="signature-line"></div>
                <div class="signature-name">${primaryCustomer}</div>
              </div>
              ${secondaryCustomer ? `
                <div class="signature-block">
                  <div class="signature-label">
                    ${translations.nl.signatureBuyer2}
                    <span class="signature-label-translation">${translations.es.signatureBuyer2}</span>
                  </div>
                  <div class="signature-line"></div>
                  <div class="signature-name">${secondaryCustomer}</div>
                </div>
              ` : ''}
            </div>
            
            <div class="date-place-row">
              <div class="date-place-block">
                <div class="date-place-label">
                  ${translations.nl.date}:
                  <span class="date-place-label-translation">${translations.es.date}:</span>
                </div>
                <div class="date-place-line"></div>
              </div>
              <div class="date-place-block">
                <div class="date-place-label">
                  ${translations.nl.place}:
                  <span class="date-place-label-translation">${translations.es.place}:</span>
                </div>
                <div class="date-place-line"></div>
              </div>
            </div>
          </div>
          
          <div class="company-footer">
            <img src="${LOGO_URL}" alt="Top Immo Spain" />
            <span>${COMPANY_WEBSITE} | ${COMPANY_EMAIL}</span>
          </div>
        </div>
      </div>
      
    </body>
    </html>
  `;
}
