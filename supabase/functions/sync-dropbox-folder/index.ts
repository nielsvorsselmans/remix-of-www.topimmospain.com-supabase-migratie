import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= URL VALIDATION =============
// Only process genuine Dropbox shared content URLs
function isValidDropboxUrl(url: string): boolean {
  if (!url) return false;
  
  const validPatterns = [
    /dropbox\.com\/sh\//i,           // Shared folder
    /dropbox\.com\/scl\//i,          // Shared content link
    /dl\.dropboxusercontent\.com/i,  // Direct download
    /dropbox\.com\/s\//i,            // Shared file
  ];
  
  const invalidPatterns = [
    /dropbox\.com\/?$/i,             // Homepage
    /dropbox\.com\/home/i,           // User home
    /dropbox\.com\/login/i,          // Login page
    /dropbox\.com\/signup/i,         // Signup page
    /dropbox\.com\/features/i,       // Feature pages
    /dropbox\.com\/business/i,       // Business pages
    /dropbox\.com\/plans/i,          // Pricing
    /dropbox\.com\/help/i,           // Help pages
    /dropbox\.com\/referrals/i,      // Referrals
    /#/,                              // Anchor links
    /javascript:/i,                   // JS links
  ];
  
  // Must match at least one valid pattern
  const isValid = validPatterns.some(pattern => pattern.test(url));
  // Must not match any invalid pattern
  const isInvalid = invalidPatterns.some(pattern => pattern.test(url));
  
  return isValid && !isInvalid;
}

// ============= RATE-LIMITED FIRECRAWL =============
async function scrapeWithFirecrawl(
  url: string, 
  apiKey: string,
  maxRetries = 3
): Promise<{ success: boolean; markdown?: string; links?: string[]; error?: string }> {
  let lastError = '';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[sync-dropbox] Firecrawl attempt ${attempt}/${maxRetries} for ${url}`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown', 'links'],  // Request both markdown and links array
          onlyMainContent: false
        })
      });
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[sync-dropbox] Rate limited (429), waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        lastError = 'Rate limited';
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[sync-dropbox] Firecrawl API error: ${response.status} - ${errorText}`);
        lastError = `Firecrawl error: ${response.status}`;
        continue;
      }
      
      const data = await response.json();
      return { 
        success: true, 
        markdown: data.data?.markdown || '',
        links: data.data?.links || []
      };
    } catch (error) {
      console.error('[sync-dropbox] Firecrawl request failed:', error);
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }
  }
  
  return { success: false, error: lastError };
}

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Media folder patterns - these folders will be skipped (only link stored)
const MEDIA_FOLDER_PATTERNS = [
  /im[aá]genes/i,
  /fotos?($|\s|\/|_|-)/i,
  /videos?($|\s|\/|_|-)/i,
  /renders?($|\s|\/|_|-)/i,
  /gallery/i,
  /media($|\s|\/|_|-)/i,
  /alta[\s_-]*resoluci[oó]n/i,
  /baja[\s_-]*resoluci[oó]n/i,
  /high[\s_-]*res/i,
  /low[\s_-]*res/i,
  /interior(es)?($|\s|\/|_|-)/i,
  /exterior(es)?($|\s|\/|_|-)/i,
  /photo/i,
  /image($|\s|\/|_|-)/i,
  /pictures?($|\s|\/|_|-)/i,
];

// Pricelist patterns - extended for better detection
const PRICELIST_PATTERNS = [
  /disponibilidad/i,
  /pricelist/i,
  /prijslijst/i,
  /precios/i,
  /tarifa/i,
  /price[\s_-]*list/i,
  /lista[\s_-]*de[\s_-]*precios/i,
  /availability/i,
];

// ============= DOCUMENT TYPE CLASSIFICATION =============
// Hardcoded patterns for reliable classification during sync
const DOCUMENT_TYPE_PATTERNS: { pattern: RegExp; documentType: string }[] = [
  // Prijslijsten / Availability
  { pattern: /disponibilidad/i, documentType: 'prijslijst' },
  { pattern: /pricelist/i, documentType: 'prijslijst' },
  { pattern: /prijslijst/i, documentType: 'prijslijst' },
  { pattern: /precios/i, documentType: 'prijslijst' },
  { pattern: /tarifa/i, documentType: 'prijslijst' },
  { pattern: /availability/i, documentType: 'prijslijst' },
  
  // Specificaties
  { pattern: /memoria[\s_-]*(de[\s_-]*)?calidades/i, documentType: 'specifications' },
  { pattern: /specifications?/i, documentType: 'specifications' },
  { pattern: /especificacion(es)?/i, documentType: 'specifications' },
  { pattern: /calidades/i, documentType: 'specifications' },
  { pattern: /specificatielijst/i, documentType: 'specifications' },
  
  // Grondplannen
  { pattern: /planos?[\s_-]*(de[\s_-]*)?vivienda/i, documentType: 'floorplan' },
  { pattern: /planos?[\s_-]*(de[\s_-]*)?venta/i, documentType: 'floorplan' },
  { pattern: /floor[\s_-]*plan/i, documentType: 'floorplan' },
  { pattern: /grondplan/i, documentType: 'floorplan' },
  
  // Elektriciteitsplan
  { pattern: /plano[\s_-]*electrico/i, documentType: 'other' },
  { pattern: /electrical[\s_-]*plan/i, documentType: 'other' },
  
  // Betalingsschema
  { pattern: /calendario[\s_-]*(de[\s_-]*)?pagos/i, documentType: 'payment_schedule' },
  { pattern: /payment[\s_-]*schedule/i, documentType: 'payment_schedule' },
  { pattern: /betalingsschema/i, documentType: 'payment_schedule' },
  { pattern: /forma[\s_-]*(de[\s_-]*)?pago/i, documentType: 'payment_schedule' },
  
  // Contracten
  { pattern: /contrato[\s_-]*(de[\s_-]*)?reserva/i, documentType: 'reservation_contract' },
  { pattern: /contrato[\s_-]*(de[\s_-]*)?compraventa/i, documentType: 'purchase_contract' },
  
  // Masterplan
  { pattern: /masterplan/i, documentType: 'master_plan' },
  { pattern: /site[\s_-]*plan/i, documentType: 'master_plan' },
  { pattern: /ubicacion/i, documentType: 'master_plan' },
  
  // Bankgarantie
  { pattern: /bankgarantie/i, documentType: 'bank_guarantee' },
  { pattern: /garantia[\s_-]*bancaria/i, documentType: 'bank_guarantee' },
  { pattern: /aval[\s_-]*bancario/i, documentType: 'bank_guarantee' },
  
  // Bouwvergunning
  { pattern: /licencia[\s_-]*(de[\s_-]*)?obra/i, documentType: 'building_permit' },
  { pattern: /building[\s_-]*permit/i, documentType: 'building_permit' },
  
  // Eigendomsregister
  { pattern: /nota[\s_-]*simple/i, documentType: 'ownership_extract' },
  
  // Kadastrale fiche
  { pattern: /catastro/i, documentType: 'cadastral_file' },
  { pattern: /ficha[\s_-]*catastral/i, documentType: 'cadastral_file' },
  
  // Kelderplan
  { pattern: /plano[\s_-]*(de[\s_-]*)?sotano/i, documentType: 'basement_plan' },
  { pattern: /garaje/i, documentType: 'basement_plan' },
  { pattern: /parking[\s_-]*plan/i, documentType: 'basement_plan' },
  
  // Afmetingenplan
  { pattern: /plano[\s_-]*(de[\s_-]*)?cotas/i, documentType: 'measurement_plan' },
];

// Check learned patterns from database
async function checkLearnedPatterns(supabase: any, fileName: string): Promise<string | null> {
  try {
    const { data: mappings } = await supabase
      .from('document_type_mappings')
      .select('pattern, document_type');

    if (!mappings) return null;

    const lowerFileName = fileName.toLowerCase();
    for (const mapping of mappings) {
      if (lowerFileName.includes(mapping.pattern.toLowerCase())) {
        // Update match count
        await supabase
          .from('document_type_mappings')
          .update({ 
            match_count: (mapping.match_count || 0) + 1,
            last_matched_at: new Date().toISOString(),
          })
          .eq('pattern', mapping.pattern);
        
        return mapping.document_type;
      }
    }
  } catch (err) {
    console.log('[sync-dropbox] Could not check learned patterns:', err);
  }
  return null;
}

// Classify document type based on filename
function classifyDocumentType(fileName: string): string | null {
  for (const { pattern, documentType } of DOCUMENT_TYPE_PATTERNS) {
    if (pattern.test(fileName)) {
      return documentType;
    }
  }
  return null;
}

// Get document type with fallback logic
async function getDocumentType(
  supabase: any,
  fileName: string, 
  ext: string, 
  isInFloorplanFolder: boolean,
  isPricelist: boolean
): Promise<string> {
  // 1. Check hardcoded patterns first
  const hardcodedType = classifyDocumentType(fileName);
  if (hardcodedType) {
    console.log(`[sync-dropbox] Hardcoded classification: ${fileName} -> ${hardcodedType}`);
    return hardcodedType;
  }
  
  // 2. Check learned patterns from database
  const learnedType = await checkLearnedPatterns(supabase, fileName);
  if (learnedType) {
    console.log(`[sync-dropbox] Learned classification: ${fileName} -> ${learnedType}`);
    return learnedType;
  }
  
  // 3. Fallback to context-based detection
  if (isPricelist) return 'prijslijst';
  if (isInFloorplanFolder) return 'floorplan';
  if (['.xls', '.xlsx'].includes(ext)) return 'prijslijst';
  if (ext === '.pdf') return 'brochure';
  
  return 'other';
}

// Video extensions (only store link, don't download)
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.wmv'];

// Document extensions to download
const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];

// Image extensions (download if not in media folder)
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'];

// Updated SyncResult interface with new metrics
interface SyncResult {
  foldersFound: number;
  foldersSkipped: number;
  documentsImported: number;      // New documents
  documentsUpdated: number;        // Updated documents (non-pricelist)
  documentsSkipped: number;        // Unchanged documents
  documentsHidden: number;         // Documents no longer in Dropbox
  pricelistVersionsCreated: number; // New pricelist versions
  videoLinksStored: number;
  urlsFiltered: number;
  errors: string[];
}

// Existing document from database
interface ExistingDocument {
  id: string;
  file_name: string;
  dropbox_url: string | null;
  dropbox_modified: string | null;
  is_pricelist: boolean;
  visible_public: boolean;
  visible_portal: boolean;
}

// Floorplan folder patterns - documents in these folders get type 'floorplan'
const FLOORPLAN_FOLDER_PATTERNS = [
  /planos?[\s_-]*(de[\s_-]*)?venta/i,     // PLANOS DE VENTA, PLANO DE VENTA
  /planos?($|\s|\/|_|-)/i,                // PLANOS, PLANO
  /floor[\s_-]*plan/i,                     // Floorplan, Floor Plan
  /grondplan(nen)?/i,                      // Grondplan(nen)
  /plant(a|en)/i,                          // Planta, Planten
  /plans?($|\s|\/|_|-)/i,                  // Plans
  /layouts?($|\s|\/|_|-)/i,               // Layout(s)
  /blueprints?/i,                          // Blueprint(s)
];

function isMediaFolder(folderName: string): boolean {
  return MEDIA_FOLDER_PATTERNS.some(pattern => pattern.test(folderName));
}

function isFloorplanFolder(folderName: string): boolean {
  return FLOORPLAN_FOLDER_PATTERNS.some(pattern => pattern.test(folderName));
}

function isPricelistFile(fileName: string): boolean {
  return PRICELIST_PATTERNS.some(pattern => pattern.test(fileName));
}

function isPricelistFolder(folderName: string): boolean {
  return PRICELIST_PATTERNS.some(pattern => pattern.test(folderName));
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

async function downloadAndUploadFile(
  supabase: any,
  fileUrl: string,
  fileName: string,
  projectId: string
): Promise<string | null> {
  try {
    const downloadUrl = convertToDirectDownloadUrl(fileUrl);
    console.log(`[sync-dropbox] Downloading: ${fileName}`);
    
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error(`[sync-dropbox] Failed to download ${fileName}: ${response.status}`);
      return null;
    }
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${projectId}/${timestamp}_${safeName}`;
    
    const { data, error } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, uint8Array, {
        contentType: blob.type || 'application/octet-stream',
        upsert: true
      });
    
    if (error) {
      console.error(`[sync-dropbox] Upload error for ${fileName}:`, error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('project-documents')
      .getPublicUrl(storagePath);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error(`[sync-dropbox] Error processing ${fileName}:`, err);
    return null;
  }
}

interface ParsedItem {
  name: string;
  url: string;
  isFolder: boolean;
  modified?: string;
  size?: string;
}

// Extract metadata (modified date, size) from markdown by matching filename
function extractMetadataFromMarkdown(markdown: string, filename: string): { modified?: string; size?: string } | null {
  try {
    // Find the section in markdown that contains this filename
    // Markdown format: [filename](url)\n\nModified date\n\nSize
    const escapedName = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Look for the filename followed by metadata on subsequent lines
    const pattern = new RegExp(escapedName.replace(/_/g, '[\\\\_]') + '[^\\n]*\\n+([^\\n]+)', 'i');
    const match = markdown.match(pattern);
    
    if (match) {
      const metaLine = match[1];
      // Look for date patterns like "Last month", "20 days ago", "Yesterday"
      const modifiedMatch = metaLine.match(/(\d+\s+days?\s+ago|Last\s+\w+|Yesterday|\d+\s+\w+\s+ago)/i);
      // Look for size patterns like "320.99 KB", "33.89 MB"
      const sizeMatch = metaLine.match(/([\d.]+\s*[KMGT]?B)/i);
      
      if (modifiedMatch || sizeMatch) {
        return {
          modified: modifiedMatch?.[1],
          size: sizeMatch?.[1]
        };
      }
    }
    
    // Alternative: search for filename in a table-like structure
    const lines = markdown.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(filename) || lines[i].includes(filename.replace(/_/g, '\\_'))) {
        // Check surrounding lines for metadata
        const contextLines = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');
        const modMatch = contextLines.match(/(\d+\s+days?\s+ago|Last\s+\w+|Yesterday|\d+\s+\w+\s+ago)/i);
        const szMatch = contextLines.match(/([\d.]+\s*[KMGT]?B)/i);
        if (modMatch || szMatch) {
          return { modified: modMatch?.[1], size: szMatch?.[1] };
        }
      }
    }
  } catch (err) {
    console.log(`[sync-dropbox] Could not extract metadata for ${filename}`);
  }
  return null;
}

// Parse items from Firecrawl links array (more reliable than markdown parsing)
function parseDropboxLinks(links: string[], markdown: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const seenUrls = new Set<string>();
  
  for (const url of links) {
    // Skip if already processed
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    
    // Only process valid Dropbox content URLs
    if (!isValidDropboxUrl(url)) continue;
    
    // Skip thumbnail/preview URLs
    if (url.includes('previews.dropboxusercontent.com')) continue;
    if (url.includes('/p/thumb/')) continue;
    
    // Extract filename from URL (last path segment before query params)
    const urlWithoutQuery = url.split('?')[0];
    const pathSegments = urlWithoutQuery.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // URL decode the filename
    let name: string;
    try {
      name = decodeURIComponent(lastSegment);
    } catch {
      name = lastSegment;
    }
    
    // Skip navigation/system items
    if (!name || name === '' || name === '..' || name === '.') continue;
    
    // Determine if folder or file based on extension
    const ext = getFileExtension(name);
    const hasKnownExtension = DOCUMENT_EXTENSIONS.includes(ext) || 
                              VIDEO_EXTENSIONS.includes(ext) || 
                              IMAGE_EXTENSIONS.includes(ext);
    
    // If no extension and not a known file type, it's likely a folder
    const isFolder = !ext || (!hasKnownExtension && !name.includes('.'));
    
    // Try to extract metadata from markdown
    const metadata = extractMetadataFromMarkdown(markdown, name);
    
    items.push({
      name,
      url,
      isFolder,
      modified: metadata?.modified,
      size: metadata?.size
    });
  }
  
  console.log(`[sync-dropbox] Parsed ${items.length} items from ${links.length} links`);
  return items;
}

// Fallback: parse from markdown if links array is empty
function parseDropboxMarkdown(markdown: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const name = linkMatch[1].trim();
      const url = linkMatch[2].trim();
      
      // Skip navigation links
      if (name === '..' || name === '.' || url.includes('#')) continue;
      
      // CRITICAL: Only process valid Dropbox URLs
      if (!isValidDropboxUrl(url)) continue;
      
      const ext = getFileExtension(name);
      const isFolder = !ext && !name.includes('.');
      const modifiedMatch = line.match(/(\d+\s+days?\s+ago|Last\s+\w+|Yesterday|\d+\s+\w+\s+ago)/i);
      
      items.push({
        name,
        url,
        isFolder,
        modified: modifiedMatch ? modifiedMatch[1] : undefined,
      });
    }
  }
  
  return items;
}

// ============= BACKGROUND SYNC FUNCTION =============
async function performSync(
  supabase: any,
  projectId: string,
  dropboxUrl: string,
  sourceId: string,
  firecrawlApiKey: string
): Promise<void> {
  const result: SyncResult = {
    foldersFound: 0,
    foldersSkipped: 0,
    documentsImported: 0,
    documentsUpdated: 0,
    documentsSkipped: 0,
    documentsHidden: 0,
    pricelistVersionsCreated: 0,
    videoLinksStored: 0,
    urlsFiltered: 0,
    errors: []
  };

  // Clear existing folders for this source
  await supabase
    .from('project_dropbox_folders')
    .delete()
    .eq('dropbox_source_id', sourceId);

  // SMART SYNC: Fetch existing dropbox-synced documents for comparison
  // Instead of deleting, we'll compare and update visibility
  const { data: existingDocs, error: fetchDocsError } = await supabase
    .from('project_documents')
    .select('id, file_name, dropbox_url, dropbox_modified, is_pricelist, visible_public, visible_portal')
    .eq('project_id', projectId)
    .eq('sync_source', 'dropbox');

  if (fetchDocsError) {
    console.error('[sync-dropbox] Error fetching existing documents:', fetchDocsError);
  }

  // Create lookup map: dropbox_url -> existing document
  const existingDocsMap = new Map<string, ExistingDocument>(
    (existingDocs || []).map((doc: ExistingDocument) => [doc.dropbox_url || doc.file_name, doc])
  );
  
  // Track which documents we've seen in this sync
  const processedUrls = new Set<string>();

  console.log(`[sync-dropbox] Found ${existingDocsMap.size} existing dropbox documents for comparison`);

  // Update progress helper
  async function updateProgress(status: string, partialResult?: Partial<SyncResult>) {
    await supabase
      .from('project_dropbox_sources')
      .update({
        sync_status: status,
        sync_log: {
          updated_at: new Date().toISOString(),
          ...result,
          ...partialResult
        }
      })
      .eq('id', sourceId);
  }

  // Recursive scraping function with rate limiting
  async function scrapeFolder(url: string, path: string, depth: number): Promise<void> {
    if (depth > 5) {
      console.log(`[sync-dropbox] Max depth reached at ${path}`);
      return;
    }

    console.log(`[sync-dropbox] Scraping: ${path || 'root'} (depth ${depth})`);
    
    // Update progress before each folder scrape
    await updateProgress('syncing');

    // Rate limit: wait 600ms between Firecrawl calls
    await delay(600);

    try {
      const scrapeResult = await scrapeWithFirecrawl(url, firecrawlApiKey);

      if (!scrapeResult.success) {
        console.error(`[sync-dropbox] Scrape failed for ${path}: ${scrapeResult.error}`);
        result.errors.push(`Failed to scrape: ${path}`);
        return;
      }

      // Use links array (more reliable) with markdown for metadata extraction
      // Fall back to markdown parsing if links array is empty
      const items = scrapeResult.links && scrapeResult.links.length > 0
        ? parseDropboxLinks(scrapeResult.links, scrapeResult.markdown || '')
        : parseDropboxMarkdown(scrapeResult.markdown || '');
      console.log(`[sync-dropbox] Found ${items.length} valid items in ${path || 'root'}`);

      for (const item of items) {
        if (item.isFolder) {
          result.foldersFound++;
          const folderPath = path ? `${path}/${item.name}` : item.name;
          const isMedia = isMediaFolder(item.name);
          const isPricelist = isPricelistFolder(item.name);

          await supabase
            .from('project_dropbox_folders')
            .insert({
              dropbox_source_id: sourceId,
              folder_url: item.url,
              folder_path: folderPath,
              folder_name: item.name,
              folder_type: isMedia ? 'media' : isPricelist ? 'pricelist' : 'documents',
              auto_check: isPricelist,
              skipped: isMedia,
            });

          if (isMedia) {
            console.log(`[sync-dropbox] Skipping media folder: ${folderPath}`);
            result.foldersSkipped++;
          } else {
            await scrapeFolder(item.url, folderPath, depth + 1);
          }
        } else {
          // FILE PROCESSING WITH SMART SYNC
          const ext = getFileExtension(item.name);
          const isVideo = VIDEO_EXTENSIONS.includes(ext);
          const isDocument = DOCUMENT_EXTENSIONS.includes(ext);
          const isImage = IMAGE_EXTENSIONS.includes(ext);
          const isPricelist = isPricelistFile(item.name);
          const documentDate = extractDateFromFilename(item.name);
          
          // Check if current path or any parent folder is a floorplan folder
          const pathParts = path.split('/').filter(Boolean);
          const isInFloorplanFolder = pathParts.some(part => isFloorplanFolder(part));

          // Mark this URL as processed
          const lookupKey = item.url;
          processedUrls.add(lookupKey);

          // Check if document already exists
          const existingDoc = existingDocsMap.get(lookupKey);

          if (isVideo) {
            // VIDEO HANDLING
            if (existingDoc) {
              // Video exists - check if modified
              if (existingDoc.dropbox_modified === item.modified) {
                console.log(`[sync-dropbox] Skipping unchanged video: ${item.name}`);
                result.documentsSkipped++;
                continue;
              }
              // Video changed - update existing record
              const { error: videoUpdateError } = await supabase
                .from('project_documents')
                .update({
                  dropbox_modified: item.modified,
                  document_date: documentDate?.toISOString().split('T')[0],
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingDoc.id);

              if (!videoUpdateError) {
                result.documentsUpdated++;
                console.log(`[sync-dropbox] Updated video: ${item.name}`);
              } else {
                console.error(`[sync-dropbox] Failed to update video ${item.name}:`, videoUpdateError);
                result.errors.push(`Update failed: ${item.name}`);
              }
            } else {
              // New video - insert
              console.log(`[sync-dropbox] Storing new video link: ${item.name}`);
              
              const { error: videoInsertError } = await supabase
                .from('project_documents')
                .insert({
                  project_id: projectId,
                  title: item.name.replace(/\.[^.]+$/, ''),
                  file_name: item.name,
                  file_url: item.url,
                  document_type: 'video_link',
                  dropbox_url: item.url,
                  dropbox_modified: item.modified,
                  document_date: documentDate?.toISOString().split('T')[0],
                  is_pricelist: false,
                  sync_source: 'dropbox',
                  visible_public: false,
                  visible_portal: true,
                });

              if (!videoInsertError) {
                result.videoLinksStored++;
              } else {
                console.error(`[sync-dropbox] Failed to insert video ${item.name}:`, videoInsertError);
                result.errors.push(`Insert failed: ${item.name}`);
              }
            }
          } else if (isDocument || isImage) {
            // DOCUMENT/IMAGE HANDLING
            if (existingDoc) {
              // Document exists - check if modified
              if (existingDoc.dropbox_modified === item.modified) {
                console.log(`[sync-dropbox] Skipping unchanged document: ${item.name}`);
                result.documentsSkipped++;
                continue;
              }

              // Document has changed
              if (isPricelist || existingDoc.is_pricelist) {
                // PRICELIST VERSIONING: Mark old as invisible, insert new version
                console.log(`[sync-dropbox] Creating new pricelist version: ${item.name}`);
                
                // Mark old version as invisible
                const { error: hideOldError } = await supabase
                  .from('project_documents')
                  .update({
                    visible_public: false,
                    visible_portal: false,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingDoc.id);

                if (hideOldError) {
                  console.error(`[sync-dropbox] Failed to hide old pricelist ${item.name}:`, hideOldError);
                }

                // Download and upload new version
                const publicUrl = await downloadAndUploadFile(supabase, item.url, item.name, projectId);
                
                if (publicUrl) {
                  // Determine document type
                  let docType = 'prijslijst';
                  if (ext === '.pdf') docType = 'prijslijst';
                  else if (['.xls', '.xlsx'].includes(ext)) docType = 'prijslijst';

                  const { error: docInsertError } = await supabase
                    .from('project_documents')
                    .insert({
                      project_id: projectId,
                      title: item.name.replace(/\.[^.]+$/, ''),
                      file_name: item.name,
                      file_url: publicUrl,
                      document_type: docType,
                      dropbox_url: item.url,
                      dropbox_modified: item.modified,
                      document_date: documentDate?.toISOString().split('T')[0],
                      is_pricelist: true,
                      sync_source: 'dropbox',
                      visible_public: true,
                      visible_portal: true,
                    });

                  if (!docInsertError) {
                    result.pricelistVersionsCreated++;
                  } else {
                    console.error(`[sync-dropbox] Failed to insert new pricelist version ${item.name}:`, docInsertError);
                    result.errors.push(`Insert failed: ${item.name}`);
                  }
                } else {
                  result.errors.push(`Failed to download: ${item.name}`);
                }
              } else {
                // NON-PRICELIST: Download new version and update existing record
                console.log(`[sync-dropbox] Updating existing document: ${item.name}`);
                
                const publicUrl = await downloadAndUploadFile(supabase, item.url, item.name, projectId);
                
                if (publicUrl) {
                  const { error: docUpdateError } = await supabase
                    .from('project_documents')
                    .update({
                      file_url: publicUrl,
                      dropbox_modified: item.modified,
                      document_date: documentDate?.toISOString().split('T')[0],
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', existingDoc.id);

                  if (!docUpdateError) {
                    result.documentsUpdated++;
                  } else {
                    console.error(`[sync-dropbox] Failed to update document ${item.name}:`, docUpdateError);
                    result.errors.push(`Update failed: ${item.name}`);
                  }
                } else {
                  result.errors.push(`Failed to download: ${item.name}`);
                }
              }
            } else {
              // NEW DOCUMENT: Download and insert
              const publicUrl = await downloadAndUploadFile(supabase, item.url, item.name, projectId);
              
              if (publicUrl) {
                // Use smart document type classification
                const docType = await getDocumentType(
                  supabase,
                  item.name, 
                  ext, 
                  isInFloorplanFolder,
                  isPricelist
                );

                const { error: docInsertError } = await supabase
                  .from('project_documents')
                  .insert({
                    project_id: projectId,
                    title: item.name.replace(/\.[^.]+$/, ''),
                    file_name: item.name,
                    file_url: publicUrl,
                    document_type: docType,
                    dropbox_url: item.url,
                    dropbox_modified: item.modified,
                    document_date: documentDate?.toISOString().split('T')[0],
                    is_pricelist: isPricelist,
                    sync_source: 'dropbox',
                    visible_public: true,
                    visible_portal: true,
                  });

                if (!docInsertError) {
                  result.documentsImported++;
                } else {
                  console.error(`[sync-dropbox] Failed to insert document ${item.name}:`, docInsertError);
                  result.errors.push(`Insert failed: ${item.name}`);
                }

                if (isPricelist && path) {
                  await supabase
                    .from('project_dropbox_folders')
                    .update({ auto_check: true, folder_type: 'pricelist' })
                    .eq('dropbox_source_id', sourceId)
                    .eq('folder_path', path);
                }
              } else {
                result.errors.push(`Failed to download: ${item.name}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`[sync-dropbox] Error scraping ${path}:`, err);
      result.errors.push(`Error scraping ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  try {
    // Start recursive scraping from root
    await scrapeFolder(dropboxUrl, '', 0);

    // SMART SYNC: Mark documents no longer in Dropbox as invisible
    // These are documents that exist in DB but were not found in current Dropbox scrape
    for (const [lookupKey, doc] of existingDocsMap) {
      if (!processedUrls.has(lookupKey) && (doc.visible_public || doc.visible_portal)) {
        console.log(`[sync-dropbox] Hiding document no longer in Dropbox: ${doc.file_name}`);
        
        const { error: hideError } = await supabase
          .from('project_documents')
          .update({
            visible_public: false,
            visible_portal: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id);

        if (!hideError) {
          result.documentsHidden++;
        } else {
          console.error(`[sync-dropbox] Failed to hide document ${doc.file_name}:`, hideError);
        }
      }
    }

    // Update source with completion status
    await supabase
      .from('project_dropbox_sources')
      .update({
        sync_status: 'completed',
        last_full_sync_at: new Date().toISOString(),
        sync_log: {
          completed_at: new Date().toISOString(),
          ...result
        }
      })
      .eq('id', sourceId);

    console.log(`[sync-dropbox] Sync completed:`, result);
  } catch (err) {
    console.error('[sync-dropbox] Background sync failed:', err);
    await supabase
      .from('project_dropbox_sources')
      .update({
        sync_status: 'failed',
        sync_log: {
          failed_at: new Date().toISOString(),
          error: err instanceof Error ? err.message : 'Unknown error',
          ...result
        }
      })
      .eq('id', sourceId);
  }
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, dropbox_url } = await req.json();
    
    if (!project_id || !dropbox_url) {
      return new Response(
        JSON.stringify({ error: 'Missing project_id or dropbox_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the root URL
    if (!isValidDropboxUrl(dropbox_url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Dropbox URL. Please provide a valid shared folder URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-dropbox] Starting background sync for project ${project_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert dropbox source record with 'syncing' status
    const { data: sourceData, error: sourceError } = await supabase
      .from('project_dropbox_sources')
      .upsert({
        project_id,
        dropbox_root_url: dropbox_url,
        sync_status: 'syncing',
        sync_log: { started_at: new Date().toISOString() }
      }, { onConflict: 'project_id' })
      .select()
      .single();

    if (sourceError) {
      console.error('[sync-dropbox] Source upsert error:', sourceError);
      throw new Error(`Failed to create source: ${sourceError.message}`);
    }

    const sourceId = sourceData.id;

    // Start background processing using EdgeRuntime.waitUntil
    // This allows us to return immediately while sync continues
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        performSync(supabase, project_id, dropbox_url, sourceId, firecrawlApiKey)
      );
    } else {
      // Fallback: run in background without waitUntil (may timeout)
      performSync(supabase, project_id, dropbox_url, sourceId, firecrawlApiKey);
    }

    // Return immediately with sync started status
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sync started in background',
        source_id: sourceId,
        status: 'syncing'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-dropbox] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
