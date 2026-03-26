import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProjectContact {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  notes: string | null;
  is_primary: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectContactWithProject extends ProjectContact {
  project?: {
    name: string;
  } | null;
}

export type ProjectContactInsert = Omit<ProjectContact, "id" | "created_at" | "updated_at">;
export type ProjectContactUpdate = Partial<Omit<ProjectContact, "id" | "project_id" | "created_at" | "updated_at">>;

export function useProjectContacts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-contacts", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*")
        .eq("project_id", projectId)
        .eq("active", true)
        .order("is_primary", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as ProjectContact[];
    },
    enabled: !!projectId,
  });
}

// Hook to fetch ALL active contacts across all projects (for search/reuse)
export function useAllProjectContacts() {
  return useQuery({
    queryKey: ["all-project-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contacts")
        .select("*, project:projects(name)")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      
      // Deduplicate contacts by name+phone combination, keeping track of project count
      const contactMap = new Map<string, ProjectContactWithProject & { projectCount: number; projectNames: string[] }>();
      
      for (const contact of data as ProjectContactWithProject[]) {
        const key = `${contact.name.toLowerCase()}-${contact.phone || ''}-${contact.email || ''}`;
        
        if (contactMap.has(key)) {
          const existing = contactMap.get(key)!;
          existing.projectCount++;
          if (contact.project?.name && !existing.projectNames.includes(contact.project.name)) {
            existing.projectNames.push(contact.project.name);
          }
        } else {
          contactMap.set(key, {
            ...contact,
            projectCount: 1,
            projectNames: contact.project?.name ? [contact.project.name] : [],
          });
        }
      }
      
      return Array.from(contactMap.values());
    },
  });
}

export function useCreateProjectContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: ProjectContactInsert) => {
      // If this is set as primary, unset other primaries first
      if (contact.is_primary) {
        await supabase
          .from("project_contacts")
          .update({ is_primary: false })
          .eq("project_id", contact.project_id);
      }

      const { data, error } = await supabase
        .from("project_contacts")
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-contacts", data.project_id] });
      queryClient.invalidateQueries({ queryKey: ["all-project-contacts"] });
      toast.success("Contactpersoon toegevoegd");
    },
    onError: (error) => {
      console.error("Error creating contact:", error);
      toast.error("Fout bij toevoegen contactpersoon");
    },
  });
}

export function useUpdateProjectContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, updates }: { id: string; projectId: string; updates: ProjectContactUpdate }) => {
      // If setting as primary, unset other primaries first
      if (updates.is_primary) {
        await supabase
          .from("project_contacts")
          .update({ is_primary: false })
          .eq("project_id", projectId)
          .neq("id", id);
      }

      const { error } = await supabase
        .from("project_contacts")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["all-project-contacts"] });
      toast.success("Contactpersoon bijgewerkt");
    },
    onError: (error) => {
      console.error("Error updating contact:", error);
      toast.error("Fout bij bijwerken contactpersoon");
    },
  });
}

export function useDeleteProjectContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      // Soft delete by setting active to false
      const { error } = await supabase
        .from("project_contacts")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["all-project-contacts"] });
      toast.success("Contactpersoon verwijderd");
    },
    onError: (error) => {
      console.error("Error deleting contact:", error);
      toast.error("Fout bij verwijderen contactpersoon");
    },
  });
}
