import { useEffect, useCallback, useRef } from "react";
import { useUploadQueueStore, loadQueueFromIndexedDB, processQueue, QueueItem } from "@/lib/uploadQueue";
import { useOnlineStatus } from "./useOnlineStatus";

interface UploadCallbacks {
  uploadRecording: (vars: { saleId: string; roomName: string; blob: Blob; inspectionId: string }) => Promise<any>;
  analyzeRecording: (vars: { recordingId: string; saleId: string }) => void;
  onSyncComplete?: () => void;
}

export function useUploadQueue(saleId: string, callbacks: UploadCallbacks) {
  const { isReachable } = useOnlineStatus();
  const items = useUploadQueueStore((s) => s.items);
  const isProcessing = useUploadQueueStore((s) => s.isProcessing);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Load queue from IndexedDB on mount
  useEffect(() => {
    loadQueueFromIndexedDB(saleId).then((queueItems) => {
      if (queueItems.length > 0) {
        useUploadQueueStore.getState().addItems(queueItems);
        const photoCount = queueItems.filter(i => i.type === "photo").length;
        const recCount = queueItems.filter(i => i.type === "recording").length;
        console.log("[photo] pending media restored after refresh", { total: queueItems.length, photos: photoCount, recordings: recCount });
      }
    });
  }, [saleId]);

  // Auto-process when reachable and there are pending items
  useEffect(() => {
    if (!isReachable) return;
    const pending = items.filter(
      (i) => i.saleId === saleId && (i.status === "queued" || (i.status === "failed" && i.retries < 3))
    );
    if (pending.length === 0) return;

    processQueue(saleId, callbacksRef.current);
  }, [isReachable, saleId, items]);

  const saleItems = items.filter((i) => i.saleId === saleId);
  const pendingCount = saleItems.filter((i) => i.status === "queued" || i.status === "uploading").length;
  const failedCount = saleItems.filter((i) => i.status === "failed").length;
  const hasPending = pendingCount > 0 || failedCount > 0;

  const retryFailed = useCallback(() => {
    const store = useUploadQueueStore.getState();
    const failed = store.items.filter((i) => i.saleId === saleId && i.status === "failed");
    for (const item of failed) {
      store.updateItem(item.id, { status: "queued", retries: 0, error: undefined });
    }
    processQueue(saleId, callbacksRef.current);
  }, [saleId]);

  const retryOne = useCallback(
    (id: string) => {
      const store = useUploadQueueStore.getState();
      store.updateItem(id, { status: "queued", retries: 0, error: undefined });
      processQueue(saleId, callbacksRef.current);
    },
    [saleId]
  );

  return {
    items: saleItems,
    pendingCount,
    failedCount,
    hasPending,
    isProcessing,
    retryFailed,
    retryOne,
  };
}
