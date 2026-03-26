import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Default categories (fallback when no project-specific ones exist)
export const DEFAULT_CATEGORIES = [
  { value: "vloeren", label: "Vloeren" },
  { value: "keuken", label: "Keuken" },
  { value: "badkamer_ensuite", label: "Badkamer Ensuite" },
  { value: "badkamer_gedeeld", label: "Badkamer Gedeeld" },
  { value: "sanitair", label: "Sanitair" },
  { value: "deuren", label: "Deuren" },
  { value: "verlichting", label: "Verlichting" },
  { value: "overig", label: "Overig" },
];

// Default rooms (fallback when no project-specific ones exist)
export const DEFAULT_ROOMS = [
  { value: "woonkamer", label: "Woonkamer" },
  { value: "hal", label: "Hal" },
  { value: "keuken", label: "Keuken" },
  { value: "master_bedroom", label: "Master Bedroom" },
  { value: "slaapkamer_2", label: "Slaapkamer 2" },
  { value: "slaapkamer_3", label: "Slaapkamer 3" },
  { value: "badkamer_ensuite", label: "Badkamer Ensuite" },
  { value: "badkamer_gedeeld", label: "Badkamer Gedeeld" },
  { value: "terras", label: "Terras" },
  { value: "solarium", label: "Solarium" },
];

export interface MaterialCategory {
  id: string;
  project_id: string | null;
  value: string;
  label: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialRoom {
  id: string;
  project_id: string | null;
  value: string;
  label: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== CATEGORIES ====================

export function useMaterialCategories(projectId: string | undefined) {
  return useQuery({
    queryKey: ["material-categories", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("material_categories")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as MaterialCategory[];
    },
    enabled: !!projectId,
  });
}

// Get categories with fallback to defaults
export function useMaterialCategoriesWithFallback(projectId: string | undefined) {
  const query = useMaterialCategories(projectId);
  
  const categories = query.data && query.data.length > 0
    ? query.data.filter(c => c.is_active).map(c => ({ value: c.value, label: c.label }))
    : DEFAULT_CATEGORIES;

  return {
    ...query,
    categories,
    hasCustomCategories: query.data && query.data.length > 0,
  };
}

export function useCreateMaterialCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      project_id: string;
      value: string;
      label: string;
      order_index?: number;
    }) => {
      const { data: result, error } = await supabase
        .from("material_categories")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["material-categories", variables.project_id] });
      toast.success("Categorie toegevoegd");
    },
    onError: (error) => {
      toast.error("Fout bij toevoegen: " + error.message);
    },
  });
}

export function useUpdateMaterialCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      ...data
    }: {
      id: string;
      projectId: string;
      value?: string;
      label?: string;
      order_index?: number;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from("material_categories")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-categories", result.projectId] });
      toast.success("Categorie bijgewerkt");
    },
    onError: (error) => {
      toast.error("Fout bij bijwerken: " + error.message);
    },
  });
}

export function useDeleteMaterialCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("material_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-categories", result.projectId] });
      toast.success("Categorie verwijderd");
    },
    onError: (error) => {
      toast.error("Fout bij verwijderen: " + error.message);
    },
  });
}

export function useInitializeDefaultCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const categoriesToInsert = DEFAULT_CATEGORIES.map((cat, index) => ({
        project_id: projectId,
        value: cat.value,
        label: cat.label,
        order_index: index,
        is_active: true,
      }));

      const { error } = await supabase
        .from("material_categories")
        .insert(categoriesToInsert);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-categories", result.projectId] });
      toast.success("Standaard categorieën toegevoegd");
    },
    onError: (error) => {
      toast.error("Fout bij initialiseren: " + error.message);
    },
  });
}

// ==================== ROOMS ====================

export function useMaterialRooms(projectId: string | undefined) {
  return useQuery({
    queryKey: ["material-rooms", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("material_rooms")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as MaterialRoom[];
    },
    enabled: !!projectId,
  });
}

// Get rooms with fallback to defaults
export function useMaterialRoomsWithFallback(projectId: string | undefined) {
  const query = useMaterialRooms(projectId);
  
  const rooms = query.data && query.data.length > 0
    ? query.data.filter(r => r.is_active).map(r => ({ value: r.value, label: r.label }))
    : DEFAULT_ROOMS;

  return {
    ...query,
    rooms,
    hasCustomRooms: query.data && query.data.length > 0,
  };
}

export function useCreateMaterialRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      project_id: string;
      value: string;
      label: string;
      order_index?: number;
    }) => {
      const { data: result, error } = await supabase
        .from("material_rooms")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["material-rooms", variables.project_id] });
      toast.success("Ruimte toegevoegd");
    },
    onError: (error) => {
      toast.error("Fout bij toevoegen: " + error.message);
    },
  });
}

export function useUpdateMaterialRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      ...data
    }: {
      id: string;
      projectId: string;
      value?: string;
      label?: string;
      order_index?: number;
      is_active?: boolean;
    }) => {
      const { error } = await supabase
        .from("material_rooms")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-rooms", result.projectId] });
      toast.success("Ruimte bijgewerkt");
    },
    onError: (error) => {
      toast.error("Fout bij bijwerken: " + error.message);
    },
  });
}

export function useDeleteMaterialRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("material_rooms")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-rooms", result.projectId] });
      toast.success("Ruimte verwijderd");
    },
    onError: (error) => {
      toast.error("Fout bij verwijderen: " + error.message);
    },
  });
}

export function useInitializeDefaultRooms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const roomsToInsert = DEFAULT_ROOMS.map((room, index) => ({
        project_id: projectId,
        value: room.value,
        label: room.label,
        order_index: index,
        is_active: true,
      }));

      const { error } = await supabase
        .from("material_rooms")
        .insert(roomsToInsert);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-rooms", result.projectId] });
      toast.success("Standaard ruimtes toegevoegd");
    },
    onError: (error) => {
      toast.error("Fout bij initialiseren: " + error.message);
    },
  });
}

// ==================== REORDER ====================

export function useReorderMaterialCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      orderedIds,
    }: {
      projectId: string;
      orderedIds: string[];
    }) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("material_categories")
          .update({ order_index: index })
          .eq("id", id)
      );

      await Promise.all(updates);
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-categories", result.projectId] });
      toast.success("Volgorde aangepast");
    },
    onError: (error) => {
      toast.error("Fout bij herschikken: " + error.message);
    },
  });
}

export function useReorderMaterialRooms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      orderedIds,
    }: {
      projectId: string;
      orderedIds: string[];
    }) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("material_rooms")
          .update({ order_index: index })
          .eq("id", id)
      );

      await Promise.all(updates);
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-rooms", result.projectId] });
      toast.success("Volgorde aangepast");
    },
    onError: (error) => {
      toast.error("Fout bij herschikken: " + error.message);
    },
  });
}
