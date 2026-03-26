import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF generation using plain text approach
// In production, you'd want to use a library like PDFKit or similar
function generateSimplePdf(articles: any[]): string {
  // This creates a very basic PDF structure
  // For a production app, you'd want to use a proper PDF library
  
  const pdfContent: string[] = [];
  
  // PDF Header
  pdfContent.push('%PDF-1.4');
  pdfContent.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  
  // Build content string
  let textContent = '';
  textContent += 'TOP IMMO SPAIN ORIENTATIEGIDS\n\n';
  textContent += '=' .repeat(50) + '\n\n';
  textContent += 'Jouw gids voor investeren in Spanje\n\n';
  textContent += '=' .repeat(50) + '\n\n\n';
  
  // Group by pillar
  const pillarNames: Record<string, string> = {
    regio: "Regio's Ontdekken",
    financiering: "Financiering",
    juridisch: "Juridisch",
    fiscaliteit: "Fiscaliteit"
  };
  
  const pillarOrder = ['regio', 'financiering', 'juridisch', 'fiscaliteit'];
  
  for (const pillar of pillarOrder) {
    const pillarArticles = articles.filter(a => a.pillar === pillar);
    if (pillarArticles.length === 0) continue;
    
    textContent += '\n' + '-'.repeat(50) + '\n';
    textContent += pillarNames[pillar] || pillar.toUpperCase();
    textContent += '\n' + '-'.repeat(50) + '\n\n';
    
    for (const article of pillarArticles) {
      const title = article.blog_posts?.title || article.custom_title || 'Artikel';
      const intro = article.blog_posts?.intro || article.custom_description || '';
      
      textContent += `\n### ${title}\n\n`;
      
      if (intro) {
        textContent += intro + '\n\n';
      }
      
      // Process content if available
      if (article.blog_posts?.content) {
        const content = article.blog_posts.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'heading' && block.content) {
              textContent += `\n** ${block.content} **\n\n`;
            } else if (block.type === 'paragraph' && block.content) {
              // Strip HTML tags
              const plainText = block.content.replace(/<[^>]*>/g, '');
              textContent += plainText + '\n\n';
            } else if (block.type === 'list' && block.items) {
              for (const item of block.items) {
                const itemText = typeof item === 'string' ? item : item.content || '';
                const plainItem = itemText.replace(/<[^>]*>/g, '');
                textContent += `  • ${plainItem}\n`;
              }
              textContent += '\n';
            }
          }
        }
      }
      
      textContent += '\n';
    }
  }
  
  textContent += '\n\n' + '='.repeat(50) + '\n';
  textContent += 'Top Immo Spain - www.topimmospain.com\n';
  textContent += 'Heb je vragen? Plan een orienterend gesprek.\n';
  textContent += '='.repeat(50) + '\n';
  
  // Escape special PDF characters and encode
  const escapedContent = textContent
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\n/g, '\\n');
  
  // Create a simple single-page PDF with all text
  // Note: This is a simplified PDF structure
  const pageContent = `BT /F1 10 Tf 50 750 Td (${escapedContent.substring(0, 4000)}) Tj ET`;
  
  const pages = `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`;
  const page = `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`;
  const content = `4 0 obj << /Length ${pageContent.length} >> stream\n${pageContent}\nendstream endobj`;
  const font = `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`;
  
  pdfContent.push(pages);
  pdfContent.push(page);
  pdfContent.push(content);
  pdfContent.push(font);
  
  const xrefOffset = pdfContent.join('\n').length;
  pdfContent.push('xref');
  pdfContent.push('0 6');
  pdfContent.push('0000000000 65535 f ');
  pdfContent.push('0000000009 00000 n ');
  pdfContent.push('0000000058 00000 n ');
  pdfContent.push('0000000115 00000 n ');
  pdfContent.push('0000000270 00000 n ');
  pdfContent.push('0000000380 00000 n ');
  pdfContent.push('trailer << /Size 6 /Root 1 0 R >>');
  pdfContent.push('startxref');
  pdfContent.push(String(xrefOffset));
  pdfContent.push('%%EOF');
  
  return pdfContent.join('\n');
}

// Generate HTML that can be converted to PDF
function generateHtmlContent(articles: any[]): string {
  const pillarNames: Record<string, string> = {
    regio: "Regio's Ontdekken",
    financiering: "Financiering",
    juridisch: "Juridisch",
    fiscaliteit: "Fiscaliteit"
  };
  
  const pillarOrder = ['regio', 'financiering', 'juridisch', 'fiscaliteit'];
  
  let html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Top Immo Spain Oriëntatiegids</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #1e5b5b; border-bottom: 3px solid #1e5b5b; padding-bottom: 10px; }
    h2 { color: #1e5b5b; margin-top: 40px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    h3 { color: #e2725b; margin-top: 30px; }
    .intro { font-size: 1.1em; color: #666; margin-bottom: 30px; }
    .article { margin-bottom: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .article-title { color: #1e5b5b; margin-bottom: 10px; }
    .article-intro { color: #666; font-style: italic; margin-bottom: 15px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #1e5b5b; text-align: center; color: #666; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  <h1>Top Immo Spain Oriëntatiegids</h1>
  <p class="intro">Jouw complete gids voor investeren in Spanje. Deze gids bevat alle informatie die je nodig hebt om goed voorbereid te starten met je oriëntatie.</p>
`;

  for (const pillar of pillarOrder) {
    const pillarArticles = articles.filter(a => a.pillar === pillar);
    if (pillarArticles.length === 0) continue;
    
    html += `<h2>${pillarNames[pillar] || pillar}</h2>`;
    
    for (const article of pillarArticles) {
      const title = article.blog_posts?.title || article.custom_title || 'Artikel';
      const intro = article.blog_posts?.intro || article.custom_description || '';
      
      html += `<div class="article">`;
      html += `<h3 class="article-title">${escapeHtml(title)}</h3>`;
      
      if (intro) {
        html += `<p class="article-intro">${escapeHtml(intro)}</p>`;
      }
      
      // Process content if available
      if (article.blog_posts?.content) {
        const content = article.blog_posts.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'heading' && block.content) {
              html += `<h4>${escapeHtml(block.content)}</h4>`;
            } else if (block.type === 'paragraph' && block.content) {
              html += `<p>${block.content}</p>`;
            } else if (block.type === 'list' && block.items) {
              html += '<ul>';
              for (const item of block.items) {
                const itemText = typeof item === 'string' ? item : item.content || '';
                html += `<li>${itemText}</li>`;
              }
              html += '</ul>';
            }
          }
        }
      }
      
      html += `</div>`;
    }
  }

  html += `
  <div class="footer">
    <p><strong>Top Immo Spain</strong></p>
    <p>www.topimmospain.com</p>
    <p>Heb je vragen? Plan een oriënterend gesprek met een van onze adviseurs.</p>
  </div>
</body>
</html>`;

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting PDF generation...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all orientation guide items with their blog posts
    const { data: items, error } = await supabase
      .from('orientation_guide_items')
      .select(`
        id,
        pillar,
        custom_title,
        custom_description,
        custom_read_time_minutes,
        order_index,
        blog_posts (
          id,
          title,
          intro,
          content,
          category
        )
      `)
      .eq('active', true)
      .order('pillar')
      .order('order_index');

    if (error) {
      console.error('Error fetching items:', error);
      throw error;
    }

    console.log(`Found ${items?.length || 0} orientation items`);

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No orientation items found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate HTML content
    const htmlContent = generateHtmlContent(items);
    
    // For now, return HTML that can be printed as PDF
    // In production, you'd use a proper PDF generation library
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

    console.log('PDF generation complete');

    return new Response(
      JSON.stringify({ 
        success: true,
        htmlBase64,
        articleCount: items.length,
        message: 'Use the HTML content to print as PDF'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
