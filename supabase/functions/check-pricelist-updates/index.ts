import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Direct Firecrawl REST API call (avoids WebSocket compatibility issues with Deno)
async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ success: boolean; markdown?: string; error?: string }> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        onlyMainContent: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Firecrawl error: ${response.status}` };
    }
    
    const data = await response.json();
    return { success: true, markdown: data.data?.markdown || '' };
  } catch (error) {
    console.error('Firecrawl request failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pricelist patterns
const PRICELIST_PATTERNS = [
  /pricelist/i,
  /prijslijst/i,
  /precios/i,
  /tarifa/i,
  /price[\s_-]*list/i,
  /lista[\s_-]*de[\s_-]*precios/i,
];

function isPricelistFile(fileName: string): boolean {
  return PRICELIST_PATTERNS.some(pattern => pattern.test(fileName));
}

function extractDateFromFilename(filename: string): Date | null {
  const patterns = [
    /^(\d{2})(\d{2})(\d{2})[_-]/,
    /^(\d{4})(\d{2})(\d{2})[_-]/,
    /[_-](\d{2})(\d{2})(\d{2})[_.\s]/,
    /[_-](\d{4})(\d{2})(\d{2})[_.\s]/,
  ];
  
  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      let year: number, month: number, day: number;
      if (match[1].length === 2) {
        year = 2000 + parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      }
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(year, month - 1, day);
      }
    }
  }
  return null;
}

function parseRelativeDate(text: string): Date | null {
  const now = new Date();
  
  const daysMatch = text.match(/(\d+)\s*days?\s*ago/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }
  
  if (/yesterday/i.test(text)) {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  if (/last\s*month/i.test(text)) {
    return new Date(now.getFullYear(), now.getMonth() - 1, 15);
  }
  
  if (/last\s*week/i.test(text)) {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  const weeksMatch = text.match(/(\d+)\s*weeks?\s*ago/i);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1]);
    return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  }
  
  const monthsMatch = text.match(/(\d+)\s*months?\s*ago/i);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1]);
    return new Date(now.getFullYear(), now.getMonth() - months, 15);
  }
  
  return null;
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

function convertToDirectDownloadUrl(dropboxUrl: string): string {
  let url = dropboxUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  url = url.replace('dropbox.com', 'dl.dropboxusercontent.com');
  if (url.includes('?')) {
    url = url.replace(/dl=0/, 'dl=1');
    if (!url.includes('dl=1')) {
      url += '&dl=1';
    }
  } else {
    url += '?dl=1';
  }
  return url;
}

interface ParsedItem {
  name: string;
  url: string;
  modified?: string;
}

function parseDropboxMarkdown(markdown: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const name = linkMatch[1].trim();
      const url = linkMatch[2].trim();
      
      if (name === '..' || name === '.' || url.includes('#')) continue;
      
      const ext = getFileExtension(name);
      if (!ext) continue; // Skip folders
      
      const modifiedMatch = line.match(/(\d+\s+days?\s+ago|Last\s+\w+|Yesterday|\d+\s+\w+\s+ago)/i);
      
      items.push({
        name,
        url,
        modified: modifiedMatch ? modifiedMatch[1] : undefined,
      });
    }
  }
  
  return items;
}

async function downloadAndUploadFile(
  supabase: any,
  fileUrl: string,
  fileName: string,
  projectId: string
): Promise<string | null> {
  try {
    const downloadUrl = convertToDirectDownloadUrl(fileUrl);
    console.log(`[check-pricelist] Downloading: ${fileName}`);
    
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error(`[check-pricelist] Failed to download ${fileName}: ${response.status}`);
      return null;
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${projectId}/${timestamp}_${safeName}`;
    
    const { error } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, uint8Array, {
        contentType: blob.type || 'application/octet-stream',
        upsert: true
      });
    
    if (error) {
      console.error(`[check-pricelist] Upload error for ${fileName}:`, error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('project-documents')
      .getPublicUrl(storagePath);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error(`[check-pricelist] Error processing ${fileName}:`, err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[check-pricelist] Starting weekly pricelist check');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all folders marked for auto-check
    const { data: folders, error: foldersError } = await supabase
      .from('project_dropbox_folders')
      .select(`
        *,
        dropbox_source:project_dropbox_sources (
          project_id
        )
      `)
      .eq('auto_check', true);

    if (foldersError) {
      throw new Error(`Failed to fetch folders: ${foldersError.message}`);
    }

    console.log(`[check-pricelist] Found ${folders?.length || 0} folders to check`);

    const updates: { projectId: string; fileName: string; action: string }[] = [];

    for (const folder of folders || []) {
      const projectId = folder.dropbox_source?.project_id;
      if (!projectId) continue;

      console.log(`[check-pricelist] Checking folder: ${folder.folder_path}`);

      try {
        // Scrape only this specific folder
        const scrapeResult = await scrapeWithFirecrawl(folder.folder_url, firecrawlApiKey);

        if (!scrapeResult.success || !scrapeResult.markdown) {
          console.error(`[check-pricelist] No markdown returned for folder: ${folder.folder_path}: ${scrapeResult.error}`);
          continue;
        }

        const items = parseDropboxMarkdown(scrapeResult.markdown);
        const pricelists = items.filter(item => isPricelistFile(item.name));

        console.log(`[check-pricelist] Found ${pricelists.length} pricelists in ${folder.folder_path}`);

        for (const pricelist of pricelists) {
          // Get existing pricelist document
          const { data: existing } = await supabase
            .from('project_documents')
            .select('*')
            .eq('project_id', projectId)
            .eq('is_pricelist', true)
            .eq('sync_source', 'dropbox')
            .single();

          const newDate = extractDateFromFilename(pricelist.name);
          const newModified = pricelist.modified ? parseRelativeDate(pricelist.modified) : null;

          let shouldUpdate = false;
          let reason = '';

          if (!existing) {
            shouldUpdate = true;
            reason = 'new';
          } else {
            const existingDate = existing.document_date ? new Date(existing.document_date) : null;
            const existingModified = existing.dropbox_modified ? parseRelativeDate(existing.dropbox_modified) : null;

            // Compare by document_date first
            if (newDate && existingDate) {
              if (newDate > existingDate) {
                shouldUpdate = true;
                reason = 'newer_date';
              }
            }
            // Fallback to modified date
            else if (newModified && existingModified) {
              if (newModified > existingModified) {
                shouldUpdate = true;
                reason = 'newer_modified';
              }
            }
            // Check if filename changed (different version)
            else if (pricelist.name !== existing.file_name) {
              shouldUpdate = true;
              reason = 'filename_changed';
            }
          }

          if (shouldUpdate) {
            console.log(`[check-pricelist] Updating pricelist: ${pricelist.name} (${reason})`);

            const publicUrl = await downloadAndUploadFile(
              supabase,
              pricelist.url,
              pricelist.name,
              projectId
            );

            if (publicUrl) {
              if (existing) {
                // Update existing record
                await supabase
                  .from('project_documents')
                  .update({
                    title: pricelist.name.replace(/\.[^.]+$/, ''),
                    file_name: pricelist.name,
                    file_url: publicUrl,
                    dropbox_url: pricelist.url,
                    dropbox_modified: pricelist.modified,
                    document_date: newDate?.toISOString().split('T')[0],
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);
              } else {
                // Insert new record
                await supabase
                  .from('project_documents')
                  .insert({
                    project_id: projectId,
                    title: pricelist.name.replace(/\.[^.]+$/, ''),
                    file_name: pricelist.name,
                    file_url: publicUrl,
                    document_type: 'pricelist',
                    dropbox_url: pricelist.url,
                    dropbox_modified: pricelist.modified,
                    document_date: newDate?.toISOString().split('T')[0],
                    is_pricelist: true,
                    sync_source: 'dropbox',
                    visible_public: true,
                    visible_portal: true,
                  });
              }

              updates.push({
                projectId,
                fileName: pricelist.name,
                action: reason,
              });
            }
          }
        }

        // Update last_checked_at
        await supabase
          .from('project_dropbox_folders')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', folder.id);

      } catch (err) {
        console.error(`[check-pricelist] Error checking folder ${folder.folder_path}:`, err);
      }
    }

    console.log(`[check-pricelist] Completed. Updates: ${updates.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        foldersChecked: folders?.length || 0,
        updates 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-pricelist] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});