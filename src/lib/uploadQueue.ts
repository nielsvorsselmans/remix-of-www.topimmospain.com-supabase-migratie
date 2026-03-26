import { create } from "zustand";
import { voiceOfflineStorage, OfflineRecording, OfflinePhoto } from "./voiceOfflineStorage";
import { supabase } from "@/integrations/supabase/client";

export type QueueItemStatus = "queued" | "uploading" | "done" | "failed";
export type QueueItemType = "recording" | "photo";

export interface QueueItem {
  id: string; // offlineId
  type: QueueItemType;
  saleId: string;
  inspectionId: string;
  roomName: string;
  itemIndex?: number; // for photos
  status: QueueItemStatus;
  retries: number;
  error?: string;
}

interface UploadQueueState {
  items: QueueItem[];
  isProcessing: boolean;
  setItems: (items: QueueItem[]) => void;
  updateItem: (id: string, update: Partial<QueueItem>) => void;
  addItems: (items: QueueItem[]) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useUploadQueueStore = create<UploadQueueState>((set) => ({
  items: [],
  isProcessing: false,
  setItems: (items) => set({ items }),
  updateItem: (id, update) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...update } : i)),
    })),
  addItems: (newItems) =>
    set((s) => {
      const existingIds = new Set(s.items.map((i) => i.id));
      const toAdd = newItems.filter((i) => !existingIds.has(i.id));
      return { items: [...s.items, ...toAdd] };
    }),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}));

const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadQueueFromIndexedDB(saleId: string): Promise<QueueItem[]> {
  const items: QueueItem[] = [];
  try {
    const recordings = await voiceOfflineStorage.getUnsynced(saleId);
    for (const rec of recordings) {
      items.push({
        id: rec.id,
        type: "recording",
        saleId: rec.saleId,
        inspectionId: rec.inspectionId || "",
        roomName: rec.roomName,
        status: "queued",
        retries: 0,
      });
    }
    const photos = await voiceOfflineStorage.getUnsyncedPhotos(saleId);
    for (const photo of photos) {
      items.push({
        id: photo.id,
        type: "photo",
        saleId: photo.saleId,
        inspectionId: photo.inspectionId || "",
        roomName: photo.roomName,
        itemIndex: photo.itemIndex,
        status: "queued",
        retries: 0,
      });
    }
  } catch (err) {
    console.error("Failed to load queue from IndexedDB:", err);
  }
  return items;
}

interface UploadCallbacks {
  uploadRecording: (vars: { saleId: string; roomName: string; blob: Blob; inspectionId: string }) => Promise<any>;
  analyzeRecording: (vars: { recordingId: string; saleId: string }) => void;
  onSyncComplete?: () => void;
}

export async function processQueue(
  saleId: string,
  callbacks: UploadCallbacks
) {
  const store = useUploadQueueStore.getState();
  if (store.isProcessing) return;
  useUploadQueueStore.setState({ isProcessing: true });

  try {
    // Process recordings first (sequential)
    const recordings = store.items.filter(
      (i) => i.type === "recording" && (i.status === "queued" || i.status === "failed") && i.retries < MAX_RETRIES
    );

    for (const item of recordings) {
      useUploadQueueStore.getState().updateItem(item.id, { status: "uploading" });
      try {
        const offlineRec = await voiceOfflineStorage.get(item.id);
        if (!offlineRec) {
          useUploadQueueStore.getState().updateItem(item.id, { status: "done" });
          continue;
        }
        const recording = await callbacks.uploadRecording({
          saleId: offlineRec.saleId,
          roomName: offlineRec.roomName,
          blob: offlineRec.blob,
          inspectionId: offlineRec.inspectionId || item.inspectionId,
        });
        callbacks.analyzeRecording({ recordingId: recording.id, saleId: offlineRec.saleId });
        await voiceOfflineStorage.markSynced(item.id);
        useUploadQueueStore.getState().updateItem(item.id, { status: "done" });
      } catch (err: any) {
        const retries = item.retries + 1;
        useUploadQueueStore.getState().updateItem(item.id, {
          status: retries >= MAX_RETRIES ? "failed" : "queued",
          retries,
          error: err?.message || "Upload mislukt",
        });
        if (retries < MAX_RETRIES) {
          await delay(BACKOFF_BASE * Math.pow(2, retries - 1));
        }
      }
    }

    // Process photos (2 concurrent)
    const photos = useUploadQueueStore.getState().items.filter(
      (i) => i.type === "photo" && (i.status === "queued" || i.status === "failed") && i.retries < MAX_RETRIES
    );

    const processPhoto = async (item: QueueItem) => {
      console.log("[photo] upload started", { id: item.id, roomName: item.roomName, itemIndex: item.itemIndex });
      useUploadQueueStore.getState().updateItem(item.id, { status: "uploading" });
      try {
        const photos = await voiceOfflineStorage.getUnsyncedPhotos(item.saleId);
        const offlinePhoto = photos.find((p) => p.id === item.id);
        if (!offlinePhoto) {
          console.log("[photo] not found in IndexedDB (already synced?)", { id: item.id });
          useUploadQueueStore.getState().updateItem(item.id, { status: "done" });
          return;
        }
        const ext = offlinePhoto.blob.type.includes("png") ? "png" : "jpg";
        const fileName = `${offlinePhoto.saleId}/${offlinePhoto.roomName}/items/${offlinePhoto.itemIndex}/${Date.now()}_${item.id.slice(0, 8)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("snagging-voice")
          .upload(fileName, offlinePhoto.blob, { contentType: offlinePhoto.blob.type });
        if (uploadError) throw uploadError;

        // Get public URL and link to recording item
        const { data: urlData } = supabase.storage.from("snagging-voice").getPublicUrl(fileName);
        const publicUrl = urlData?.publicUrl;

        if (publicUrl && offlinePhoto.inspectionId) {
          try {
            await linkPhotoToItem(offlinePhoto, publicUrl);
            console.log("[photo] ai_items relink succeeded", { id: item.id, publicUrl });
          } catch (linkErr) {
            console.error("[photo] ai_items relink FAILED", { id: item.id, error: linkErr });
          }
        }

        await voiceOfflineStorage.markPhotoSynced(item.id);
        console.log("[photo] upload succeeded", { id: item.id, publicUrl });
        useUploadQueueStore.getState().updateItem(item.id, { status: "done" });
      } catch (err: any) {
        const retries = item.retries + 1;
        useUploadQueueStore.getState().updateItem(item.id, {
          status: retries >= MAX_RETRIES ? "failed" : "queued",
          retries,
          error: err?.message || "Foto upload mislukt",
        });
        if (retries < MAX_RETRIES) {
          await delay(BACKOFF_BASE * Math.pow(2, retries - 1));
        }
      }
    };

    // Process in batches of 2
    for (let i = 0; i < photos.length; i += 2) {
      const batch = photos.slice(i, i + 2);
      await Promise.all(batch.map(processPhoto));
    }

    // Cleanup synced items
    await voiceOfflineStorage.deleteAllSynced(saleId);
    await voiceOfflineStorage.deleteAllSyncedPhotos(saleId);

    callbacks.onSyncComplete?.();
  } finally {
    useUploadQueueStore.setState({ isProcessing: false });
  }
}

async function linkPhotoToItem(photo: OfflinePhoto, publicUrl: string) {
  try {
    // Find the recording for this room + inspection
    const { data: recordings } = await supabase
      .from("snagging_voice_recordings")
      .select("id, ai_items")
      .eq("sale_id", photo.saleId)
      .eq("room_name", photo.roomName)
      .eq("inspection_id", photo.inspectionId)
      .eq("status", "completed");

    if (!recordings || recordings.length === 0) return;

    // Find the recording that contains the item at the correct index
    let totalOffset = 0;
    for (const rec of recordings) {
      const items = (rec.ai_items as any[]) || [];
      if (photo.itemIndex >= totalOffset && photo.itemIndex < totalOffset + items.length) {
        const localIdx = photo.itemIndex - totalOffset;
        const updatedItems = [...items];
        if (updatedItems[localIdx]) {
          const media = [...(updatedItems[localIdx].media || [])];
          media.push(publicUrl);
          updatedItems[localIdx] = { ...updatedItems[localIdx], media };

          await supabase
            .from("snagging_voice_recordings")
            .update({ ai_items: updatedItems as any })
            .eq("id", rec.id);
        }
        return;
      }
      totalOffset += items.length;
    }
  } catch (err) {
    console.error("Failed to link photo to item:", err);
  }
}
