import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingSync {
  id: string;
  user_id: string;
  crm_lead_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  attempts: number;
}

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}

/**
 * Search GHL for existing contact by email
 */
async function searchGHLContact(email: string): Promise<GHLContact | null> {
  const ghlApiKey = Deno.env.get("GOHIGHLEVEL_API_KEY");
  const locationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID");
  
  if (!ghlApiKey || !locationId) {
    console.log("[GHL Sync] Missing GHL credentials");
    return null;
  }
  
  try {
    const searchUrl = new URL("https://services.leadconnectorhq.com/contacts/");
    searchUrl.searchParams.set("locationId", locationId);
    searchUrl.searchParams.set("query", email.toLowerCase().trim());
    
    const response = await fetch(searchUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
    });
    
    if (!response.ok) {
      console.log("[GHL Sync] Search failed:", response.status);
      return null;
    }
    
    const data = await response.json();
    const contact = data.contacts?.find(
      (c: any) => c.email?.toLowerCase() === email.toLowerCase().trim()
    );
    
    if (contact) {
      console.log("[GHL Sync] Found existing contact:", contact.id);
      return {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        email: contact.email,
      };
    }
  } catch (error) {
    console.error("[GHL Sync] Search error:", error);
  }
  
  return null;
}

/**
 * Create a new contact in GHL
 */
async function createGHLContact(
  email: string,
  firstName?: string,
  lastName?: string
): Promise<string | null> {
  const ghlApiKey = Deno.env.get("GOHIGHLEVEL_API_KEY");
  const locationId = Deno.env.get("GOHIGHLEVEL_LOCATION_ID");
  
  if (!ghlApiKey || !locationId) {
    console.log("[GHL Sync] Missing GHL credentials for create");
    return null;
  }
  
  try {
    const response = await fetch("https://services.leadconnectorhq.com/contacts/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ghlApiKey}`,
        "Content-Type": "application/json",
        "Version": "2021-07-28",
      },
      body: JSON.stringify({
        locationId,
        email: email.toLowerCase().trim(),
        firstName: firstName || "",
        lastName: lastName || "",
        source: "Top Immo Spain Portal",
        tags: ["portal-signup", "auto-sync"],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log("[GHL Sync] Create failed:", response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log("[GHL Sync] Created new contact:", data.contact?.id);
    return data.contact?.id || null;
  } catch (error) {
    console.error("[GHL Sync] Create error:", error);
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    
    console.log("[GHL Sync] Starting pending sync processing...");
    
    // Fetch pending syncs (max 10 per run, max 3 attempts)
    const { data: pendingSyncs, error: fetchError } = await supabase
      .from("pending_ghl_syncs")
      .select("id, user_id, crm_lead_id, email, first_name, last_name, attempts")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(10);
    
    if (fetchError) {
      throw new Error(`Failed to fetch pending syncs: ${fetchError.message}`);
    }
    
    if (!pendingSyncs || pendingSyncs.length === 0) {
      console.log("[GHL Sync] No pending syncs found");
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending syncs" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[GHL Sync] Processing ${pendingSyncs.length} pending syncs`);
    
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    
    for (const sync of pendingSyncs as PendingSync[]) {
      console.log(`[GHL Sync] Processing sync for: ${sync.email}`);
      
      try {
        // Mark as processing and increment attempts
        await supabase
          .from("pending_ghl_syncs")
          .update({ 
            status: "processing",
            attempts: sync.attempts + 1,
          })
          .eq("id", sync.id);
        
        // First check if CRM lead already has ghl_contact_id
        if (sync.crm_lead_id) {
          const { data: existingLead } = await supabase
            .from("crm_leads")
            .select("ghl_contact_id")
            .eq("id", sync.crm_lead_id)
            .maybeSingle();
          
          if (existingLead?.ghl_contact_id) {
            console.log(`[GHL Sync] Lead already has GHL contact: ${existingLead.ghl_contact_id}`);
            
            // Mark as completed
            await supabase
              .from("pending_ghl_syncs")
              .update({
                status: "completed",
                ghl_contact_id: existingLead.ghl_contact_id,
                processed_at: new Date().toISOString(),
              })
              .eq("id", sync.id);
            
            results.push({ id: sync.id, success: true });
            continue;
          }
        }
        
        // Search for existing GHL contact
        let ghlContact = await searchGHLContact(sync.email);
        let ghlContactId = ghlContact?.id || null;
        
        // Create if not found
        if (!ghlContactId) {
          ghlContactId = await createGHLContact(
            sync.email,
            sync.first_name || undefined,
            sync.last_name || undefined
          );
        }
        
        if (ghlContactId) {
          // Update CRM lead with GHL contact ID
          if (sync.crm_lead_id) {
            const { error: updateError } = await supabase
              .from("crm_leads")
              .update({
                ghl_contact_id: ghlContactId,
                last_ghl_refresh_at: new Date().toISOString(),
                // Also update name if we got it from GHL
                ...(ghlContact?.firstName && { first_name: ghlContact.firstName }),
                ...(ghlContact?.lastName && { last_name: ghlContact.lastName }),
              })
              .eq("id", sync.crm_lead_id);
            
            if (updateError) {
              console.warn(`[GHL Sync] Failed to update CRM lead: ${updateError.message}`);
            }
          } else {
            // Find CRM lead by user_id and update
            const { error: updateError } = await supabase
              .from("crm_leads")
              .update({
                ghl_contact_id: ghlContactId,
                last_ghl_refresh_at: new Date().toISOString(),
              })
              .eq("user_id", sync.user_id);
            
            if (updateError) {
              console.warn(`[GHL Sync] Failed to update CRM lead by user_id: ${updateError.message}`);
            }
          }
          
          // Mark as completed
          await supabase
            .from("pending_ghl_syncs")
            .update({
              status: "completed",
              ghl_contact_id: ghlContactId,
              processed_at: new Date().toISOString(),
            })
            .eq("id", sync.id);
          
          console.log(`[GHL Sync] Successfully synced: ${sync.email} -> ${ghlContactId}`);
          results.push({ id: sync.id, success: true });
        } else {
          // Failed to sync
          const errorMsg = "Could not find or create GHL contact";
          
          // Check if max attempts reached
          if (sync.attempts + 1 >= 3) {
            await supabase
              .from("pending_ghl_syncs")
              .update({
                status: "failed",
                last_error: errorMsg,
                processed_at: new Date().toISOString(),
              })
              .eq("id", sync.id);
          } else {
            // Reset to pending for retry
            await supabase
              .from("pending_ghl_syncs")
              .update({
                status: "pending",
                last_error: errorMsg,
              })
              .eq("id", sync.id);
          }
          
          results.push({ id: sync.id, success: false, error: errorMsg });
        }
      } catch (syncError) {
        console.error(`[GHL Sync] Error processing ${sync.email}:`, syncError);
        
        // Mark as failed or reset to pending
        const errorMsg = String(syncError);
        
        if (sync.attempts + 1 >= 3) {
          await supabase
            .from("pending_ghl_syncs")
            .update({
              status: "failed",
              last_error: errorMsg,
              processed_at: new Date().toISOString(),
            })
            .eq("id", sync.id);
        } else {
          await supabase
            .from("pending_ghl_syncs")
            .update({
              status: "pending",
              last_error: errorMsg,
            })
            .eq("id", sync.id);
        }
        
        results.push({ id: sync.id, success: false, error: errorMsg });
      }
    }
    
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    
    console.log(`[GHL Sync] Completed: ${successCount} success, ${failCount} failed`);
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[GHL Sync] Fatal error:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
