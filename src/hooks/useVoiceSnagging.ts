import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { voiceOfflineStorage } from "@/lib/voiceOfflineStorage";

export interface VoiceRecording {
  id: string;
  sale_id: string;
  room_name: string;
  audio_url: string | null;
  storage_path: string | null;
  transcript: string | null;
  ai_items: VoiceItem[];
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_by: string | null;
  created_at: string;
}

export interface VoiceItem {
  item_name: string;
  status: "ok" | "defect";
  severity?: "minor" | "major" | "critical";
  notes: string;
  media?: string[];
}

export function useVoiceRecordings(saleId: string, inspectionId?: string | null) {
  return useQuery({
    queryKey: ["voice-recordings", saleId, inspectionId],
    queryFn: async () => {
      let query = supabase
        .from("snagging_voice_recordings")
        .select("*")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: true });
      if (inspectionId) {
        query = query.eq("inspection_id", inspectionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as VoiceRecording[];
    },
  });
}

export function useUploadVoiceRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, roomName, blob, inspectionId }: { saleId: string; roomName: string; blob: Blob; inspectionId?: string }) => {
      // Map MIME type to correct file extension
      const mimeToExt: Record<string, string> = {
        "audio/mp4": "m4a",
        "audio/mp4;codecs=mp4a.40.2": "m4a",
        "audio/mpeg": "mp3",
        "audio/webm": "webm",
        "audio/webm;codecs=opus": "webm",
      };
      const ext = mimeToExt[blob.type] || (blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "m4a");
      const fileName = `${saleId}/${roomName}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("snagging-voice")
        .upload(fileName, blob, { contentType: blob.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("snagging-voice")
        .getPublicUrl(fileName);

      const { data: user } = await supabase.auth.getUser();
      const insertData: any = {
          sale_id: saleId,
          room_name: roomName,
          storage_path: fileName,
          audio_url: urlData.publicUrl,
          status: "pending",
          created_by: user.user?.id,
        };
      if (inspectionId) insertData.inspection_id = inspectionId;

      const { data: recording, error: dbError } = await supabase
        .from("snagging_voice_recordings")
        .insert(insertData)
        .select()
        .single();
      if (dbError) throw dbError;

      return recording as unknown as VoiceRecording;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Upload mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useAnalyzeVoiceRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordingId, saleId }: { recordingId: string; saleId: string }) => {
      const { data, error } = await supabase.functions.invoke("analyze-snagging-voice", {
        body: { recordingId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.saleId] });
      toast({ title: "Analyse voltooid", description: "AI heeft de opname geanalyseerd." });
    },
    onError: (err: any) => {
      toast({ title: "Analyse mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateVoiceItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordingId, saleId, items }: { recordingId: string; saleId: string; items: VoiceItem[] }) => {
      const { error } = await supabase
        .from("snagging_voice_recordings")
        .update({ ai_items: items as any })
        .eq("id", recordingId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Opslaan mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useUploadItemMedia() {
  return useMutation({
    mutationFn: async ({ saleId, roomName, itemIndex, file }: { saleId: string; roomName: string; itemIndex: number; file: File }) => {
      // Offline fallback: save to IndexedDB and return blob URL
      // Note: VoiceRoomCard.handleUploadMedia is the primary offline path.
      // This fallback is for standalone usage only.
      if (!navigator.onLine) {
        console.warn("[photo] useUploadItemMedia offline fallback triggered — inspectionId not available here");
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const offlinePhoto = await voiceOfflineStorage.savePhoto(blob, saleId, roomName, itemIndex, "");
        return offlinePhoto.localUrl || URL.createObjectURL(blob);
      }

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${saleId}/${roomName}/items/${itemIndex}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage
        .from("snagging-voice")
        .upload(fileName, file, { contentType: file.type });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("snagging-voice")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    },
    onError: (err: any) => {
      toast({ title: "Upload mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteVoiceRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recording }: { recording: VoiceRecording }) => {
      if (recording.storage_path) {
        await supabase.storage.from("snagging-voice").remove([recording.storage_path]);
      }
      const { error } = await supabase
        .from("snagging_voice_recordings")
        .delete()
        .eq("id", recording.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.recording.sale_id] });
    },
  });
}

export function useCreateManualRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, roomName, items, inspectionId }: { saleId: string; roomName: string; items: VoiceItem[]; inspectionId?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData: any = {
        sale_id: saleId,
        room_name: roomName,
        status: "completed",
        audio_url: null,
        storage_path: null,
        ai_items: items as any,
        created_by: user.user?.id,
      };
      if (inspectionId) insertData.inspection_id = inspectionId;

      const { data, error } = await supabase
        .from("snagging_voice_recordings")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as VoiceRecording;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Aanmaken mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, roomName }: { saleId: string; roomName: string }) => {
      // 1. Get all recordings for this room to find storage paths
      const { data: recs, error: fetchError } = await supabase
        .from("snagging_voice_recordings")
        .select("id, storage_path")
        .eq("sale_id", saleId)
        .eq("room_name", roomName);
      if (fetchError) throw fetchError;

      // 2. Delete storage files
      const paths = (recs || []).map((r) => r.storage_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        await supabase.storage.from("snagging-voice").remove(paths);
      }

      // 3. Delete DB records
      if ((recs || []).length > 0) {
        const { error: delError } = await supabase
          .from("snagging_voice_recordings")
          .delete()
          .eq("sale_id", saleId)
          .eq("room_name", roomName);
        if (delError) throw delError;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Verwijderen mislukt", description: err.message, variant: "destructive" });
    },
  });
}

export function useRenameRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, oldName, newName }: { saleId: string; oldName: string; newName: string }) => {
      const { error } = await supabase
        .from("snagging_voice_recordings")
        .update({ room_name: newName } as any)
        .eq("sale_id", saleId)
        .eq("room_name", oldName);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", vars.saleId] });
    },
    onError: (err: any) => {
      toast({ title: "Hernoemen mislukt", description: err.message, variant: "destructive" });
    },
  });
}

