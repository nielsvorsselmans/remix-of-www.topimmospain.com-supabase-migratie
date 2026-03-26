import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCustomer } from "./useEffectiveCustomer";
import { toast } from "sonner";
import { calculateEffectivePriceRange } from "@/lib/utils";

export interface AssignedProject {
  id: string;
  project_id: string;
  status: 'suggested' | 'interested' | 'to_visit' | 'visited' | 'rejected';
  priority: number;
  customer_notes: string | null;
  admin_notes: string | null;
  assigned_at: string;
  source: 'admin' | 'favorite';
  favorited_at?: string;
  project: {
    id: string;
    name: string;
    display_title: string | null;
    city: string | null;
    region: string | null;
    price_from: number | null;
    price_to: number | null;
    featured_image: string | null;
    status: string | null;
  };
}

export function useAssignedProjects() {
  const { user } = useAuth();
  const { crmLeadId, userId, isPreviewMode, isLoading: isLoadingCustomer } = useEffectiveCustomer();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["assigned-projects", crmLeadId, userId],
    queryFn: async () => {
      if (!crmLeadId) return [];

      // Get assigned projects from customer_project_selections
      let selections: AssignedProject[] = [];
      let existingProjectIds: string[] = [];

      const { data: selectionsData, error } = await supabase
        .from("customer_project_selections")
        .select(`
          id,
          project_id,
          status,
          priority,
          customer_notes,
          admin_notes,
          assigned_at,
          assigned_by,
          projects:project_id (
            id,
            name,
            display_title,
            city,
            region,
            price_from,
            price_to,
            featured_image,
            status,
            properties (
              price,
              status
            )
          )
        `)
        .eq("crm_lead_id", crmLeadId)
        .order("priority", { ascending: false });

      if (error) {
        console.error("Error fetching assigned projects:", error);
        return [];
      }

      // Fetch user favorites to determine true source (who was first)
      let favoritedAtMap = new Map<string, string>();
      if (userId) {
        const { data: userFavorites } = await supabase
          .from("user_favorites")
          .select("project_id, created_at")
          .eq("user_id", userId);

        favoritedAtMap = new Map(
          (userFavorites || []).map(f => [f.project_id, f.created_at])
        );
      }

      // Map selections with correct source attribution
      selections = (selectionsData || []).map(s => {
        const favoritedAt = favoritedAtMap.get(s.project_id);
        const assignedAt = s.assigned_at;

        // Determine source based on who was first:
        // - If favorited_at exists AND is earlier than assigned_at → user was first
        // - If assigned_by exists AND no favorite OR favorite was later → admin was first
        // - No assigned_by → user (favorite promoted to selection)
        let source: 'admin' | 'favorite' = 'favorite';

        if (s.assigned_by) {
          // There's an admin assignment - check if user was earlier
          if (favoritedAt && assignedAt && new Date(favoritedAt) < new Date(assignedAt)) {
            // User had this project as favorite before admin assigned it
            source = 'favorite';
          } else {
            // Admin was first or no favorite exists
            source = 'admin';
          }
        }

        // Calculate effective prices using centralized utility
        const projectData = s.projects as any;
        const properties = projectData?.properties || [];
        const { priceFrom, priceTo } = calculateEffectivePriceRange(
          projectData?.price_from,
          projectData?.price_to,
          properties
        );

        return {
          ...s,
          status: s.status as AssignedProject['status'],
          source,
          favorited_at: favoritedAt || undefined,
          project: {
            ...projectData,
            price_from: priceFrom,
            price_to: priceTo,
          } as AssignedProject['project']
        };
      });
      existingProjectIds = selections.map(s => s.project_id);

      // Get user favorites that are NOT already in selections
      if (userId) {
        const { data: favoritesData, error: favError } = await supabase
          .from("user_favorites")
          .select(`
            project_id,
            created_at,
            projects:project_id (
              id,
              name,
              display_title,
              city,
              region,
              price_from,
              price_to,
              featured_image,
              status,
              properties (
                price,
                status
              )
            )
          `)
          .eq("user_id", userId);

        if (favError) {
          console.error("Error fetching favorites:", favError);
        } else {
          // Filter out favorites that are already in selections and map to AssignedProject format
          const favoriteProjects: AssignedProject[] = (favoritesData || [])
          .filter(f => !existingProjectIds.includes(f.project_id))
            .map(f => {
              const projectData = f.projects as any;
              const properties = projectData?.properties || [];
              const { priceFrom, priceTo } = calculateEffectivePriceRange(
                projectData?.price_from,
                projectData?.price_to,
                properties
              );

              return {
                id: `fav-${f.project_id}`, // Virtual ID for favorites
                project_id: f.project_id,
                status: 'suggested' as const,
                priority: 0,
                customer_notes: null,
                admin_notes: null,
                assigned_at: f.created_at,
                source: 'favorite' as const,
                favorited_at: f.created_at,
                project: {
                  ...projectData,
                  price_from: priceFrom,
                  price_to: priceTo,
                } as AssignedProject['project']
              };
            });

          // Combine both lists
          return [...selections, ...favoriteProjects];
        }
      }


      return selections;
    },
    enabled: !!crmLeadId && !isLoadingCustomer,
  });

  // Mutation for updating status on existing selections
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      selectionId, 
      status 
    }: { 
      selectionId: string; 
      status: AssignedProject['status'];
    }) => {
      const { error } = await supabase
        .from("customer_project_selections")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", selectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assigned-projects"] });
      toast.success("Status bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating status:", error);
      toast.error("Kon status niet bijwerken");
    },
  });

  // Mutation for promoting a favorite to a selection (or updating if already exists)
  const promoteFavoriteMutation = useMutation({
    mutationFn: async ({ 
      projectId, 
      status,
      notes
    }: { 
      projectId: string; 
      status: AssignedProject['status'];
      notes?: string;
    }) => {
      if (!crmLeadId) throw new Error("No CRM lead found");

      // Use upsert to handle both new inserts and updates (prevents duplicate key errors)
      // IMPORTANT: Do NOT include assigned_by or admin_notes here - we want to preserve
      // existing admin assignments when a customer rates a project
      const { error } = await supabase
        .from("customer_project_selections")
        .upsert({
          crm_lead_id: crmLeadId,
          project_id: projectId,
          status,
          customer_notes: notes || null,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'crm_lead_id,project_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate all related queries for immediate cache refresh
      queryClient.invalidateQueries({ queryKey: ["assigned-projects"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["favorites"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["isFavorite"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["favoritesCount"], refetchType: 'all' });
      toast.success("Favoriet beoordeeld");
    },
    onError: (error) => {
      console.error("Error promoting favorite:", error);
      toast.error("Kon favoriet niet beoordelen");
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ 
      selectionId, 
      notes 
    }: { 
      selectionId: string; 
      notes: string;
    }) => {
      const { error } = await supabase
        .from("customer_project_selections")
        .update({ customer_notes: notes, updated_at: new Date().toISOString() })
        .eq("id", selectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assigned-projects"] });
      toast.success("Notitie opgeslagen");
    },
    onError: (error) => {
      console.error("Error updating notes:", error);
      toast.error("Kon notitie niet opslaan");
    },
  });

  // Filter by source
  const adminProjects = projects.filter(p => p.source === 'admin');
  const favoriteProjects = projects.filter(p => p.source === 'favorite');

  const suggestedCount = projects.filter(p => p.status === 'suggested').length;
  const interestedCount = projects.filter(p => p.status === 'interested').length;
  const rejectedCount = projects.filter(p => p.status === 'rejected').length;
  const favoriteCount = favoriteProjects.length;

  const isLoading = isLoadingCustomer || isLoadingProjects;

  return {
    projects,
    adminProjects,
    favoriteProjects,
    isLoading,
    updateStatus: updateStatusMutation.mutate,
    promoteFavorite: promoteFavoriteMutation.mutate,
    updateNotes: updateNotesMutation.mutate,
    isUpdating: updateStatusMutation.isPending || updateNotesMutation.isPending || promoteFavoriteMutation.isPending,
    suggestedCount,
    interestedCount,
    rejectedCount,
    favoriteCount,
  };
}
