import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

// ============================================================================
// SIMPLIFIED CENTRALIZED ACCOUNT CREATION HELPER
// All edge functions should use this for consistent account creation/linking
// 
// SIMPLIFIED ARCHITECTURE:
// - This helper ONLY handles user creation/lookup
// - Database trigger handles CRM lead linking automatically
// - Database trigger queues GHL sync automatically
// ============================================================================

export interface CreateUserAccountOptions {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  skipGhlSync?: boolean;
  source?: string;
}

export interface CreateUserAccountResult {
  userId: string | null;
  created: boolean;
  linked: boolean;
  needsName: boolean;
  error?: string;
}

/**
 * Look up existing user by email in profiles table (faster than listUsers)
 */
async function findExistingUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  
  return data?.id || null;
}

/**
 * SIMPLIFIED: Centralized helper for creating or linking user accounts.
 * 
 * Flow:
 * 1. Check for existing user via profiles table
 * 2. Create new auth user if not exists (triggers handle the rest)
 * 3. Return userId
 * 
 * Database triggers automatically handle:
 * - CRM lead linking/creation (create_crm_lead_for_new_user)
 * - Journey milestones creation (auto_create_journey_milestones)
 * - Customer profile creation (auto_create_journey_milestones)
 * - GHL sync queueing (pending_ghl_syncs table)
 */
export async function createOrLinkUserAccount(
  supabase: SupabaseClient,
  options: CreateUserAccountOptions
): Promise<CreateUserAccountResult> {
  const { 
    email, 
    firstName, 
    lastName, 
    phone,
    skipGhlSync = false,
  } = options;
  
  const normalizedEmail = email?.toLowerCase().trim();
  
  if (!normalizedEmail) {
    return { 
      userId: null, 
      created: false, 
      linked: false, 
      needsName: true,
      error: "Email is required" 
    };
  }

  try {
    console.log(`[Helper] Processing account for: ${normalizedEmail}`);
    
    // =========================================================================
    // STEP 1: Check for existing user via profiles table
    // =========================================================================
    
    const existingUserId = await findExistingUserByEmail(supabase, normalizedEmail);
    
    if (existingUserId) {
      console.log(`[Helper] Found existing user via profiles: ${existingUserId}`);
      
      // Check if profile has name
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", existingUserId)
        .maybeSingle();
      
      const needsName = !profile?.first_name || !profile?.last_name;
      
      return {
        userId: existingUserId,
        created: false,
        linked: true,
        needsName,
      };
    }
    
    // =========================================================================
    // STEP 2: Create new auth user
    // Database trigger will handle:
    // - CRM lead linking/creation
    // - Journey milestones
    // - Customer profile
    // - GHL sync queue
    // =========================================================================
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || "",
        last_name: lastName || "",
        phone: phone || "",
        skip_ghl_sync: skipGhlSync, // Passed to trigger via raw_user_meta_data
      },
    });

    if (!createError && newUser?.user) {
      console.log(`[Helper] Created new user: ${newUser.user.id}`);
      
      const needsName = !firstName || !lastName;
      
      return {
        userId: newUser.user.id,
        created: true,
        linked: false,
        needsName,
      };
    }
    
    // =========================================================================
    // STEP 3: Handle "user already exists" error
    // =========================================================================
    
    if (createError) {
      const errorMsg = createError.message?.toLowerCase() || "";
      const alreadyExists = errorMsg.includes("already") || 
                            errorMsg.includes("exists") ||
                            errorMsg.includes("duplicate") ||
                            (createError as any).status === 422;
      
      if (alreadyExists) {
        // User exists in auth but not in profiles - find via listUsers with retry
        console.log("[Helper] User exists in auth, fetching with retry...");
        
        // Retry logic with exponential backoff
        const maxRetries = 3;
        const delays = [100, 300, 600]; // ms
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          if (attempt > 0) {
            console.log(`[Helper] Retry attempt ${attempt + 1}/${maxRetries} after ${delays[attempt - 1]}ms`);
            await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
          }
          
          const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
          
          if (listError) {
            console.error(`[Helper] listUsers error on attempt ${attempt + 1}:`, listError);
            continue;
          }
          
          const existingUser = existingUsers?.users?.find(
            (u) => u.email?.toLowerCase() === normalizedEmail
          );

          if (existingUser) {
            console.log(`[Helper] Found existing auth user on attempt ${attempt + 1}: ${existingUser.id}`);
            
            // Ensure profile exists (trigger may not have created it)
            const { error: upsertError } = await supabase.from("profiles").upsert({
              id: existingUser.id,
              first_name: firstName || "",
              last_name: lastName || "",
              email: normalizedEmail,
              phone: phone || null,
            }, { onConflict: "id" });
            
            if (upsertError) {
              console.error("[Helper] Profile upsert error:", upsertError);
              // Continue anyway - user exists
            }
            
            // Also ensure CRM lead is linked
            const { error: crmError } = await supabase
              .from("crm_leads")
              .update({ user_id: existingUser.id })
              .eq("email", normalizedEmail)
              .is("user_id", null);
            
            if (crmError) {
              console.log("[Helper] CRM link update (may already be linked):", crmError.message);
            }
            
            const needsName = !firstName || !lastName;
            
            return {
              userId: existingUser.id,
              created: false,
              linked: true,
              needsName,
            };
          }
        }
        
        console.error("[Helper] Failed to find user after all retries");
        return {
          userId: null,
          created: false,
          linked: false,
          needsName: true,
          error: "User exists but could not be found after retries",
        };
      }
      
      // Other error
      console.error("[Helper] User creation error:", createError.message);
      return {
        userId: null,
        created: false,
        linked: false,
        needsName: true,
        error: createError.message,
      };
    }

    return {
      userId: null,
      created: false,
      linked: false,
      needsName: true,
      error: "Failed to create or find user",
    };
    
  } catch (error) {
    console.error("[Helper] Unexpected error:", error);
    return { 
      userId: null, 
      created: false, 
      linked: false, 
      needsName: true,
      error: String(error),
    };
  }
}

/**
 * Check if user is an advocaat and assign role if needed
 */
export async function checkAndAssignAdvocaatRole(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data: advocaat } = await supabase
    .from("advocaten")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("active", true)
    .maybeSingle();
  
  if (!advocaat) {
    return false;
  }
  
  // Check existing role
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "advocaat")
    .maybeSingle();
  
  if (!existingRole) {
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "advocaat" });
  }
  
  // Link user to advocaat record
  await supabase
    .from("advocaten")
    .update({ user_id: userId })
    .eq("email", normalizedEmail)
    .is("user_id", null);
  
  return true;
}

/**
 * Check if user is a partner and assign role if needed
 */
export async function checkAndAssignPartnerRole(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("active", true)
    .maybeSingle();
  
  if (!partner) {
    return false;
  }
  
  // Check existing role
  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "partner")
    .maybeSingle();
  
  if (!existingRole) {
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "partner" });
  }
  
  // Link user to partner record
  await supabase
    .from("partners")
    .update({ user_id: userId })
    .eq("email", normalizedEmail)
    .is("user_id", null);
  
  return true;
}

/**
 * Generate a session for a user via magic link verification
 */
export async function generateUserSession(
  supabase: SupabaseClient,
  email: string
): Promise<{
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
  } | null;
  user: { id: string; email: string } | null;
  error?: string;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Generate magic link
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
  });

  if (linkError || !linkData) {
    console.error("[Helper] Failed to generate magic link:", linkError);
    return { session: null, user: null, error: linkError?.message || "Failed to generate link" };
  }

  const token = linkData.properties?.hashed_token;
  if (!token) {
    return { session: null, user: null, error: "No token in link data" };
  }

  // Verify to get session
  const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: "magiclink",
  });

  if (verifyError || !sessionData.session) {
    console.error("[Helper] Failed to verify token:", verifyError);
    return { session: null, user: null, error: verifyError?.message || "Failed to verify" };
  }

  return {
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in,
      expires_at: sessionData.session.expires_at!,
    },
    user: {
      id: sessionData.user!.id,
      email: sessionData.user!.email!,
    },
  };
}
