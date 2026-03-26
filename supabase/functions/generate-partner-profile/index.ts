import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl, name, company, category, partnerId, autoUpdate } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!websiteUrl || !name || !company || !category) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Crawling website (multi-page):', websiteUrl);

    // Crawl website with Firecrawl (multiple pages for richer context)
    const crawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: websiteUrl,
        limit: 10, // Max 10 pages (homepage + subpages)
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: false,
        },
      }),
    });

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text();
      console.error('Firecrawl crawl error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to crawl website' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const crawlData = await crawlResponse.json();
    console.log('Crawl initiated, checking status...');
    
    // Get the crawl ID and poll for completion
    const crawlId = crawlData.id;
    if (!crawlId) {
      console.error('No crawl ID returned');
      return new Response(
        JSON.stringify({ error: 'Failed to start crawl' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll for crawl completion (max 60 seconds)
    let crawlComplete = false;
    let crawlResult: any;
    const maxAttempts = 30;
    let attempts = 0;

    while (!crawlComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${crawlId}`, {
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error('Failed to check crawl status');
        break;
      }

      crawlResult = await statusResponse.json();
      console.log(`Crawl status: ${crawlResult.status}, completed: ${crawlResult.completed}/${crawlResult.total}`);

      if (crawlResult.status === 'completed') {
        crawlComplete = true;
      } else if (crawlResult.status === 'failed') {
        console.error('Crawl failed');
        break;
      }
      
      attempts++;
    }

    if (!crawlComplete) {
      console.error('Crawl timed out or failed');
      return new Response(
        JSON.stringify({ error: 'Crawl timed out or failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Combine all crawled pages into one context
    const pages = crawlResult.data || [];
    const websiteContent = pages
      .map((page: any) => page.markdown || '')
      .join('\n\n---PAGE BREAK---\n\n')
      .substring(0, 15000); // Limit to 15k chars for AI processing

    // Extract metadata from first page (homepage) for fallback images
    const firstPageMetadata = pages[0]?.metadata || {};
    const ogImage = firstPageMetadata.ogImage || null;
    const ogTitle = firstPageMetadata.ogTitle || null;
    const favicon = firstPageMetadata.favicon || null;

    console.log('Website scraped successfully, metadata extracted:', { ogImage, ogTitle, favicon });
    console.log('Generating content with AI');

    // Generate partner profile with AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categoryLabels: Record<string, string> = {
      vastgoed_nl_be: 'Vastgoed adviseur in Nederland/België',
      hypotheek_nl_be: 'Hypotheek adviseur in Nederland/België',
      juridisch: 'Juridisch adviseur',
      hypotheek_spanje: 'Hypotheek adviseur in Spanje',
    };

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `Je bent een professionele copywriter voor Top Immo Spain, een platform voor vastgoedbeleggen in Spanje. 
Je schrijft warme, menselijke en professionele content over partners die investeerders helpen.

Tone of voice:
- Adviserend, niet verkoperig
- Warm en persoonlijk
- Professioneel maar toegankelijk
- Focus op vertrouwen en expertise

Je krijgt informatie over een partner (${categoryLabels[category]}) en hun website content. 
Genereer de volgende content in het Nederlands:

1. Bio (2-4 zinnen): Korte menselijke intro over de persoon, hun achtergrond en expertise
2. Description (4-6 zinnen): Uitgebreidere beschrijving van wat ze doen, hun aanpak en hoe ze investeerders helpen
3. Landing Page Title: Pakkende titel voor hun landingspagina (bijvoorbeeld: "Welkom via [Partner Naam]")
4. Landing Page Intro (2-3 zinnen): Warme intro voor bezoekers die via deze partner komen

Extraheer ook de volgende gegevens (indien gevonden op de website):
5. Email: het hoofdcontact email adres
6. Phone: telefoonnummer (met landcode indien mogelijk)
7. Website URL: de hoofdwebsite URL

KRITISCH ONDERSCHEID tussen logo_url en profile_image_url:

8. Logo URL - ALLEEN voor bedrijfslogo's:
   - Grafisch ontwerp (icoon + tekst, alleen icoon, of alleen tekst)
   - PNG, SVG, of WebP bestanden met 'logo', 'brand', of bedrijfsnaam in de URL
   - Afbeeldingen in <header> of <nav> met 'logo' in bestandsnaam of alt-tekst
   - <link rel="icon"> of <link rel="apple-touch-icon"> meta tags
   - Afbeeldingen in footer met bedrijfslogo
   - NOOIT een foto van een persoon!
   - Als het bedrijf een persoonlijk merk is (één adviseur = het bedrijf) en er geen grafisch logo bestaat, retourneer logo_url: null

9. Profile Image URL - ALLEEN voor persoonsfoto's:
   - Portretfoto's, headshots, teamfoto's van personen
   - Bestandsnamen met: naam, team, over, about, portrait, headshot, eigenaar, adviseur, owner, contact
   - Zoek SPECIFIEK op /over-ons, /over, /about, /about-us, /team, /ons-team pagina's
   - Zoek in Open Graph meta tags: <meta property="og:image">
   - Alt-tekst met: eigenaar, adviseur, founder, oprichter, naam van persoon
   - Foto's in "Over ons" of "Team" secties
   - NOOIT een grafisch logo!
   - Controleer of de URL eindigt op .jpg, .jpeg, .png, .webp en NIET logo, brand, icon bevat
10. Video URL: YouTube of Vimeo video URL (zoek naar video embeds of iframe sources)
11. Social Links: object met alle social media URLs {linkedin, twitter, facebook, instagram, youtube} (zoek in footer/header/contact secties)
12. Services: korte lijst van belangrijkste diensten die ze aanbieden (max 5 items)
13. Years Experience: aantal jaren actief/ervaring (als integer)
14. Team Size: aantal teamleden (als integer, indien vermeld)
15. Certifications: keurmerken, lidmaatschappen (AFM, Kifid, NVM, etc.) als array
16. Specializations: specifieke expertises als array
17. Office Locations: kantoorlocaties als array van objecten met {city, address}
18. Testimonials: klantquotes als array van objecten met {quote, author} (max 3)
19. Statistics: belangrijke cijfers als object met {label, value} paren (bijv. "clients_served": "500+")
20. Media Mentions: media appearances als array van objecten met {source, title, url} (indien gevonden)
21. Hero Image URL: URL to the hero/banner image from the homepage, or the OG image/largest visual on the site (not a small logo)
22. Hero Video URL: URL to the hero video (MP4, WebM) or embedded YouTube/Vimeo video URL found on the homepage
23. Brand Color: The primary/dominant brand color from the website in hex format (e.g., "#3B82F6")

Gebruik de website informatie als context maar schrijf het op een natuurlijke, menselijke manier.`,
          },
          {
            role: 'user',
            content: `Partner informatie:
Naam: ${name}
Bedrijf: ${company}
Categorie: ${categoryLabels[category]}

Website metadata (for fallback):
- Open Graph Image: ${ogImage || 'none'}
- Open Graph Title: ${ogTitle || 'none'}
- Favicon: ${favicon || 'none'}

Website content (multiple pages):
${websiteContent}

Genereer de partner content in JSON formaat met deze keys:
- bio
- description
- landing_page_title
- landing_page_intro
- email (of null indien niet gevonden)
- phone (of null indien niet gevonden)
- website_url (of null indien niet gevonden)
- logo_url (of null indien niet gevonden)
- profile_image_url (of null indien niet gevonden)
- video_url (of null indien niet gevonden)
- hero_image_url (of null indien niet gevonden)
- hero_video_url (of null indien niet gevonden)
- brand_color (of null indien niet gevonden)
- social_links (object met {linkedin, twitter, facebook, instagram, youtube} - alle keys optioneel, of leeg object)
- services (array van strings, of lege array indien niet gevonden)
- years_experience (integer of null)
- team_size (integer of null)
- certifications (array van strings, of lege array)
- specializations (array van strings, of lege array)
- office_locations (array van objecten, of lege array)
- testimonials (array van objecten, of lege array)
- statistics (object of leeg object)
- media_mentions (array van objecten, of lege array)

Format your response as valid JSON only. Extract what you can find, and use null for fields that aren't available.

IMPORTANT: For hero_image_url, look for the large banner/hero image at the top of the homepage, or the og:image meta tag. Do NOT use small logos.
For hero_video_url, look for video elements, MP4/WebM files, or YouTube/Vimeo embeds in the hero section.
For brand_color, analyze the main colors used in the header, logo, or primary buttons and extract the dominant brand color in hex format.

FALLBACK STRATEGY: If you cannot find a profile_image_url or hero_image_url in the content, use the Open Graph Image from the metadata as a fallback (if provided).`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    console.log('AI content generated successfully');

    // Parse JSON from AI response
    let parsedContent;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = generatedContent.match(/```json\n([\s\S]*?)\n```/) || 
                        generatedContent.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : generatedContent;
      parsedContent = JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: Use Open Graph image if no profile_image_url or hero_image_url found
    if (!parsedContent.hero_image_url && ogImage) {
      console.log('No hero_image_url found by AI, using Open Graph image as fallback:', ogImage);
      parsedContent.hero_image_url = ogImage;
    }
    if (!parsedContent.profile_image_url && ogImage && !parsedContent.hero_image_url) {
      console.log('No profile_image_url found by AI, using Open Graph image as fallback:', ogImage);
      parsedContent.profile_image_url = ogImage;
    }

    // Fallback: if AI didn't find logo but partner has existing external logo, use that
    // BUT only if it's not the same as the profile photo
    if (!parsedContent.logo_url && partnerId) {
      console.log('No logo found by AI, checking for existing logo in database');
      try {
        const { data: existingPartner } = await supabase
          .from('partners')
          .select('logo_url, image_url')
          .eq('id', partnerId)
          .single();
        
        // Only use existing logo if:
        // 1. It's an external URL (not already hosted)
        // 2. It's NOT the same as the profile photo (image_url)
        // 3. It's NOT the same as the newly found profile_image_url
        if (existingPartner?.logo_url && 
            !existingPartner.logo_url.includes('supabase.co/storage') &&
            existingPartner.logo_url !== existingPartner.image_url &&
            existingPartner.logo_url !== parsedContent.profile_image_url) {
          console.log('Found existing external logo (not a profile photo), will download and host it:', existingPartner.logo_url);
          parsedContent.logo_url = existingPartner.logo_url;
        } else if (existingPartner && (existingPartner.logo_url === existingPartner.image_url || 
                   existingPartner.logo_url === parsedContent.profile_image_url)) {
          console.log('Skipping logo download: existing logo is same as profile photo');
        }
      } catch (fallbackError) {
        console.error('Error checking for existing logo:', fallbackError);
      }
    }

    // Download and host logo internally
    if (parsedContent.logo_url) {
      try {
        console.log('Downloading logo from:', parsedContent.logo_url);
        const imageResponse = await fetch(parsedContent.logo_url);
        
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          
          // Determine file extension from content type
          const contentType = imageResponse.headers.get('content-type') || 'image/png';
          const extension = contentType.includes('svg') ? 'svg' : 
                           contentType.includes('png') ? 'png' : 
                           contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
          
          // Create unique filename using partner slug or company name
          const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const fileName = `${slug}-logo-${Date.now()}.${extension}`;
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('partner-logos')
            .upload(fileName, imageBlob, {
              contentType,
              upsert: true
            });
          
          if (!uploadError && uploadData) {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('partner-logos')
              .getPublicUrl(fileName);
            
            console.log('Logo uploaded successfully, using Supabase URL:', publicUrl);
            parsedContent.logo_url = publicUrl;
          } else {
            console.error('Failed to upload logo to storage:', uploadError);
            // Keep external URL as fallback
          }
        } else {
          console.log('Could not fetch logo (status:', imageResponse.status, '), keeping external URL');
        }
      } catch (logoError) {
        console.error('Error downloading/uploading logo:', logoError);
        // Keep external URL as fallback
      }
    }

    // Download and host profile photo internally
    if (parsedContent.profile_image_url) {
      try {
        console.log('Downloading profile photo from:', parsedContent.profile_image_url);
        const photoResponse = await fetch(parsedContent.profile_image_url);
        
        if (photoResponse.ok) {
          const photoBlob = await photoResponse.blob();
          
          // Determine file extension from content type
          const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
          const extension = contentType.includes('png') ? 'png' : 
                           contentType.includes('webp') ? 'webp' : 
                           contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'jpg';
          
          // Create unique filename using partner slug
          const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const fileName = `${slug}-photo-${Date.now()}.${extension}`;
          
          // Upload to Supabase Storage (same bucket as logos)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('partner-logos')
            .upload(fileName, photoBlob, {
              contentType,
              upsert: true
            });
          
          if (!uploadError && uploadData) {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('partner-logos')
              .getPublicUrl(fileName);
            
            console.log('Profile photo uploaded successfully, using Supabase URL:', publicUrl);
            parsedContent.profile_image_url = publicUrl;
          } else {
            console.error('Failed to upload photo to storage:', uploadError);
            // Keep external URL as fallback
          }
        } else {
          console.log('Could not fetch photo (status:', photoResponse.status, '), keeping external URL');
        }
      } catch (photoError) {
        console.error('Error downloading/uploading profile photo:', photoError);
        // Keep external URL as fallback
      }
    }

    // Store scraped data in database
    try {
      const { error: insertError } = await supabase
        .from('partner_scraped_data')
        .insert({
          partner_id: partnerId || null,
          website_url: websiteUrl,
          scraped_content: websiteContent,
          extracted_data: parsedContent,
          scraped_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Failed to store scraped data:', insertError);
        // Don't fail the request if storage fails, just log it
      } else {
        console.log('Scraped data stored successfully');
      }
    } catch (storageError) {
      console.error('Error storing scraped data:', storageError);
    }

    // Auto-update partner record if requested
    if (autoUpdate && partnerId) {
      console.log('Auto-updating partner record with new content');
      try {
        const updateData: any = {
          bio: parsedContent.bio,
          description: parsedContent.description,
          landing_page_title: parsedContent.landing_page_title,
          landing_page_intro: parsedContent.landing_page_intro,
          website: parsedContent.website_url || websiteUrl,
          updated_at: new Date().toISOString(),
        };

        // Add optional fields if present
        if (parsedContent.email) updateData.email = parsedContent.email;
        if (parsedContent.phone) updateData.phone = parsedContent.phone;
        if (parsedContent.logo_url) updateData.logo_url = parsedContent.logo_url;
        if (parsedContent.profile_image_url) updateData.image_url = parsedContent.profile_image_url;
        if (parsedContent.video_url) updateData.video_url = parsedContent.video_url;
        if (parsedContent.hero_image_url) updateData.hero_image_url = parsedContent.hero_image_url;
        if (parsedContent.hero_video_url) updateData.hero_video_url = parsedContent.hero_video_url;
        if (parsedContent.brand_color) updateData.brand_color = parsedContent.brand_color;
        if (parsedContent.social_links) updateData.social_links = parsedContent.social_links;
        if (parsedContent.services) updateData.services = parsedContent.services;
        if (parsedContent.years_experience) updateData.years_experience = parsedContent.years_experience;
        if (parsedContent.team_size) updateData.team_size = parsedContent.team_size;
        if (parsedContent.certifications) updateData.certifications = parsedContent.certifications;
        if (parsedContent.specializations) updateData.specializations = parsedContent.specializations;
        if (parsedContent.office_locations) updateData.office_locations = parsedContent.office_locations;
        if (parsedContent.testimonials) updateData.testimonials = parsedContent.testimonials;
        if (parsedContent.statistics) updateData.statistics = parsedContent.statistics;
        if (parsedContent.media_mentions) updateData.media_mentions = parsedContent.media_mentions;

        const { error: updateError } = await supabase
          .from('partners')
          .update(updateData)
          .eq('id', partnerId);

        if (updateError) {
          console.error('Failed to auto-update partner:', updateError);
          // Don't fail the request, just log
        } else {
          console.log('Partner record auto-updated successfully');
        }
      } catch (updateError) {
        console.error('Error auto-updating partner:', updateError);
      }
    }

    return new Response(
      JSON.stringify(parsedContent),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating partner profile:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});