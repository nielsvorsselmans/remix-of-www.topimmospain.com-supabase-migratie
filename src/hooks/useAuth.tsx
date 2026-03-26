import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfileAndRoles } from "./useProfileAndRoles";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
    updated_at: string;
  } | null;
  roles: string[];
  rolesLoaded: boolean;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
  isPartner: boolean;
  isLead: boolean;
  isAdvocaat: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMerging, setIsMerging] = useState(false);

  // Track which user we've already merged data for to prevent duplicate calls
  const mergedUserIdRef = useRef<string | null>(null);

  // Use React Query for profile and roles (cached for 10 minutes)
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    refetch: refetchProfileAndRoles,
  } = useProfileAndRoles(user?.id);

  const profile = profileData?.profile ?? null;
  const roles = profileData?.roles ?? [];

  // Roles are loaded when: no user (nothing to load) OR profile query is done AND merge is complete
  const rolesLoaded = !user || (!isLoadingProfile && !isMerging);

  const linkPartnerAccountIfNeeded = async (userId: string) => {
    try {
      const partnerInviteCode = localStorage.getItem("partner_invite_code");

      if (!partnerInviteCode) {
        return;
      }

      const { data, error } = await supabase.functions.invoke("link-partner-account", {
        body: { user_id: userId, partner_invite_code: partnerInviteCode },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Welkom ${data.partner_name}! Je partner account is gekoppeld.`);
        // Clear invite code after successful link
        localStorage.removeItem("partner_invite_code");
        // Refresh profile and roles to include partner role
        refetchProfileAndRoles();
      }
    } catch (error) {
      console.error("[Auth] Error linking partner account:", error);
      toast.error("Kon partner account niet koppelen");
    }
  };

  const mergeCRMAndVisitorData = async (userId: string) => {
    try {
      // Get CRM ID from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const crmUserId = urlParams.get("crm_id");

      // Get visitor ID from localStorage
      const visitorId = localStorage.getItem("viva_visitor_id");

      // Merge CRM data
      const { data, error } = await supabase.functions.invoke("merge-crm-to-user", {
        body: {
          user_id: userId,
          crm_user_id: crmUserId,
          visitor_id: visitorId,
        },
      });

      if (error) {
        console.error("[Auth] Error merging CRM/visitor data:", error);
      } else {
        console.log("[Auth] Successfully merged CRM/visitor data:", data);
      }

      // Also merge partner referral data if visitor_id exists
      if (visitorId) {
        const { error: partnerError } = await supabase.functions.invoke("merge-partner-to-user", {
          body: {
            user_id: userId,
            visitor_id: visitorId,
          },
        });

        if (partnerError) {
          console.error("[Auth] Error merging partner referral:", partnerError);
        }
      }

      // Link partner account if partner_invite_code in localStorage
      await linkPartnerAccountIfNeeded(userId);

      // Auto-link partner by email (checks if user email matches a partner record)
      try {
        const { data: linkData, error: linkError } = await supabase.functions.invoke("auto-link-partner-by-email", {
          body: { user_id: userId },
        });

        if (linkError) {
          console.error("[Auth] Error auto-linking partner by email:", linkError);
        } else if (linkData?.linked) {
          console.log("[Auth] Auto-linked partner:", linkData.partner_name);
          refetchProfileAndRoles();
        }
      } catch (err) {
        console.error("[Auth] Error calling auto-link-partner-by-email:", err);
      }

      // Auto-link advocaat by email
      try {
        const { data: advocaatData, error: advocaatError } = await supabase.functions.invoke("auto-link-advocaat-by-email", {
          body: { user_id: userId },
        });

        if (advocaatError) {
          console.error("[Auth] Error auto-linking advocaat by email:", advocaatError);
        } else if (advocaatData?.linked) {
          console.log("[Auth] Auto-linked advocaat:", advocaatData.advocaat_name);
          refetchProfileAndRoles();
        }
      } catch (err) {
        console.error("[Auth] Error calling auto-link-advocaat-by-email:", err);
      }
    } catch (error) {
      console.error("[Auth] Error during merge:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (newSession?.user) {
        const userId = newSession.user.id;

        // Store user_id for tracking
        localStorage.setItem("viva_user_id", userId);

        // Trigger CRM/visitor merge ONLY once per tab session (StrictMode-safe)
        const mergedUserInSession = sessionStorage.getItem("viva_merge_done_user");
        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          mergedUserInSession !== userId
        ) {
          sessionStorage.setItem("viva_merge_done_user", userId);

          // Block rolesLoaded until merge + refetch complete
          setIsMerging(true);
          mergeCRMAndVisitorData(userId).finally(() => {
            refetchProfileAndRoles().finally(() => {
              if (isMounted) setIsMerging(false);
            });
          });
        }
      } else {
        mergedUserIdRef.current = null;
        sessionStorage.removeItem("viva_merge_done_user");

        // Remove user_id when logged out
        localStorage.removeItem("viva_user_id");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("viva_user_id");
  };

  const hasRole = (role: string) => roles.includes(role);
  const isAdmin = roles.includes("admin");
  const isPartner = roles.includes("partner");
  const isLead = roles.includes("lead");
  const isAdvocaat = roles.includes("advocaat");

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      profile,
      roles,
      rolesLoaded,
      hasRole,
      isAdmin,
      isPartner,
      isLead,
      isAdvocaat,
      signOut,
    }),
    [user, session, loading, profile, roles, rolesLoaded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
};
