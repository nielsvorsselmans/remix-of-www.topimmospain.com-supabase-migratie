import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized typed helper for Supabase tables not in generated types.
 * When `external_listings`, `external_listing_assignments`, etc. are added
 * to the generated types, only this file needs updating.
 */
export function typedFrom(table: string) {
  return supabase.from(table as any) as any;
}
