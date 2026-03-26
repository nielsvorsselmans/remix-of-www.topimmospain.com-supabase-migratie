import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Generate a secure random token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < 32; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

export interface BuyerDataToken {
  id: string;
  sale_customer_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export function useBuyerDataTokens(saleCustomerIds: string[]) {
  return useQuery({
    queryKey: ["buyer-data-tokens", saleCustomerIds],
    queryFn: async () => {
      if (saleCustomerIds.length === 0) return [];

      const { data, error } = await supabase
        .from("buyer_data_tokens")
        .select("*")
        .in("sale_customer_id", saleCustomerIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BuyerDataToken[];
    },
    enabled: saleCustomerIds.length > 0,
  });
}

export function useGenerateBuyerDataToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleCustomerId: string) => {
      // Check for existing valid token
      const { data: existing } = await supabase
        .from("buyer_data_tokens")
        .select("*")
        .eq("sale_customer_id", saleCustomerId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        return existing as BuyerDataToken;
      }

      // Generate new token
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days validity

      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("buyer_data_tokens")
        .insert({
          sale_customer_id: saleCustomerId,
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BuyerDataToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-data-tokens"] });
    },
    onError: (error) => {
      console.error("Error generating token:", error);
      toast.error("Fout bij genereren van link");
    },
  });
}

export function getPublicFormUrl(token: string): string {
  // Use the current origin for the URL
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://topimmospain.com';
  return `${baseUrl}/koperdata/${token}`;
}

export async function copyBuyerLinkToClipboard(token: string): Promise<boolean> {
  const url = getPublicFormUrl(token);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error("Clipboard error:", err);
    return false;
  }
}