import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

const CHUNK_THRESHOLD = 4000;
const MAX_CHUNK_SIZE = 5000;

function chunkTranscript(transcript: string): string[] {
  if (transcript.length <= CHUNK_THRESHOLD) return [transcript];
  
  const sentences = transcript.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  
  for (const sentence of sentences) {
    if (current.length + sentence.length > MAX_CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence + " ";
  }
  if (current.trim()) chunks.push(current.trim());
  
  return chunks.length > 0 ? chunks : [transcript];
}

// Map file extension to Gemini-compatible audio format
function getAudioFormat(storagePath: string): { mimeType: string; format: string } {
  const ext = storagePath.split(".").pop()?.toLowerCase() || "";
  const formatMap: Record<string, { mimeType: string; format: string }> = {
    webm: { mimeType: "audio/webm", format: "webm" },
    mp3: { mimeType: "audio/mpeg", format: "mp3" },
    m4a: { mimeType: "audio/mp4", format: "mp3" }, // Gemini treats m4a as mp3-compatible
    ogg: { mimeType: "audio/ogg", format: "webm" }, // Gemini treats ogg similar to webm
    wav: { mimeType: "audio/wav", format: "wav" },
  };
  return formatMap[ext] || { mimeType: "audio/mpeg", format: "mp3" };
}

async function callAI(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    throw { status: response.status, message: errorText };
  }
  
  return response.json();
}

async function transcribeAudio(apiKey: string, base64Audio: string, format: string, roomName: string): Promise<string> {
  console.log("Phase A: Starting transcription...");
  
  const result = await callAI(apiKey, {
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: `Je bent een transcriptie-expert. Maak een volledige, gedetailleerde transcriptie van deze spraakopname van een woninginspectie in de ruimte "${roomName}". Schrijf alles uit wat er gezegd wordt, inclusief alle details, observaties en opmerkingen. Laat niets weg. De taal is Nederlands.`,
      },
      {
        role: "user",
        content: [
          {
            type: "input_audio",
            input_audio: { data: base64Audio, format },
          },
          {
            type: "text",
            text: "Maak een volledige transcriptie van deze opname. Schrijf elk woord uit, inclusief alle observaties, details en opmerkingen over de inspectie.",
          },
        ],
      },
    ],
  });
  
  const transcript = result.choices?.[0]?.message?.content;
  if (!transcript) throw new Error("No transcription received from AI");
  
  console.log(`Phase A complete: transcript length = ${transcript.length} chars`);
  return transcript;
}

interface ExtractedItem {
  item_name: string;
  status: "ok" | "defect";
  severity?: "minor" | "major" | "critical";
  notes: string;
}

async function extractItemsFromChunk(apiKey: string, chunkText: string, roomName: string, chunkIndex: number, totalChunks: number): Promise<ExtractedItem[]> {
  console.log(`Phase B: Extracting items from chunk ${chunkIndex + 1}/${totalChunks} (${chunkText.length} chars)...`);
  
  const result = await callAI(apiKey, {
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: `Je bent een expert in woninginspecties. Je analyseert transcripties van inspectie-opnames en extraheert ELKE individuele observatie als apart item. 

STRIKTE REGELS:
- Maak een APART item voor ELKE observatie, ook als ze op dezelfde locatie zijn.
- NIET samenvatten of clusteren. Elk punt apart.
- Neem zowel positieve (OK) als negatieve (defect) observaties op.
- Gebruik een korte, specifieke item_name (bijv. "Scheurtje boven deur", "Stopcontact werkt niet").
- Gebruik uitgebreide notes met alle details die in de transcriptie staan.
- Als er twijfel is, maak er liever te veel items van dan te weinig.

Dit is deel ${chunkIndex + 1} van ${totalChunks} van een transcriptie voor ruimte "${roomName}".`,
      },
      {
        role: "user",
        content: `Extraheer ALLE individuele inspectie-observaties uit deze transcriptie. Maak voor elk punt een apart item:\n\n${chunkText}`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "extract_inspection_items",
          description: "Extraheer individuele inspectie-items uit de transcriptie",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item_name: { type: "string", description: "Korte specifieke titel van het observatiepunt" },
                    status: { type: "string", enum: ["ok", "defect"], description: "Status: ok of defect" },
                    severity: { type: "string", enum: ["minor", "major", "critical"], description: "Ernst (alleen bij defect)" },
                    notes: { type: "string", description: "Uitgebreide beschrijving/notities" },
                  },
                  required: ["item_name", "status", "notes"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "extract_inspection_items" } },
  });
  
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("No structured output from extraction");
  
  const parsed = JSON.parse(toolCall.function.arguments);
  console.log(`Phase B chunk ${chunkIndex + 1}: extracted ${parsed.items?.length || 0} items`);
  return parsed.items || [];
}

function deduplicateItems(items: ExtractedItem[]): ExtractedItem[] {
  const seen = new Map<string, ExtractedItem>();
  for (const item of items) {
    const key = item.item_name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, item);
    } else {
      const existing = seen.get(key)!;
      if (item.notes && !existing.notes.includes(item.notes)) {
        existing.notes += " " + item.notes;
      }
      if (item.status === "defect") existing.status = "defect";
      if (item.severity === "critical" || (item.severity === "major" && existing.severity !== "critical")) {
        existing.severity = item.severity;
      }
    }
  }
  return Array.from(seen.values());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cache recordingId outside try for error handling
  let recordingId: string | undefined;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    recordingId = body.recordingId;
    if (!recordingId) throw new Error("recordingId is required");

    // Get recording
    const { data: recording, error: recError } = await supabase
      .from("snagging_voice_recordings")
      .select("*")
      .eq("id", recordingId)
      .single();
    if (recError || !recording) throw new Error("Recording not found");

    // === CONCURRENCY GUARD: Only process if status is pending or failed ===
    if (recording.status !== "pending" && recording.status !== "failed") {
      console.log(`Skipping: recording ${recordingId} has status "${recording.status}"`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: `Status is ${recording.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await supabase.from("snagging_voice_recordings")
      .update({ status: "processing", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", recordingId);

    // === CHECK: Reuse existing transcript if available (skip Phase A on retry) ===
    let transcript = recording.transcript as string | null;

    if (transcript && transcript.length > 50) {
      console.log(`Reusing existing transcript (${transcript.length} chars), skipping Phase A`);
    } else {
      // Download audio
      const { data: audioData, error: dlError } = await supabase.storage
        .from("snagging-voice")
        .download(recording.storage_path);
      if (dlError || !audioData) throw new Error("Failed to download audio: " + dlError?.message);

      const arrayBuffer = await audioData.arrayBuffer();
      const fileSizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
      console.log(`Audio file size: ${fileSizeMB}MB`);
      
      const base64Audio = arrayBufferToBase64(arrayBuffer);
      const { format } = getAudioFormat(recording.storage_path);

      // === PHASE A: Transcription ===
      transcript = await transcribeAudio(lovableApiKey, base64Audio, format, recording.room_name);

      // Save transcript immediately (so retries can skip Phase A)
      await supabase.from("snagging_voice_recordings")
        .update({ transcript, updated_at: new Date().toISOString() })
        .eq("id", recordingId);
    }

    // === PHASE B: Extraction with chunking ===
    const chunks = chunkTranscript(transcript);
    console.log(`Splitting transcript into ${chunks.length} chunk(s) for extraction`);

    let allItems: ExtractedItem[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkItems = await extractItemsFromChunk(lovableApiKey, chunks[i], recording.room_name, i, chunks.length);
      allItems = allItems.concat(chunkItems);
    }

    // Deduplicate
    let items = deduplicateItems(allItems);
    console.log(`Final result: ${items.length} unique items from ${allItems.length} raw items (${chunks.length} chunks)`);

    // === GUARDRAIL: Under-extraction check ===
    if (transcript.length > 500 && items.length <= 1) {
      console.log("GUARDRAIL: Under-extraction detected, retrying with stricter prompt...");
      
      const retryItems = await extractItemsFromChunk(
        lovableApiKey,
        transcript,
        recording.room_name,
        0, 1
      );
      
      if (retryItems.length > items.length) {
        console.log(`Retry produced ${retryItems.length} items (was ${items.length})`);
        items = deduplicateItems(retryItems);
      }
    }

    // Save results
    await supabase.from("snagging_voice_recordings")
      .update({
        transcript,
        ai_items: items,
        status: "completed",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordingId);

    console.log(`Analysis complete: ${items.length} items, transcript ${transcript.length} chars`);

    return new Response(JSON.stringify({ success: true, transcript, items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analyze-snagging-voice error:", e);
    
    // Use cached recordingId — no req.clone() needed
    if (recordingId) {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const errorMsg = e?.status === 429
          ? "Rate limit bereikt, probeer later opnieuw"
          : (e instanceof Error ? e.message : e?.message || "Unknown error");
        
        await supabase.from("snagging_voice_recordings").update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        }).eq("id", recordingId);
      } catch (updateErr) {
        console.error("Failed to update recording status:", updateErr);
      }
    }

    const status = e?.status === 429 ? 429 : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : e?.message || "Unknown error" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
