import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Document type detection based on folder names
const FOLDER_TYPE_PATTERNS: { [key: string]: RegExp } = {
  grondplan: /planos?|grondplan|layouts?|plant|blueprints?|floor\s*plan/i,
  pricelist: /preci|prijs|tarifas|pricelist|prijslijst|price/i,
  brochure: /brochure|folder|commercial|marketing/i,
  beschikbaarheidslijst: /disponib|beschikbaar|availability|available/i,
  masterplan: /masterplan|site\s*plan|ubicacion/i,
  specificaties: /specs|specificat|technical|technisch/i,
};

// Media folder patterns to skip
const MEDIA_FOLDER_PATTERNS = [
  /fotos?|photos?|images?|afbeelding/i,
  /renders?|3d|visual/i,
  /videos?|media/i,
  /thumb|preview|gallery/i,
];

// Valid document extensions
const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];

// Image extensions (for filtering)
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "heic", "svg"];

interface ZipEntry {
  name: string;
  isDirectory: boolean;
  content?: Uint8Array;
}

interface ExtractResult {
  success: boolean;
  documentsImported: number;
  documentsSkipped: number;
  foldersFiltered: number;
  errors: string[];
}

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function isMediaFolder(folderPath: string): boolean {
  const parts = folderPath.split("/");
  return parts.some((part) => MEDIA_FOLDER_PATTERNS.some((pattern) => pattern.test(part)));
}

function detectDocumentType(filePath: string): string {
  const parts = filePath.split("/");
  // Check parent folders for type hints
  for (const part of parts.slice(0, -1)) {
    for (const [type, pattern] of Object.entries(FOLDER_TYPE_PATTERNS)) {
      if (pattern.test(part)) {
        return type;
      }
    }
  }
  return "andere";
}

function isValidDocument(filename: string): boolean {
  const ext = getFileExtension(filename);
  return DOCUMENT_EXTENSIONS.includes(ext);
}

function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return IMAGE_EXTENSIONS.includes(ext);
}

// Simple ZIP extraction using raw binary parsing
// ZIP format: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
async function extractZipEntries(zipBuffer: ArrayBuffer): Promise<ZipEntry[]> {
  const entries: ZipEntry[] = [];
  const view = new DataView(zipBuffer);
  const bytes = new Uint8Array(zipBuffer);
  
  let offset = 0;
  const maxOffset = bytes.length - 4;
  
  while (offset < maxOffset) {
    // Look for local file header signature (0x04034b50)
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x03 &&
      bytes[offset + 3] === 0x04
    ) {
      try {
        // Parse local file header
        const generalPurposeBitFlag = view.getUint16(offset + 6, true);
        const compressionMethod = view.getUint16(offset + 8, true);
        const compressedSize = view.getUint32(offset + 18, true);
        const uncompressedSize = view.getUint32(offset + 22, true);
        const fileNameLength = view.getUint16(offset + 26, true);
        const extraFieldLength = view.getUint16(offset + 28, true);
        
        // Get filename
        const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLength);
        const fileName = new TextDecoder("utf-8").decode(fileNameBytes);
        
        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;
        const isDirectory = fileName.endsWith("/") || uncompressedSize === 0;
        
        // We only support stored (uncompressed) files for now
        // Compression method 0 = stored, 8 = deflate
        if (compressionMethod === 0 && !isDirectory && compressedSize > 0) {
          const content = bytes.slice(dataOffset, dataOffset + compressedSize);
          entries.push({
            name: fileName,
            isDirectory: false,
            content,
          });
        } else if (isDirectory) {
          entries.push({
            name: fileName,
            isDirectory: true,
          });
        } else if (compressionMethod === 8) {
          // Deflate compressed - we'll skip these and log
          console.log(`[extract-zip] Skipping compressed file (deflate): ${fileName}`);
          entries.push({
            name: fileName,
            isDirectory: false,
            // No content - compressed
          });
        }
        
        // Move to next entry
        offset = dataOffset + compressedSize;
      } catch (e) {
        console.error(`[extract-zip] Error parsing entry at offset ${offset}:`, e);
        offset++;
      }
    } else {
      offset++;
    }
  }
  
  return entries;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, zipStoragePath, skipMediaFolders = true } = await req.json();

    if (!projectId || !zipStoragePath) {
      return new Response(
        JSON.stringify({ success: false, error: "projectId en zipStoragePath zijn verplicht" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[extract-zip] Starting extraction for project ${projectId}`);
    console.log(`[extract-zip] ZIP path: ${zipStoragePath}`);
    console.log(`[extract-zip] Skip media folders: ${skipMediaFolders}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download ZIP from temp-uploads bucket
    const { data: zipData, error: downloadError } = await supabase.storage
      .from("temp-uploads")
      .download(zipStoragePath);

    if (downloadError || !zipData) {
      console.error("[extract-zip] Failed to download ZIP:", downloadError);
      return new Response(
        JSON.stringify({ success: false, error: "Kan ZIP bestand niet downloaden" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[extract-zip] Downloaded ZIP, size: ${zipData.size} bytes`);

    // Extract ZIP entries
    const zipBuffer = await zipData.arrayBuffer();
    const entries = await extractZipEntries(zipBuffer);
    
    console.log(`[extract-zip] Found ${entries.length} entries in ZIP`);

    const result: ExtractResult = {
      success: true,
      documentsImported: 0,
      documentsSkipped: 0,
      foldersFiltered: 0,
      errors: [],
    };

    // Track filtered folders
    const filteredFolders = new Set<string>();

    // Get existing documents to avoid duplicates
    const { data: existingDocs } = await supabase
      .from("project_documents")
      .select("file_name")
      .eq("project_id", projectId);

    const existingFileNames = new Set(existingDocs?.map((d) => d.file_name) || []);

    // Process each entry
    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const fileName = entry.name.split("/").pop() || entry.name;
      
      // Skip hidden files
      if (fileName.startsWith(".") || fileName.startsWith("__MACOSX")) {
        console.log(`[extract-zip] Skipping hidden/system file: ${entry.name}`);
        result.documentsSkipped++;
        continue;
      }

      // Skip media folders if enabled
      if (skipMediaFolders && isMediaFolder(entry.name)) {
        const folderPath = entry.name.split("/").slice(0, -1).join("/");
        if (!filteredFolders.has(folderPath)) {
          filteredFolders.add(folderPath);
          console.log(`[extract-zip] Filtering media folder: ${folderPath}`);
        }
        result.documentsSkipped++;
        continue;
      }

      // Skip image files
      if (isImageFile(fileName)) {
        console.log(`[extract-zip] Skipping image file: ${fileName}`);
        result.documentsSkipped++;
        continue;
      }

      // Only process valid documents
      if (!isValidDocument(fileName)) {
        console.log(`[extract-zip] Skipping non-document file: ${fileName}`);
        result.documentsSkipped++;
        continue;
      }

      // Skip if no content (compressed)
      if (!entry.content || entry.content.length === 0) {
        console.log(`[extract-zip] Skipping file without content (likely compressed): ${fileName}`);
        result.documentsSkipped++;
        result.errors.push(`${fileName}: gecomprimeerd bestand niet ondersteund`);
        continue;
      }

      // Check for duplicates
      if (existingFileNames.has(fileName)) {
        console.log(`[extract-zip] Skipping duplicate: ${fileName}`);
        result.documentsSkipped++;
        continue;
      }

      try {
        // Upload to storage
        const storagePath = `${projectId}/${Date.now()}_${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("project-documents")
          .upload(storagePath, entry.content, {
            contentType: getContentType(fileName),
            upsert: false,
          });

        if (uploadError) {
          console.error(`[extract-zip] Upload error for ${fileName}:`, uploadError);
          result.errors.push(`${fileName}: upload mislukt`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("project-documents")
          .getPublicUrl(storagePath);

        // Detect document type
        const documentType = detectDocumentType(entry.name);
        const title = fileName.replace(/\.[^/.]+$/, "");

        // Create document record
        const { error: insertError } = await supabase.from("project_documents").insert({
          project_id: projectId,
          title,
          file_url: urlData.publicUrl,
          file_name: fileName,
          file_size: entry.content.length,
          document_type: documentType,
          visible_public: true,
          visible_portal: true,
          sync_source: "zip_upload",
          is_pricelist: documentType === "pricelist",
        });

        if (insertError) {
          console.error(`[extract-zip] Insert error for ${fileName}:`, insertError);
          result.errors.push(`${fileName}: database insert mislukt`);
          continue;
        }

        console.log(`[extract-zip] Imported: ${fileName} (type: ${documentType})`);
        result.documentsImported++;
        existingFileNames.add(fileName);
      } catch (e) {
        console.error(`[extract-zip] Error processing ${fileName}:`, e);
        result.errors.push(`${fileName}: ${e instanceof Error ? e.message : "onbekende fout"}`);
      }
    }

    result.foldersFiltered = filteredFolders.size;

    // Clean up: delete the ZIP file from temp-uploads bucket
    try {
      await supabase.storage.from("temp-uploads").remove([zipStoragePath]);
      console.log(`[extract-zip] Cleaned up ZIP file: ${zipStoragePath}`);
    } catch (e) {
      console.warn(`[extract-zip] Failed to clean up ZIP file:`, e);
    }

    console.log(`[extract-zip] Complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[extract-zip] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Onbekende fout",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getContentType(filename: string): string {
  const ext = getFileExtension(filename);
  const types: { [key: string]: string } = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return types[ext] || "application/octet-stream";
}
