import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MaterialOptionImage {
  id: string;
  option_id: string;
  image_url: string;
  title: string | null;
  is_primary: boolean;
  order_index: number;
}

export interface MaterialOption {
  id: string;
  selection_id: string;
  name: string;
  description: string | null;
  color_code: string | null;
  brand: string | null;
  product_code: string | null;
  price: number | null;
  is_default: boolean;
  is_chosen: boolean;
  order_index: number;
  images?: MaterialOptionImage[];
}

export interface MaterialSelection {
  id: string;
  sale_id: string;
  category: string;
  room: string | null;
  title: string;
  description: string | null;
  chosen_option_id: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  customer_visible: boolean;
  order_index: number;
  notes: string | null;
  source_template_id: string | null; // Link to source template for duplicate detection
  created_at: string;
  updated_at: string;
  options?: MaterialOption[];
}

// Fetch all material selections for a sale with options and images
export function useMaterialSelections(saleId: string | undefined) {
  return useQuery({
    queryKey: ["material-selections", saleId],
    queryFn: async () => {
      if (!saleId) return [];

      const { data: selections, error: selectionsError } = await supabase
        .from("material_selections")
        .select("*")
        .eq("sale_id", saleId)
        .order("order_index", { ascending: true });

      if (selectionsError) throw selectionsError;

      // Fetch options for all selections
      const selectionIds = selections.map((s) => s.id);
      if (selectionIds.length === 0) return [];

      const { data: options, error: optionsError } = await supabase
        .from("material_options")
        .select("*")
        .in("selection_id", selectionIds)
        .order("order_index", { ascending: true });

      if (optionsError) throw optionsError;

      // Fetch images for all options
      const optionIds = options?.map((o) => o.id) || [];
      let images: MaterialOptionImage[] = [];
      
      if (optionIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from("material_option_images")
          .select("*")
          .in("option_id", optionIds)
          .order("order_index", { ascending: true });

        if (imagesError) throw imagesError;
        images = imagesData || [];
      }

      // Combine everything
      const optionsWithImages = options?.map((option) => ({
        ...option,
        images: images.filter((img) => img.option_id === option.id),
      }));

      const selectionsWithOptions = selections.map((selection) => ({
        ...selection,
        options: optionsWithImages?.filter((opt) => opt.selection_id === selection.id) || [],
      }));

      return selectionsWithOptions as MaterialSelection[];
    },
    enabled: !!saleId,
  });
}

// Create a new material selection
export function useCreateMaterialSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sale_id: string;
      category: string;
      room?: string;
      title: string;
      description?: string;
      order_index?: number;
    }) => {
      const { data: result, error } = await supabase
        .from("material_selections")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", variables.sale_id] });
      toast.success("Materiaalkeuze toegevoegd");
    },
    onError: (error) => {
      toast.error("Fout bij toevoegen: " + error.message);
    },
  });
}

// Update a material selection
export function useUpdateMaterialSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      saleId,
      ...data
    }: {
      id: string;
      saleId: string;
      category?: string;
      room?: string | null;
      title?: string;
      description?: string | null;
      customer_visible?: boolean;
      order_index?: number;
      notes?: string | null;
    }) => {
      const { error } = await supabase
        .from("material_selections")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
      toast.success("Materiaalkeuze bijgewerkt");
    },
    onError: (error) => {
      toast.error("Fout bij bijwerken: " + error.message);
    },
  });
}

// Delete a material selection
export function useDeleteMaterialSelection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from("material_selections")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
      toast.success("Materiaalkeuze verwijderd");
    },
    onError: (error) => {
      toast.error("Fout bij verwijderen: " + error.message);
    },
  });
}

// Create a material option
export function useCreateMaterialOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      ...data
    }: {
      saleId: string;
      selection_id: string;
      name: string;
      description?: string;
      color_code?: string;
      brand?: string;
      product_code?: string;
      price?: number | null;
      is_default?: boolean;
      is_chosen?: boolean;
      order_index?: number;
    }) => {
      const { data: result, error } = await supabase
        .from("material_options")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return { result, saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
      toast.success("Optie toegevoegd");
    },
    onError: (error) => {
      toast.error("Fout bij toevoegen optie: " + error.message);
    },
  });
}

// Update a material option
export function useUpdateMaterialOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      saleId,
      ...data
    }: {
      id: string;
      saleId: string;
      name?: string;
      description?: string | null;
      color_code?: string | null;
      brand?: string | null;
      product_code?: string | null;
      price?: number | null;
      is_default?: boolean;
      is_chosen?: boolean;
      order_index?: number;
    }) => {
      const { error } = await supabase
        .from("material_options")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
    },
    onError: (error) => {
      toast.error("Fout bij bijwerken optie: " + error.message);
    },
  });
}

// Delete a material option
export function useDeleteMaterialOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from("material_options")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
      toast.success("Optie verwijderd");
    },
    onError: (error) => {
      toast.error("Fout bij verwijderen optie: " + error.message);
    },
  });
}

// Add image to option
export function useAddMaterialOptionImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      ...data
    }: {
      saleId: string;
      option_id: string;
      image_url: string;
      title?: string;
      is_primary?: boolean;
      order_index?: number;
    }) => {
      const { data: result, error } = await supabase
        .from("material_option_images")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return { result, saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
    },
    onError: (error) => {
      toast.error("Fout bij toevoegen afbeelding: " + error.message);
    },
  });
}

// Delete image from option
export function useDeleteMaterialOptionImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, saleId }: { id: string; saleId: string }) => {
      const { error } = await supabase
        .from("material_option_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
    },
    onError: (error) => {
      toast.error("Fout bij verwijderen afbeelding: " + error.message);
    },
  });
}

// Choose a material option (handles selection update with decided_at/decided_by_name)
export function useChooseMaterialOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      optionId,
      selectionId,
      saleId,
      deciderName,
    }: {
      optionId: string;
      selectionId: string;
      saleId: string;
      deciderName?: string;
    }) => {
      // First, unset is_chosen on all options for this selection
      await supabase
        .from("material_options")
        .update({ is_chosen: false })
        .eq("selection_id", selectionId);

      // Set is_chosen on the selected option
      await supabase
        .from("material_options")
        .update({ is_chosen: true })
        .eq("id", optionId);

      // Update the selection with chosen_option_id and decision info
      await supabase
        .from("material_selections")
        .update({
          chosen_option_id: optionId,
          decided_at: new Date().toISOString(),
          decided_by_name: deciderName || "Admin",
        })
        .eq("id", selectionId);

      return { saleId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
      toast.success("Materiaal gekozen");
    },
    onError: (error) => {
      toast.error("Fout bij kiezen: " + error.message);
    },
  });
}

// Category presets for quick selection
export const MATERIAL_CATEGORIES = [
  { value: "vloeren", label: "Vloeren" },
  { value: "keuken", label: "Keuken" },
  { value: "badkamer", label: "Badkamer" },
  { value: "badkamer_ensuite", label: "Badkamer Ensuite" },
  { value: "badkamer_gedeeld", label: "Badkamer Gedeeld" },
  { value: "sanitair", label: "Sanitair" },
  { value: "deuren", label: "Deuren" },
  { value: "verlichting", label: "Verlichting" },
  { value: "overig", label: "Overig" },
] as const;

export const ROOM_PRESETS = [
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
] as const;
