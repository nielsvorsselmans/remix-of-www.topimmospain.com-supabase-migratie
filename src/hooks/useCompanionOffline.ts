import { useState, useCallback, useEffect, useRef } from "react";
import {
  prefetchTrip,
  isOfflineReady,
  getPendingSyncNotes,
  clearPendingSync,
  type PrefetchProgress,
} from "@/lib/companionOfflineStorage";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { EnrichedTrip } from "@/hooks/useEnrichedTrips";
import type { CompanionNote } from "@/hooks/useCompanionNotes";

interface UseCompanionOfflineOptions {
  tripId?: string;
  tripData?: EnrichedTrip | null;
  notes?: CompanionNote[];
  mapboxToken?: string;
}

export function useCompanionOffline({
  tripId,
  tripData,
  notes = [],
  mapboxToken,
}: UseCompanionOfflineOptions) {
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [progress, setProgress] = useState<PrefetchProgress | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [lastCachedAt, setLastCachedAt] = useState<Date | null>(null);
  const { isReachable } = useOnlineStatus();
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  // Check offline readiness on mount
  useEffect(() => {
    if (!tripId) return;
    isOfflineReady(tripId).then(({ ready, cachedAt }) => {
      setOfflineReady(ready);
      if (cachedAt) setLastCachedAt(new Date(cachedAt));
    });
  }, [tripId]);

  // Start prefetch
  const startPrefetch = useCallback(async () => {
    if (!tripId || !tripData || isPrefetching) return;

    setIsPrefetching(true);
    setProgress({ done: 0, total: 0, label: "Voorbereiden..." });

    try {
      await prefetchTrip(
        tripId,
        tripData,
        notes,
        tripData.scheduled_viewings || [],
        mapboxToken,
        (p) => setProgress(p)
      );

      setOfflineReady(true);
      setLastCachedAt(new Date());
    } catch (err) {
      console.error("[companion-offline] Prefetch failed:", err);
    } finally {
      setIsPrefetching(false);
      // Clear progress after a brief moment
      setTimeout(() => setProgress(null), 1500);
    }
  }, [tripId, tripData, notes, mapboxToken, isPrefetching]);

  // Sync pending notes when back online
  useEffect(() => {
    if (!isReachable || syncingRef.current) return;

    const syncPending = async () => {
      syncingRef.current = true;
      try {
        const pending = await getPendingSyncNotes();
        if (pending.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();

        for (const note of pending) {
          const { pendingSync, offlineUpdatedAt, ...noteData } = note;
          const { error } = await supabase
            .from("viewing_companion_notes")
            .upsert(
              {
                ...noteData,
                created_by: user?.id,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "trip_id,viewing_id" }
            );

          if (!error) {
            await clearPendingSync(note.id);
          }
        }

        // Invalidate queries to refresh
        if (pending.length > 0) {
          queryClient.invalidateQueries({ queryKey: ["companion-notes"] });
        }
      } catch (err) {
        console.warn("[companion-offline] Sync failed:", err);
      } finally {
        syncingRef.current = false;
      }
    };

    syncPending();
  }, [isReachable, queryClient]);

  return {
    isPrefetching,
    progress,
    offlineReady,
    lastCachedAt,
    startPrefetch,
  };
}
