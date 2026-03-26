import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  prompt?: string;
  platform?: string;
  postContent?: string;
  projectName?: string;
}

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
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      throw new Error("Admin access required");
    }

    const { prompt, platform, postContent, projectName } = await req.json() as GenerateRequest;

    // Build comprehensive prompt
    const platformFormats: Record<string, string> = {
      linkedin: "professional landscape 1200x627 format",
      facebook: "engaging landscape 1200x630 format",
      instagram: "eye-catching square 1080x1080 format",
    };

    const imagePrompt = prompt || `
      Create a stunning social media image for ${platform || "linkedin"} about real estate investment in Spain.
      
      Style: Modern, Mediterranean, inviting, professional
      Colors: Blues, whites, sandy tones, sunset oranges
      Elements: Include elements that suggest luxury living, coastal Spain, investment opportunity
      
      ${projectName ? `Project context: ${projectName}` : ""}
      ${postContent ? `Post theme: ${postContent.substring(0, 200)}` : ""}
      
      Format: ${platformFormats[platform || "linkedin"] || platformFormats.linkedin}
      
      IMPORTANT: No text overlays. Pure visual imagery that evokes Mediterranean luxury and investment potential.
      Ultra high resolution.
    `;

    console.log("Generating image with prompt:", imagePrompt.substring(0, 200));

    // Call Lovable AI for image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits.");
      }
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log("AI response received");

    // Extract the base64 image
    const imageData = aiResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(aiResult));
      throw new Error("No image generated");
    }

    // Upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    const filePath = `generated/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("social-media-images")
      .upload(filePath, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to save generated image");
    }

    const { data: { publicUrl } } = supabase.storage
      .from("social-media-images")
      .getPublicUrl(filePath);

    console.log("Image uploaded successfully:", publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        prompt: imagePrompt.substring(0, 200),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-social-image:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
