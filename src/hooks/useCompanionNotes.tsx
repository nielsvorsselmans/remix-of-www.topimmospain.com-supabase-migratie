import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { toast } from "sonner";
import { cacheNotes, getCachedNotes, saveNoteOffline } from "@/lib/companionOfflineStorage";

export interface CompanionMediaItem {
  type: "audio" | "photo" | "video";
  storage_path: string;
  url: string;
  created_at: string;
}

export interface CompanionNote {
  id: string;
  trip_id: string;
  viewing_id: string;
  project_id: string | null;
  note_text: string;
  media: CompanionMediaItem[];
  rating: number | null;
  interest_level: string | null;
  budget_fit: boolean | null;
  follow_up_action: string | null;
  cost_indication: any | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanionNotes(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["companion-notes", tripId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!tripId) return [];

      try {
        const { data, error } = await supabase
          .from("viewing_companion_notes")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at");

        if (error) throw error;

        const notes = (data || []).map((row: any) => ({
          ...row,
          media: Array.isArray(row.media) ? row.media : [],
        })) as CompanionNote[];

        // Cache for offline use (background)
        cacheNotes(tripId, notes).catch(() => {});

        return notes;
      } catch (err) {
        // Offline fallback
        console.warn("[useCompanionNotes] Network failed, trying cache", err);
        const cached = await getCachedNotes(tripId!);
        if (cached.length > 0) {
          console.info("[useCompanionNotes] Using cached notes");
          return cached as CompanionNote[];
        }
        throw err;
      }
    },
    enabled: !!tripId,
  });

  // Upsert note text (debounced from caller)
  const upsertNote = useMutation({
    mutationFn: async ({
      viewingId,
      projectId,
      noteText,
    }: {
      viewingId: string;
      projectId: string;
      noteText: string;
    }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("viewing_companion_notes")
          .upsert(
            {
              trip_id: tripId!,
              viewing_id: viewingId,
              project_id: projectId,
              note_text: noteText,
              created_by: user?.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "trip_id,viewing_id" }
          );
        if (error) throw error;
      } catch (err) {
        // Save offline
        await saveNoteOffline({
          id: `${tripId}-${viewingId}`,
          trip_id: tripId!,
          viewing_id: viewingId,
          project_id: projectId,
          note_text: noteText,
        });
        console.info("[useCompanionNotes] Saved note offline");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update rating
  const updateRating = useMutation({
    mutationFn: async ({
      viewingId,
      projectId,
      rating,
    }: {
      viewingId: string;
      projectId: string;
      rating: number | null;
    }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("viewing_companion_notes")
          .upsert(
            {
              trip_id: tripId!,
              viewing_id: viewingId,
              project_id: projectId,
              rating,
              created_by: user?.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "trip_id,viewing_id" }
          );
        if (error) throw error;
      } catch (err) {
        await saveNoteOffline({
          id: `${tripId}-${viewingId}`,
          trip_id: tripId!,
          viewing_id: viewingId,
          project_id: projectId,
          rating,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update structured assessment
  const updateAssessment = useMutation({
    mutationFn: async ({
      viewingId,
      projectId,
      interestLevel,
      budgetFit,
      followUpAction,
    }: {
      viewingId: string;
      projectId: string;
      interestLevel?: string | null;
      budgetFit?: boolean | null;
      followUpAction?: string | null;
    }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const updateData: Record<string, any> = {
          trip_id: tripId!,
          viewing_id: viewingId,
          project_id: projectId,
          created_by: user?.id,
          updated_at: new Date().toISOString(),
        };
        if (interestLevel !== undefined) updateData.interest_level = interestLevel;
        if (budgetFit !== undefined) updateData.budget_fit = budgetFit;
        if (followUpAction !== undefined) updateData.follow_up_action = followUpAction;

        const { error } = await supabase
          .from("viewing_companion_notes")
          .upsert(updateData as any, { onConflict: "trip_id,viewing_id" });
        if (error) throw error;
      } catch (err) {
        await saveNoteOffline({
          id: `${tripId}-${viewingId}`,
          trip_id: tripId!,
          viewing_id: viewingId,
          project_id: projectId,
          interest_level: interestLevel,
          budget_fit: budgetFit,
          follow_up_action: followUpAction,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Save cost indication data
  const saveCostIndication = useMutation({
    mutationFn: async ({
      viewingId,
      projectId,
      costIndication,
    }: {
      viewingId: string;
      projectId: string;
      costIndication: any;
    }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("viewing_companion_notes")
          .upsert(
            {
              trip_id: tripId!,
              viewing_id: viewingId,
              project_id: projectId,
              cost_indication: costIndication,
              created_by: user?.id,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "trip_id,viewing_id" }
          );
        if (error) throw error;
      } catch (err) {
        await saveNoteOffline({
          id: `${tripId}-${viewingId}`,
          trip_id: tripId!,
          viewing_id: viewingId,
          project_id: projectId,
          cost_indication: costIndication,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Upload media file and append to media array
  const uploadMedia = useCallback(
    async (viewingId: string, projectId: string, file: Blob, type: "audio" | "photo" | "video") => {
      const ext = type === "audio" ? "m4a" : type === "photo" ? "jpg" : "mp4";
      const storagePath = `${tripId}/${viewingId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("viewing-companion-media")
        .upload(storagePath, file, { contentType: file.type || `${type}/*` });

      if (uploadError) {
        toast.error("Upload mislukt");
        throw uploadError;
      }

      const { data: urlData } = await supabase.storage
        .from("viewing-companion-media")
        .createSignedUrl(storagePath, 365 * 24 * 60 * 60);

      const mediaItem: CompanionMediaItem = {
        type,
        storage_path: storagePath,
        url: urlData?.signedUrl || "",
        created_at: new Date().toISOString(),
      };

      const { data: { user } } = await supabase.auth.getUser();

      const { data: existing } = await supabase
        .from("viewing_companion_notes")
        .select("id, media")
        .eq("trip_id", tripId!)
        .eq("viewing_id", viewingId)
        .maybeSingle();

      const currentMedia = Array.isArray(existing?.media) ? existing.media : [];
      const newMedia = [...currentMedia, mediaItem];

      const { error } = await supabase
        .from("viewing_companion_notes")
        .upsert(
          {
            trip_id: tripId!,
            viewing_id: viewingId,
            project_id: projectId,
            media: newMedia as any,
            created_by: user?.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "trip_id,viewing_id" }
        );

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey });
      toast.success(
        type === "audio" ? "Audio opgeslagen" : type === "photo" ? "Foto opgeslagen" : "Video opgeslagen"
      );
    },
    [tripId, queryClient, queryKey]
  );

  // Delete a media item
  const deleteMedia = useCallback(
    async (viewingId: string, storagePath: string) => {
      await supabase.storage.from("viewing-companion-media").remove([storagePath]);

      const { data: existing } = await supabase
        .from("viewing_companion_notes")
        .select("id, media")
        .eq("trip_id", tripId!)
        .eq("viewing_id", viewingId)
        .maybeSingle();

      if (existing) {
        const currentMedia = Array.isArray(existing.media) ? existing.media : [];
        const filtered = currentMedia.filter((m: any) => m.storage_path !== storagePath);

        await supabase
          .from("viewing_companion_notes")
          .update({ media: filtered as any, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      }

      queryClient.invalidateQueries({ queryKey });
      toast.success("Media verwijderd");
    },
    [tripId, queryClient, queryKey]
  );

  return {
    notes: query.data || [],
    isLoading: query.isLoading,
    upsertNote,
    updateRating,
    updateAssessment,
    saveCostIndication,
    uploadMedia,
    deleteMedia,
    getNoteForViewing: (viewingId: string) =>
      (query.data || []).find((n) => n.viewing_id === viewingId),
  };
}
