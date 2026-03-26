import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface PreviewCustomer {
  id: string;
  ghl_contact_id: string | null; // Primary GHL identifier (was crm_user_id)
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  journey_phase: string | null;
  user_id: string | null;
}

interface CustomerPreviewContextType {
  isPreviewMode: boolean;
  previewCrmLeadId: string | null;
  previewCustomer: PreviewCustomer | null;
  effectiveCrmLeadId: string | null;
  isLoadingPreview: boolean;
  isInitialized: boolean;
  exitPreview: () => void;
}

const CustomerPreviewContext = createContext<CustomerPreviewContextType | null>(null);

const PREVIEW_STORAGE_KEY = "admin_preview_crm_lead_id";

export function CustomerPreviewProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, loading: authLoading, rolesLoaded } = useAuth();

  // For non-admin users, skip waiting for roles - they don't need preview mode
  // This significantly speeds up dashboard loading for 99% of users
  const isAdmin = rolesLoaded && hasRole("admin");
  
  // Only wait for full initialization for potential admins
  // Regular users are "initialized" as soon as auth loading is done
  const isInitialized = !authLoading && (rolesLoaded || !isAdmin);

  // Get preview ID from URL or sessionStorage (for navigation persistence)
  const urlPreviewId = searchParams.get("preview_crm_lead_id");
  const [storedPreviewId, setStoredPreviewId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    }
    return null;
  });

  // Track previous preview ID to detect changes
  const prevPreviewIdRef = useRef<string | null>(null);

  // Determine active preview ID - only for admins
  const activePreviewId = isAdmin ? (urlPreviewId || storedPreviewId) : null;
  const isPreviewMode = isAdmin && !!activePreviewId;

  // SINGLE consolidated effect for preview ID changes and cache invalidation
  useEffect(() => {
    if (!isAdmin) return;
    
    const isNewPreviewId = activePreviewId !== prevPreviewIdRef.current;
    
    if (isNewPreviewId && activePreviewId) {
      // Invalidate all customer-related caches when preview customer changes
      queryClient.invalidateQueries({ queryKey: ['customer-sale-detail'] });
      queryClient.invalidateQueries({ queryKey: ['customer-sales'] });
      queryClient.invalidateQueries({ queryKey: ['user-crm-lead-id'] });
      queryClient.invalidateQueries({ queryKey: ['user-journey-phase'] });
      
      // Store in sessionStorage if from URL
      if (urlPreviewId) {
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, activePreviewId);
        setStoredPreviewId(activePreviewId);
      }
    }
    
    prevPreviewIdRef.current = activePreviewId;
  }, [activePreviewId, urlPreviewId, isAdmin, queryClient]);

  // Fetch preview customer data
  const { data: previewCustomer, isLoading: isLoadingPreview } = useQuery({
    queryKey: ["preview-customer", activePreviewId],
    queryFn: async () => {
      if (!activePreviewId) return null;

      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, ghl_contact_id, first_name, last_name, email, journey_phase, user_id")
        .eq("id", activePreviewId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching preview customer:", error);
        return null;
      }

      return data as PreviewCustomer | null;
    },
    enabled: isPreviewMode && !!activePreviewId,
  });

  const exitPreview = () => {
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    setStoredPreviewId(null);

    // Navigate back to klant detail page
    if (activePreviewId) {
      navigate(`/admin/klanten/${activePreviewId}`);
    } else {
      navigate("/admin/klanten");
    }
  };

  const value: CustomerPreviewContextType = {
    isPreviewMode,
    previewCrmLeadId: activePreviewId,
    previewCustomer: previewCustomer || null,
    effectiveCrmLeadId: activePreviewId || null,
    isLoadingPreview,
    isInitialized,
    exitPreview,
  };

  return (
    <CustomerPreviewContext.Provider value={value}>
      {children}
    </CustomerPreviewContext.Provider>
  );
}

export function useCustomerPreview(): CustomerPreviewContextType {
  const context = useContext(CustomerPreviewContext);
  
  // Return default values if used outside provider (for non-dashboard pages)
  if (!context) {
    return {
      isPreviewMode: false,
      previewCrmLeadId: null,
      previewCustomer: null,
      effectiveCrmLeadId: null,
      isLoadingPreview: false,
      isInitialized: true,
      exitPreview: () => {},
    };
  }
  
  return context;
}
