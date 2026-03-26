import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============= PLATFORM DETECTION =============
type Platform = 'dropbox' | 'google_drive' | 'onedrive' | 'generic';

function detectPlatform(url: string): Platform {
  if (/dropbox\.com/i.test(url)) return 'dropbox';
  if (/drive\.google\.com/i.test(url)) return 'google_drive';
  if (/onedrive\.live\.com|sharepoint\.com|1drv\.ms/i.test(url)) return 'onedrive';
  return 'generic';
}

function getPlatformLabel(platform: Platform): string {
  switch (platform) {
    case 'dropbox': return 'Dropbox';
    case 'google_drive': return 'Google Drive';
    case 'onedrive': return 'OneDrive/SharePoint';
    default: return 'online';
  }
}

// ============= AGENT SCHEMA =============
const AGENT_SCHEMA = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      description: 'Lijst van geëxtraheerde bestanden uit de mappenstructuur.',
      items: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'Naam van het bestand' },
          filename_citation: { type: 'string', description: 'Source URL for filename' },
          creation_date: { type: 'string', description: 'Aanmaakdatum van het bestand indien beschikbaar' },
          creation_date_citation: { type: 'string', description: 'Source URL for creation_date' },
          category: { type: 'string', description: 'Categorie van het bestand' },
          category_citation: { type: 'string', description: 'Source URL for category' },
          is_building_plan: { type: 'boolean', description: 'Geeft aan of een afbeelding een bouwplan is (true) of een gewone foto/video (false)' },
          is_building_plan_citation: { type: 'string', description: 'Source URL for is_building_plan' },
          file_link: { type: 'string', description: 'Directe URL naar het bestand' },
          file_link_citation: { type: 'string', description: 'Source URL for file_link' },
          folder_path: { type: 'string', description: 'Het pad van de submap waarin het bestand is gevonden' },
          folder_path_citation: { type: 'string', description: 'Source URL for folder_path' },
        },
        required: ['filename', 'category', 'file_link'],
      },
    },
  },
  required: ['files'],
};

// ============= HELPERS =============

function convertToDirectDownloadUrl(fileUrl: string, platform: Platform): string {
  switch (platform) {
    case 'dropbox': {
      let url = fileUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
      url = url.replace('dropbox.com', 'dl.dropboxusercontent.com');
      if (url.includes('?')) {
        url = url.replace(/dl=0/, 'dl=1');
        if (!url.includes('dl=1')) url += '&dl=1';
      } else {
        url += '?dl=1';
      }
      return url;
    }
    case 'google_drive': {
      const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/d\/([a-zA-Z0-9_-]+)/,
      ];
      for (const pattern of patterns) {
        const match = fileUrl.match(pattern);
        if (match) {
          return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
      }
      return fileUrl;
    }
    case 'onedrive': {
      if (fileUrl.includes('1drv.ms') || fileUrl.includes('onedrive.live.com')) {
        return fileUrl.replace('/redir', '/download');
      }
      if (fileUrl.includes('sharepoint.com')) {
        const separator = fileUrl.includes('?') ? '&' : '?';
        return `${fileUrl}${separator}download=1`;
      }
      return fileUrl;
    }
    default:
      return fileUrl;
  }
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}

function mapCategoryToDocumentType(category: string, isBuildingPlan: boolean, ext: string): string {
  const cat = (category || '').toLowerCase().trim();
  if (cat === 'prijslijst') return 'prijslijst';
  if (cat === 'plannen') return 'floor_plan';
  if (cat === 'brochure') return 'brochure';
  if (isBuildingPlan) return 'floor_plan';
  if (['.xls', '.xlsx'].includes(ext)) return 'prijslijst';
  if (ext === '.pdf') return 'brochure';
  return 'other';
}

function shouldSkipFile(filename: string, category: string, isBuildingPlan: boolean): boolean {
  const ext = getFileExtension(filename);
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];
  const videoExts = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.wmv'];
  if (videoExts.includes(ext)) return true;
  if (imageExts.includes(ext) && !isBuildingPlan) return true;
  return false;
}

async function downloadAndUploadFile(
  supabase: any,
  fileUrl: string,
  fileName: string,
  projectId: string,
  platform: Platform
): Promise<string | null> {
  try {
    const downloadUrl = convertToDirectDownloadUrl(fileUrl, platform);
    console.log(`[sync-v2] Downloading (${platform}): ${fileName}`);
    
    const response = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(30000),
      redirect: 'follow',
    });
    if (!response.ok) {
      console.error(`[sync-v2] Failed to download ${fileName}: ${response.status}`);
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
        upsert: true,
      });
    
    if (error) {
      console.error(`[sync-v2] Upload error for ${fileName}:`, error);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from('project-documents')
      .getPublicUrl(storagePath);
    
    return urlData.publicUrl;
  } catch (err) {
    console.error(`[sync-v2] Error processing ${fileName}:`, err);
    return null;
  }
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

function parseAgentCreationDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const relativeMatch = dateStr.match(/(\d+)\s+(day|week|month|year)s?\s+ago/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();
    if (unit === 'day') now.setDate(now.getDate() - amount);
    else if (unit === 'week') now.setDate(now.getDate() - amount * 7);
    else if (unit === 'month') now.setMonth(now.getMonth() - amount);
    else if (unit === 'year') now.setFullYear(now.getFullYear() - amount);
    return now;
  }
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

const PRICELIST_PATTERNS = [
  /disponibilidad/i, /pricelist/i, /prijslijst/i, /precios/i,
  /tarifa/i, /price[\s_-]*list/i, /lista[\s_-]*de[\s_-]*precios/i, /availability/i,
];

function isPricelistFile(fileName: string): boolean {
  return PRICELIST_PATTERNS.some(p => p.test(fileName));
}

// ============= PROCESS HELPERS =============

const PROCESS_BATCH_SIZE = 5;
const MAX_PROCESS_CALLS = 25; // = 125 files max

async function processFileBatch(
  supabase: any,
  files: any[],
  startIndex: number,
  projectId: string,
  platform: Platform,
  existingByName: Map<string, any>
): Promise<{ processed: number; imported: number; updated: number; pricelistVersions: number; errors: string[] }> {
  const batch = files.slice(startIndex, startIndex + PROCESS_BATCH_SIZE);
  const result = { processed: 0, imported: 0, updated: 0, pricelistVersions: 0, errors: [] as string[] };

  const settled = await Promise.allSettled(
    batch.map(async (file: any) => {
      const filename = file.filename;
      const fileLink = file.file_link;
      const ext = getFileExtension(filename);
      const isBuildingPlan = file.is_building_plan === true;
      const isPricelist = isPricelistFile(filename) || (file.category || '').toLowerCase() === 'prijslijst';
      const docType = mapCategoryToDocumentType(file.category, isBuildingPlan, ext);
      const documentDate = extractDateFromFilename(filename) || parseAgentCreationDate(file.creation_date);
      const existingDoc = existingByName.get(filename);

      if (existingDoc) {
        if (isPricelist || existingDoc.is_pricelist) {
          await supabase
            .from('project_documents')
            .update({ visible_public: false, visible_portal: false, updated_at: new Date().toISOString() })
            .eq('id', existingDoc.id);

          const publicUrl = await downloadAndUploadFile(supabase, fileLink, filename, projectId, platform);
          if (publicUrl) {
            await supabase.from('project_documents').insert({
              project_id: projectId,
              title: filename.replace(/\.[^.]+$/, ''),
              file_name: filename,
              file_url: publicUrl,
              document_type: 'prijslijst',
              dropbox_url: fileLink,
              document_date: documentDate?.toISOString().split('T')[0],
              is_pricelist: true,
              sync_source: platform,
              visible_public: true,
              visible_portal: true,
              folder_path: file.folder_path || null,
            });
            result.pricelistVersions++;
          }
          return;
        }

        const publicUrl = await downloadAndUploadFile(supabase, fileLink, filename, projectId, platform);
        if (publicUrl) {
          await supabase
            .from('project_documents')
            .update({ file_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', existingDoc.id);
          result.updated++;
        }
        return;
      }

      const publicUrl = await downloadAndUploadFile(supabase, fileLink, filename, projectId, platform);
      if (publicUrl) {
        await supabase.from('project_documents').insert({
          project_id: projectId,
          title: filename.replace(/\.[^.]+$/, ''),
          file_name: filename,
          file_url: publicUrl,
          document_type: docType,
          dropbox_url: fileLink,
          document_date: documentDate?.toISOString().split('T')[0],
          is_pricelist: isPricelist,
          sync_source: platform,
          visible_public: true,
          visible_portal: true,
          folder_path: file.folder_path || null,
        });
        result.imported++;
      } else {
        result.errors.push(`Download mislukt: ${filename}`);
      }
    })
  );

  for (const s of settled) {
    if (s.status === 'rejected') {
      console.error('[sync-v2] Batch item failed:', s.reason);
      result.errors.push(s.reason?.message || 'Unknown batch error');
    }
  }

  result.processed = batch.length;
  return result;
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { project_id, dropbox_url, jobId, mode, selected_indices } = body;
    
    const platform: Platform = dropbox_url ? detectPlatform(dropbox_url) : 'dropbox';
    const platformLabel = getPlatformLabel(platform);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl is niet geconfigureerd' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ========== MODE: CANCEL ==========
    if (mode === 'cancel') {
      console.log('[sync-v2] Cancel mode, jobId:', jobId || 'none (process phase)');
      
      // If jobId present, cancel the Firecrawl agent job
      if (jobId) {
        const res = await fetch(`https://api.firecrawl.dev/v2/agent/${jobId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        console.log('[sync-v2] Firecrawl cancel response status:', res.status);
      }

      // Update status in DB
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      if (project_id) {
        await supabase
          .from('project_dropbox_sources')
          .update({ sync_status: 'cancelled' })
          .eq('project_id', project_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODE: PROCESS (new - batch file processing) ==========
    if (mode === 'process' && project_id) {
      console.log('[sync-v2] PROCESS mode for project:', project_id);
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Read current state from DB
      const { data: source, error: sourceError } = await supabase
        .from('project_dropbox_sources')
        .select('sync_status, sync_log, dropbox_root_url')
        .eq('project_id', project_id)
        .single();

      if (sourceError || !source) {
        return new Response(
          JSON.stringify({ success: false, error: 'Geen sync bron gevonden' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (source.sync_status !== 'processing') {
        return new Response(
          JSON.stringify({ success: false, error: `Onverwachte status: ${source.sync_status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const syncLog = source.sync_log as any || {};

      // === P3: STUCK STATE CLEANUP (1h TTL) ===
      const lastProcessAt = syncLog.last_process_at ? new Date(syncLog.last_process_at).getTime() : null;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (lastProcessAt && lastProcessAt < oneHourAgo) {
        console.error('[sync-v2] Stuck state detected: last_process_at older than 1 hour');
        const cleanLog = { ...syncLog, raw_files: undefined, error: 'Sync timeout na 1 uur inactiviteit' };
        delete cleanLog.raw_files;
        await supabase
          .from('project_dropbox_sources')
          .update({ sync_status: 'failed', sync_log: cleanLog })
          .eq('project_id', project_id);

        return new Response(
          JSON.stringify({ success: false, status: 'failed', error: 'Sync timeout na 1 uur inactiviteit' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let rawFiles = syncLog.raw_files || [];
      const processedIndex = syncLog.processed_index || 0;
      
      // If selected_indices provided, filter raw_files to only selected ones (on first call)
      if (selected_indices && Array.isArray(selected_indices) && processedIndex === 0) {
        const selectedSet = new Set(selected_indices as number[]);
        rawFiles = rawFiles.filter((_: any, i: number) => selectedSet.has(i));
        // Update sync_log with filtered files
        syncLog.raw_files = rawFiles;
        syncLog.total_files_to_process = rawFiles.length;
      }
      
      const filePlatform: Platform = syncLog.platform || detectPlatform(source.dropbox_root_url || '');
      const totalFiles = rawFiles.length;

      // Safety: check max calls
      const processCallCount = (syncLog.process_call_count || 0) + 1;
      if (processCallCount > MAX_PROCESS_CALLS) {
        console.error('[sync-v2] Max PROCESS calls exceeded');
        await supabase
          .from('project_dropbox_sources')
          .update({
            sync_status: 'completed_with_errors',
            sync_log: { ...syncLog, error: 'Max process calls exceeded', process_call_count: processCallCount },
          })
          .eq('project_id', project_id);

        return new Response(
          JSON.stringify({ success: false, error: 'Maximum verwerkingscycli bereikt', processed: processedIndex, total: totalFiles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Already done?
      if (processedIndex >= totalFiles) {
        const finalStatus = (syncLog.total_errors || 0) > 0 ? 'completed_with_errors' : 'completed';
        // Clean up raw_files to prevent DB bloat
        const cleanLog = { ...syncLog, raw_files: undefined, files_preview: undefined, process_call_count: processCallCount };
        delete cleanLog.raw_files;
        delete cleanLog.files_preview;
        
        await supabase
          .from('project_dropbox_sources')
          .update({
            sync_status: finalStatus,
            last_full_sync_at: new Date().toISOString(),
            sync_log: cleanLog,
          })
          .eq('project_id', project_id);

        return new Response(
          JSON.stringify({
            success: true,
            status: finalStatus,
            processed: processedIndex,
            total: totalFiles,
            result: {
              documentsImported: syncLog.total_imported || 0,
              documentsUpdated: syncLog.total_updated || 0,
              pricelistVersionsCreated: syncLog.total_pricelist_versions || 0,
              errors: syncLog.all_errors || [],
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch existing docs for dedup
      const { data: existingDocs } = await supabase
        .from('project_documents')
        .select('id, file_name, dropbox_url, is_pricelist, visible_public, visible_portal')
        .eq('project_id', project_id)
        .in('sync_source', ['dropbox', 'google_drive', 'onedrive', 'cloud_sync']);

      const existingByName = new Map(
        (existingDocs || []).map((d: any) => [d.file_name, d])
      );

      // Process batch
      const batchResult = await processFileBatch(supabase, rawFiles, processedIndex, project_id, filePlatform, existingByName);
      const newProcessedIndex = processedIndex + batchResult.processed;

      // Update sync_log with cumulative progress
      const updatedLog = {
        ...syncLog,
        processed_index: newProcessedIndex,
        process_call_count: processCallCount,
        total_imported: (syncLog.total_imported || 0) + batchResult.imported,
        total_updated: (syncLog.total_updated || 0) + batchResult.updated,
        total_pricelist_versions: (syncLog.total_pricelist_versions || 0) + batchResult.pricelistVersions,
        total_errors: (syncLog.total_errors || 0) + batchResult.errors.length,
        all_errors: [...(syncLog.all_errors || []), ...batchResult.errors],
        last_process_at: new Date().toISOString(),
        raw_files: rawFiles, // Keep raw_files until fully done
      };

      const isDone = newProcessedIndex >= totalFiles;
      const finalStatus = isDone
        ? (updatedLog.total_errors > 0 ? 'completed_with_errors' : 'completed')
        : 'processing';

      if (isDone) {
        delete updatedLog.raw_files;
        delete updatedLog.files_preview;
      }

      // === P2: OPTIMISTIC LOCK ===
      // Only update if processed_index hasn't changed (prevents concurrent overwrites)
      const { data: updateResult, error: updateError } = await supabase
        .from('project_dropbox_sources')
        .update({
          sync_status: finalStatus,
          ...(isDone ? { last_full_sync_at: new Date().toISOString() } : {}),
          sync_log: updatedLog,
        })
        .eq('project_id', project_id)
        .filter('sync_log->>processed_index', 'eq', String(processedIndex))
        .select('id');

      // If 0 rows updated, another call already processed this batch
      if (!updateResult || updateResult.length === 0) {
        console.warn('[sync-v2] Optimistic lock failed: batch already processed by concurrent call');
        return new Response(
          JSON.stringify({
            success: true,
            status: 'already_processed',
            processed: processedIndex,
            total: totalFiles,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[sync-v2] PROCESS batch done: ${newProcessedIndex}/${totalFiles} (imported: ${batchResult.imported}, updated: ${batchResult.updated})`);

      return new Response(
        JSON.stringify({
          success: true,
          status: finalStatus,
          processed: newProcessedIndex,
          total: totalFiles,
          batch: batchResult,
          ...(isDone ? {
            result: {
              documentsImported: updatedLog.total_imported,
              documentsUpdated: updatedLog.total_updated,
              pricelistVersionsCreated: updatedLog.total_pricelist_versions,
              errors: updatedLog.all_errors,
            },
          } : {}),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODE: PROCESS-ALL (server-side synchronous) ==========
    if (mode === 'process-all' && project_id) {
      console.log('[sync-v2] PROCESS-ALL mode for project:', project_id);
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { admin_email, admin_name, project_name } = body;

      // Read current state
      const { data: source, error: sourceError } = await supabase
        .from('project_dropbox_sources')
        .select('sync_status, sync_log, dropbox_root_url')
        .eq('project_id', project_id)
        .single();

      if (sourceError || !source) {
        return new Response(
          JSON.stringify({ success: false, error: 'Geen sync bron gevonden' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Concurrency guard: if already being processed recently, skip
      const syncLog = source.sync_log as any || {};
      const lastProcessAt = syncLog.last_process_at ? new Date(syncLog.last_process_at).getTime() : 0;
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      if (source.sync_status === 'processing' && lastProcessAt > twoMinutesAgo && (syncLog.processed_index || 0) > 0) {
        console.log('[sync-v2] PROCESS-ALL skipped: already being processed (last_process_at recent)');
        return new Response(
          JSON.stringify({ success: true, status: 'already_running', message: 'Verwerking is al bezig' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (source.sync_status === 'completed' || source.sync_status === 'completed_with_errors') {
        return new Response(
          JSON.stringify({ success: true, status: 'already_completed', message: 'Sync was al afgerond' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (source.sync_status !== 'processing') {
        return new Response(
          JSON.stringify({ success: false, error: `Onverwachte status: ${source.sync_status}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const rawFiles = syncLog.raw_files || [];
      const filePlatform: Platform = syncLog.platform || detectPlatform(source.dropbox_root_url || '');
      const totalFiles = rawFiles.length;

      if (totalFiles === 0) {
        await supabase
          .from('project_dropbox_sources')
          .update({ sync_status: 'completed', sync_log: { ...syncLog, raw_files: undefined } })
          .eq('project_id', project_id);
        return new Response(
          JSON.stringify({ success: true, status: 'completed', message: 'Geen bestanden te verwerken' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process ALL files synchronously (no fire-and-forget)
      let retryAttempted = syncLog.retry_attempted || false;
      try {
        let processedIndex = syncLog.processed_index || 0;
        let totalImported = syncLog.total_imported || 0;
        let totalUpdated = syncLog.total_updated || 0;
        let totalPricelistVersions = syncLog.total_pricelist_versions || 0;
        let totalErrorCount = syncLog.total_errors || 0;
        let allErrors: string[] = syncLog.all_errors || [];
        const importedFiles: string[] = [];

        // Fetch existing docs for dedup
        const { data: existingDocs } = await supabase
          .from('project_documents')
          .select('id, file_name, dropbox_url, is_pricelist, visible_public, visible_portal')
          .eq('project_id', project_id)
          .in('sync_source', ['dropbox', 'google_drive', 'onedrive', 'cloud_sync']);

        const existingByName = new Map(
          (existingDocs || []).map((d: any) => [d.file_name, d])
        );

        // Process all files in batches
        while (processedIndex < totalFiles) {
          const batchResult = await processFileBatch(supabase, rawFiles, processedIndex, project_id, filePlatform, existingByName);
          processedIndex += batchResult.processed;
          totalImported += batchResult.imported;
          totalUpdated += batchResult.updated;
          totalPricelistVersions += batchResult.pricelistVersions;
          totalErrorCount += batchResult.errors.length;
          allErrors = [...allErrors, ...batchResult.errors];

          // Track imported filenames for email
          const batchFiles = rawFiles.slice(processedIndex - batchResult.processed, processedIndex);
          for (const f of batchFiles) {
            if (!batchResult.errors.some((e: string) => e.includes(f.filename))) {
              importedFiles.push(f.filename);
            }
          }

          // Update sync_log after each batch for visibility
          await supabase
            .from('project_dropbox_sources')
            .update({
              sync_log: {
                ...syncLog,
                processed_index: processedIndex,
                total_imported: totalImported,
                total_updated: totalUpdated,
                total_pricelist_versions: totalPricelistVersions,
                total_errors: totalErrorCount,
                all_errors: allErrors,
                last_process_at: new Date().toISOString(),
                raw_files: rawFiles,
              },
            })
            .eq('project_id', project_id);

          console.log(`[sync-v2] PROCESS-ALL batch: ${processedIndex}/${totalFiles}`);
        }

        // === AUTO-RETRY: If files were found but 0 imported, retry once ===
        if (totalImported === 0 && totalFiles > 0 && !retryAttempted) {
          console.log('[sync-v2] AUTO-RETRY: 0 documents imported from', totalFiles, 'files. Retrying once...');
          retryAttempted = true;
          processedIndex = 0;
          totalErrorCount = 0;
          allErrors = [];
          
          // Update sync_log with retry flag
          await supabase
            .from('project_dropbox_sources')
            .update({
              sync_log: {
                ...syncLog,
                processed_index: 0,
                total_imported: 0,
                total_updated: 0,
                total_errors: 0,
                all_errors: [],
                retry_attempted: true,
                retry_started_at: new Date().toISOString(),
                last_process_at: new Date().toISOString(),
                raw_files: rawFiles,
              },
            })
            .eq('project_id', project_id);

          // Wait 5 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Re-fetch existing docs for dedup
          const { data: retryDocs } = await supabase
            .from('project_documents')
            .select('id, file_name, dropbox_url, is_pricelist, visible_public, visible_portal')
            .eq('project_id', project_id)
            .in('sync_source', ['dropbox', 'google_drive', 'onedrive', 'cloud_sync']);
          
          const retryExistingByName = new Map(
            (retryDocs || []).map((d: any) => [d.file_name, d])
          );

          // Process all files again
          while (processedIndex < totalFiles) {
            const batchResult = await processFileBatch(supabase, rawFiles, processedIndex, project_id, filePlatform, retryExistingByName);
            processedIndex += batchResult.processed;
            totalImported += batchResult.imported;
            totalUpdated += batchResult.updated;
            totalPricelistVersions += batchResult.pricelistVersions;
            totalErrorCount += batchResult.errors.length;
            allErrors = [...allErrors, ...batchResult.errors];

            const batchFiles = rawFiles.slice(processedIndex - batchResult.processed, processedIndex);
            for (const f of batchFiles) {
              if (!batchResult.errors.some((e: string) => e.includes(f.filename))) {
                importedFiles.push(f.filename);
              }
            }

            await supabase
              .from('project_dropbox_sources')
              .update({
                sync_log: {
                  ...syncLog,
                  processed_index: processedIndex,
                  total_imported: totalImported,
                  total_updated: totalUpdated,
                  total_pricelist_versions: totalPricelistVersions,
                  total_errors: totalErrorCount,
                  all_errors: allErrors,
                  last_process_at: new Date().toISOString(),
                  retry_attempted: true,
                  raw_files: rawFiles,
                },
              })
              .eq('project_id', project_id);
          }
        }

        // Done - clean up and finalize
        const finalStatus = totalErrorCount > 0 ? 'completed_with_errors' : 'completed';
        const cleanLog = {
          ...syncLog,
          processed_index: processedIndex,
          total_imported: totalImported,
          total_updated: totalUpdated,
          total_pricelist_versions: totalPricelistVersions,
          total_errors: totalErrorCount,
          all_errors: allErrors,
          last_process_at: new Date().toISOString(),
          background_completed_at: new Date().toISOString(),
          retry_attempted: retryAttempted,
        };
        delete cleanLog.raw_files;
        delete cleanLog.files_preview;

        await supabase
          .from('project_dropbox_sources')
          .update({
            sync_status: finalStatus,
            last_full_sync_at: new Date().toISOString(),
            sync_log: cleanLog,
          })
          .eq('project_id', project_id);

        // === INSERT SYNC HISTORY ===
        const historyStatus = totalErrorCount > 0
          ? (totalImported > 0 ? 'partial' : 'failed')
          : 'success';
        const errorSummary = totalErrorCount > 0
          ? `${totalErrorCount} bestand${totalErrorCount > 1 ? 'en' : ''} kon${totalErrorCount > 1 ? 'den' : ''} niet worden verwerkt`
          : null;

        await supabase
          .from('project_sync_history')
          .insert({
            project_id,
            started_at: syncLog.started_at || new Date().toISOString(),
            completed_at: new Date().toISOString(),
            status: historyStatus,
            files_found: totalFiles,
            files_imported: totalImported,
            files_failed: totalErrorCount,
            error_summary: errorSummary,
            details: allErrors.map((e: string) => ({ error: e })),
            triggered_by: admin_email || null,
          });

        // Send success email notification
        const sendCompletionEmail = async (isSuccess: boolean, errorMessage?: string) => {
          if (!admin_email) return;
          try {
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            if (!resendApiKey) return;
            const resend = new Resend(resendApiKey);
            const pName = project_name || 'Onbekend project';
            const siteUrl = Deno.env.get("SITE_URL") || "https://topimmospain.com";
            const projectUrl = `${siteUrl}/admin/projects/${project_id}`;

            if (isSuccess) {
              const filesTableRows = importedFiles.slice(0, 50).map(f =>
                `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:13px;">${f}</td></tr>`
              ).join('');
              const moreFiles = importedFiles.length > 50 ? `<tr><td style="padding:6px 12px;font-size:13px;color:#888;">...en ${importedFiles.length - 50} andere bestanden</td></tr>` : '';

              const errorsSection = totalErrorCount > 0 ? `
                <div style="margin-top:20px;padding:12px;background-color:#fef2f2;border-radius:8px;border:1px solid #fee2e2;">
                  <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#991b1b;">⚠️ ${totalErrorCount} fout(en)</p>
                  ${allErrors.slice(0, 10).map(e => `<p style="margin:0 0 4px 0;font-size:13px;color:#991b1b;">&bull; ${e}</p>`).join('')}
                  ${allErrors.length > 10 ? `<p style="margin:4px 0 0 0;font-size:13px;color:#888;">...en ${allErrors.length - 10} andere fouten</p>` : ''}
                </div>
              ` : '';

              await resend.emails.send({
                from: "Top Immo Spain <portaal@topimmospain.com>",
                to: [admin_email],
                subject: `✅ Sync voltooid: ${pName}`,
                html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr><td style="padding:30px 40px 15px;text-align:center;border-bottom:1px solid #eee;">
          <img src="https://topimmospain.com/logo-email.png" alt="Top Immo Spain" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="padding:30px 40px;">
          <h1 style="margin:0 0 15px;font-size:22px;font-weight:600;color:#1a1a1a;">Sync voltooid</h1>
          <p style="margin:0 0 5px;font-size:15px;color:#4a4a4a;">Hallo ${admin_name || 'daar'},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#4a4a4a;">De documentsynchronisatie voor <strong>${pName}</strong> is afgerond.</p>
          
          <div style="background-color:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:20px;border:1px solid #bbf7d0;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:4px 0;font-size:14px;color:#166534;"><strong>${totalImported}</strong> geïmporteerd</td>
                <td style="padding:4px 0;font-size:14px;color:#166534;"><strong>${totalUpdated}</strong> bijgewerkt</td>
                <td style="padding:4px 0;font-size:14px;color:#166534;"><strong>${totalPricelistVersions}</strong> prijslijst-versies</td>
              </tr>
            </table>
          </div>

          ${importedFiles.length > 0 ? `
          <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1a1a1a;">Geïmporteerde bestanden:</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden;">
            ${filesTableRows}
            ${moreFiles}
          </table>
          ` : ''}

          ${errorsSection}

          <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:25px;">
            <tr><td align="center">
              <a href="${projectUrl}" style="display:inline-block;padding:14px 28px;background-color:#c45c3e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">
                Bekijk project documenten
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;background-color:#f9f9f9;border-top:1px solid #eee;border-radius:0 0 12px 12px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#8b8b8b;">Top Immo Spain &middot; <a href="https://topimmospain.com" style="color:#c45c3e;text-decoration:none;">topimmospain.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
              });
            } else {
              // Failure email
              await resend.emails.send({
                from: "Top Immo Spain <portaal@topimmospain.com>",
                to: [admin_email],
                subject: `❌ Sync mislukt: ${pName}`,
                html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr><td style="padding:30px 40px 15px;text-align:center;border-bottom:1px solid #eee;">
          <img src="https://topimmospain.com/logo-email.png" alt="Top Immo Spain" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="padding:30px 40px;">
          <h1 style="margin:0 0 15px;font-size:22px;font-weight:600;color:#991b1b;">Sync mislukt</h1>
          <p style="margin:0 0 5px;font-size:15px;color:#4a4a4a;">Hallo ${admin_name || 'daar'},</p>
          <p style="margin:0 0 20px;font-size:15px;color:#4a4a4a;">De documentsynchronisatie voor <strong>${pName}</strong> is mislukt.</p>
          <div style="padding:12px;background-color:#fef2f2;border-radius:8px;border:1px solid #fee2e2;margin-bottom:20px;">
            <p style="margin:0;font-size:14px;color:#991b1b;">${errorMessage || 'Onbekende fout'}</p>
          </div>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:25px;">
            <tr><td align="center">
              <a href="${projectUrl}" style="display:inline-block;padding:14px 28px;background-color:#c45c3e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">
                Bekijk project
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px;background-color:#f9f9f9;border-top:1px solid #eee;border-radius:0 0 12px 12px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#8b8b8b;">Top Immo Spain &middot; <a href="https://topimmospain.com" style="color:#c45c3e;text-decoration:none;">topimmospain.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
              });
            }
            console.log('[sync-v2] Email sent to', admin_email);
          } catch (emailErr) {
            console.error('[sync-v2] Failed to send email:', emailErr);
          }
        };

        await sendCompletionEmail(true);

        return new Response(
          JSON.stringify({ 
            success: true, 
            status: finalStatus, 
            total: totalFiles,
            result: {
              documentsImported: totalImported,
              documentsUpdated: totalUpdated,
              pricelistVersionsCreated: totalPricelistVersions,
              errors: allErrors,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (bgError) {
        console.error('[sync-v2] PROCESS-ALL error:', bgError);
        const errorMsg = bgError instanceof Error ? bgError.message : 'Background processing failed';
        
        // Mark as failed
        await supabase
          .from('project_dropbox_sources')
          .update({
            sync_status: 'failed',
            sync_log: { ...syncLog, error: errorMsg },
          })
          .eq('project_id', project_id);

        // === INSERT FAILED SYNC HISTORY ===
        await supabase
          .from('project_sync_history')
          .insert({
            project_id,
            started_at: syncLog.started_at || new Date().toISOString(),
            completed_at: new Date().toISOString(),
            status: 'failed',
            files_found: syncLog.total_files_to_process || 0,
            files_imported: 0,
            files_failed: 0,
            error_summary: errorMsg,
            triggered_by: admin_email || null,
          });

        // Send failure email
        if (admin_email) {
          try {
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            if (resendApiKey) {
              const resend = new Resend(resendApiKey);
              const pName = project_name || 'Onbekend project';
              const siteUrl = Deno.env.get("SITE_URL") || "https://topimmospain.com";
              const projectUrl = `${siteUrl}/admin/projects/${project_id}`;
              await resend.emails.send({
                from: "Top Immo Spain <portaal@topimmospain.com>",
                to: [admin_email],
                subject: `❌ Sync mislukt: ${pName}`,
                html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f5f5f5;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr><td style="padding:30px 40px 15px;text-align:center;border-bottom:1px solid #eee;">
          <img src="https://topimmospain.com/logo-email.png" alt="Top Immo Spain" style="height:50px;width:auto;" />
        </td></tr>
        <tr><td style="padding:30px 40px;">
          <h1 style="margin:0 0 15px;font-size:22px;font-weight:600;color:#991b1b;">Sync mislukt</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#4a4a4a;">De documentsynchronisatie voor <strong>${pName}</strong> is mislukt:</p>
          <div style="padding:12px;background-color:#fef2f2;border-radius:8px;border:1px solid #fee2e2;">
            <p style="margin:0;font-size:14px;color:#991b1b;">${errorMsg}</p>
          </div>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:25px;">
            <tr><td align="center">
              <a href="${projectUrl}" style="display:inline-block;padding:14px 28px;background-color:#c45c3e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;">Bekijk project</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
              });
            }
          } catch (emailErr) {
            console.error('[sync-v2] Failed to send failure email:', emailErr);
          }
        }

        return new Response(
          JSON.stringify({ success: false, status: 'failed', error: errorMsg }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ========== MODE: POLL ==========
    if (jobId) {
      console.log('[sync-v2] Polling agent job:', jobId);
      
      const res = await fetch(`https://api.firecrawl.dev/v2/agent/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const data = await res.json();
      console.log(`[sync-v2] Agent status: ${data.status}`);

      if (data.status === 'completed') {
        // Parse result - but DO NOT process files here anymore
        const extracted = data.data?.json || data.data?.output || data.output || data.data || {};
        const allFiles = Array.isArray(extracted.files) ? extracted.files : [];
        
        console.log(`[sync-v2] Agent found ${allFiles.length} files total`);

        // Filter files (skip videos/photos that aren't building plans)
        const filesToProcess = allFiles.filter((f: any) => {
          if (!f.filename || !f.file_link) return false;
          if (shouldSkipFile(f.filename, f.category, f.is_building_plan === true)) return false;
          return true;
        });

        console.log(`[sync-v2] ${filesToProcess.length} files to process (skipped ${allFiles.length - filesToProcess.length})`);

        if (project_id) {
          // Save raw files to sync_log and set status to 'processing'
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Read existing sync_log to preserve jobId etc.
          const { data: source } = await supabase
            .from('project_dropbox_sources')
            .select('sync_log')
            .eq('project_id', project_id)
            .single();

          const existingLog = (source?.sync_log as any) || {};
          const platform = existingLog.platform || 'dropbox';

          // Build files_preview for persistence
          const filesPreview = filesToProcess.map((f: any, i: number) => ({
            index: i,
            filename: f.filename,
            category: f.category || 'andere',
            folder_path: f.folder_path || '',
            is_building_plan: f.is_building_plan === true,
          }));

          await supabase
            .from('project_dropbox_sources')
            .update({
              sync_status: 'processing',
              sync_log: {
                ...existingLog,
                raw_files: filesToProcess,
                files_preview: filesPreview, // Persist for resume after navigation
                processed_index: 0,
                process_call_count: 0,
                total_imported: 0,
                total_updated: 0,
                total_pricelist_versions: 0,
                total_errors: 0,
                all_errors: [],
                agent_completed_at: new Date().toISOString(),
                total_agent_files: allFiles.length,
                total_files_to_process: filesToProcess.length,
              },
            })
            .eq('project_id', project_id);
        }

        return new Response(
          JSON.stringify({
            success: true,
            status: 'completed',
            files_found: filesToProcess.length,
            files_skipped: allFiles.length - filesToProcess.length,
            files_preview: filesToProcess.map((f: any, i: number) => ({
              index: i,
              filename: f.filename,
              category: f.category || 'andere',
              folder_path: f.folder_path || '',
              is_building_plan: f.is_building_plan === true,
            })),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (data.status === 'failed' || data.status === 'cancelled') {
        // Update DB status
        if (project_id) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from('project_dropbox_sources')
            .update({ sync_status: data.status === 'cancelled' ? 'cancelled' : 'failed' })
            .eq('project_id', project_id);
        }

        return new Response(
          JSON.stringify({ success: false, status: data.status, error: data.error || 'Agent job failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Still running
      return new Response(
        JSON.stringify({ success: true, status: 'polling' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODE: START ==========
    if (!project_id || !dropbox_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'project_id en dropbox_url zijn verplicht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Extraheer de bestandsnaam, aanmaakdatum en directe link van alle bestanden uit de opgegeven ${platformLabel}-map en alle bijbehorende submappen: ${dropbox_url}. Categoriseer elk bestand als 'prijslijst', 'plannen', 'brochure' of 'andere' op basis van de context van de mapnaam en bestandsnaam. Sla video's en algemene foto's van de woning over, maar behoud afbeeldingen (jpg/png) die specifiek als bouwplan dienen.`;

    console.log(`[sync-v2] Starting agent for (${platform}):`, dropbox_url);

    const agentRes = await fetch('https://api.firecrawl.dev/v2/agent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [dropbox_url],
        prompt,
        schema: AGENT_SCHEMA,
        model: 'spark-1-mini',
      }),
    });

    const agentData = await agentRes.json();

    if (!agentRes.ok) {
      console.error('[sync-v2] Agent start failed:', agentData);
      return new Response(
        JSON.stringify({ success: false, error: agentData.error || 'Agent kon niet worden gestart' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newJobId = agentData.id || agentData.jobId;
    console.log('[sync-v2] Agent job started:', newJobId);

    // Update source status with jobId persisted in sync_log
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from('project_dropbox_sources')
      .upsert({
        project_id,
        dropbox_root_url: dropbox_url,
        sync_status: 'syncing_v2',
        sync_log: { started_at: new Date().toISOString(), method: 'v2_agent', platform, jobId: newJobId },
      }, { onConflict: 'project_id' });

    if (upsertError) {
      console.error('[sync-v2] Failed to upsert dropbox source:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${upsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, jobId: newJobId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-v2] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Onbekende fout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
