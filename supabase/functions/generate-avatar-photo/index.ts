import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    const { referenceImageUrl, referenceImageUrls, prompt, category, tags, quality } = await req.json();

    // Support both single URL (backward compat) and array
    const imageUrls: string[] = referenceImageUrls && Array.isArray(referenceImageUrls) && referenceImageUrls.length > 0
      ? referenceImageUrls
      : referenceImageUrl
        ? [referenceImageUrl]
        : [];

    if (imageUrls.length === 0 || !prompt || !category) {
      throw new Error("referenceImageUrl(s), prompt, and category are required");
    }

    const selectedQuality = quality === "hd" ? "hd" : "fast";
    const model = selectedQuality === "hd"
      ? "google/gemini-3-pro-image-preview"
      : "google/gemini-3.1-flash-image-preview";

    // Build prompt based on number of reference images
    const multiRef = imageUrls.length > 1;
    const imagePrompt = multiRef
      ? `Based on these ${imageUrls.length} reference photos of the same person, generate a new professional photo of the same person in the following setting: ${prompt}.

Keep the person's appearance, face, and general look consistent with ALL reference photos. Use the multiple angles to get a better understanding of their face and features.
The result should look like a real photograph, not an illustration.
High resolution, professional LinkedIn-quality photo.`
      : `Based on this reference photo of a person, generate a new professional photo of the same person in the following setting: ${prompt}.

Keep the person's appearance, face, and general look consistent with the reference photo.
The result should look like a real photograph, not an illustration.
High resolution, professional LinkedIn-quality photo.`;

    console.log(`Generating avatar photo [${selectedQuality}] with model ${model}, ${imageUrls.length} reference(s), prompt:`, prompt);

    // Build content array with all reference images
    const contentParts: any[] = [
      { type: "text", text: imagePrompt },
      ...imageUrls.map(url => ({
        type: "image_url",
        image_url: { url },
      })),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit bereikt. Probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-credits op. Voeg credits toe in je workspace instellingen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const imageData = aiResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(aiResult).substring(0, 500));
      throw new Error("Geen afbeelding gegenereerd door AI");
    }

    // Upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `ai-avatar-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const filePath = `photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("linkedin-photos")
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Opslag van gegenereerde foto mislukt");
    }

    const { data: { publicUrl } } = supabase.storage
      .from("linkedin-photos")
      .getPublicUrl(filePath);

    // Auto-insert into photo library
    const allTags = ["ai-generated", ...(selectedQuality === "hd" ? ["ai-hd"] : []), ...(tags || [])];
    const { data: photoRecord, error: insertError } = await supabase
      .from("linkedin_photo_library")
      .insert({
        image_url: publicUrl,
        category,
        tags: allTags,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Foto opslaan in bibliotheek mislukt");
    }

    console.log("Avatar photo generated and saved:", publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        photoId: photoRecord.id,
        filePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-avatar-photo:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Onbekende fout",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
