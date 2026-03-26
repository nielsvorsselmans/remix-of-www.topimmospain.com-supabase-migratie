import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StyleExample {
  id: string;
  created_at: string;
  content_text: string;
  archetype: string | null;
  is_active: boolean;
}

export function useStyleExamples() {
  return useQuery({
    queryKey: ["style-examples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("style_examples")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StyleExample[];
    },
  });
}

export function useAddStyleExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content_text,
      archetype,
    }: {
      content_text: string;
      archetype?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("style_examples")
        .insert({ content_text, archetype })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-examples"] });
      toast.success("Voorbeeld toegevoegd aan Style DNA");
    },
    onError: (error) => {
      console.error("Error adding style example:", error);
      toast.error("Kon voorbeeld niet toevoegen");
    },
  });
}

export function useToggleStyleExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("style_examples")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["style-examples"] });
      toast.success(data.is_active ? "Voorbeeld geactiveerd" : "Voorbeeld gedeactiveerd");
    },
    onError: (error) => {
      console.error("Error toggling style example:", error);
      toast.error("Kon status niet wijzigen");
    },
  });
}

export function useDeleteStyleExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("style_examples")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-examples"] });
      toast.success("Voorbeeld verwijderd");
    },
    onError: (error) => {
      console.error("Error deleting style example:", error);
      toast.error("Kon voorbeeld niet verwijderen");
    },
  });
}
