import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { typedFrom } from "./typed-client";
import { ScrapeError } from "./types";

// ── Shared helpers ──────────────────────────────────────────────────

interface PollResult {
  status: string;
  success?: boolean;
  data?: any;
  error?: string;
  code?: string;
  enrichmentJobId?: string;
}

interface PollerOptions {
  jobId: string;
  sourceUrl: string;
  maxPolls?: number;
  intervalMs?: number;
  firstPollMs?: number;
  onCancel: (jobId: string) => Promise<void>;
}

/**
 * Creates a recursive setTimeout poller that avoids race conditions.
 * Returns { start, stop } — start returns a Promise that resolves/rejects
 * when polling completes or fails.
 */
function createPoller(
  pollRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  stopPolling: () => void,
  options: PollerOptions,
) {
  const { jobId, sourceUrl, maxPolls = 80, intervalMs = 3000, firstPollMs = 2000, onCancel } = options;

  const start = (): Promise<any> =>
    new Promise((resolve, reject) => {
      let pollCount = 0;

      const doPoll = async (): Promise<void> => {
        pollCount++;
        if (pollCount > maxPolls) {
          stopPolling();
          try { await onCancel(jobId); } catch { /* best effort */ }
          reject(new Error("Scraping duurde te lang (timeout)"));
          return;
        }

        try {
          const { data, error } = await supabase.functions.invoke("scrape-idealista", {
            body: { jobId, sourceUrl },
          });

          if (error) {
            scheduleNext();
            return;
          }

          if (data?.status === "completed" && data?.success) {
            stopPolling();
            resolve(data);
            return;
          }

          if (
            data?.status === "failed" ||
            data?.status === "cancelled" ||
            (data && !data.success && data.status !== "polling")
          ) {
            stopPolling();
            reject(new ScrapeError(data.error || "Scraping mislukt", data.code));
            return;
          }

          // status === 'polling' → next iteration
          scheduleNext();
        } catch (e) {
          console.warn("Poll exception:", e);
          scheduleNext();
        }
      };

      const scheduleNext = () => {
        pollRef.current = setTimeout(doPoll, intervalMs);
      };

      // First poll slightly earlier
      pollRef.current = setTimeout(doPoll, firstPollMs);
    });

  return { start };
}

/**
 * Writes scraped data to the external_listings table.
 * Used by both useScrapeIdealista (indirectly) and useRetryScrape.
 */
export async function updateListingFromScrape(listingId: string, scraped: any, status: "success" | "failed" = "success") {
  if (status === "success") {
    const { error } = await typedFrom("external_listings")
      .update({
        title: scraped.title || undefined,
        price: scraped.price || undefined,
        city: scraped.city || undefined,
        region: scraped.region || undefined,
        bedrooms: scraped.bedrooms || undefined,
        bathrooms: scraped.bathrooms || undefined,
        area_sqm: scraped.area_sqm || undefined,
        plot_size_sqm: scraped.plot_size_sqm || undefined,
        description: scraped.description || undefined,
        features: scraped.features || undefined,
        images: scraped.images || undefined,
        raw_scraped_data: scraped.raw_scraped_data || undefined,
        scrape_status: "success",
        scrape_error: null,
        last_scrape_attempt: new Date().toISOString(),
      })
      .eq("id", listingId);
    if (error) throw new Error(`DB update failed: ${error.message}`);
  } else {
    const { error } = await typedFrom("external_listings")
      .update({
        scrape_status: "failed",
        scrape_error: scraped.code || "AGENT_FAILED",
        last_scrape_attempt: new Date().toISOString(),
      })
      .eq("id", listingId);
    if (error) throw new Error(`DB update failed: ${error.message}`);
  }
}

/**
 * Polls enrichment endpoint (max 3 attempts, 10s interval).
 * On success, merges enriched data into the listing.
 * On failure, silently skips (enrichment is a bonus).
 */
export async function pollEnrichment(
  enrichmentJobId: string,
  listingId: string,
): Promise<boolean> {
  const MAX_ATTEMPTS = 3;
  const INTERVAL_MS = 10_000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Wait before polling (skip first wait for faster response)
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, INTERVAL_MS));
    }

    try {
      const { data, error } = await supabase.functions.invoke("scrape-idealista", {
        body: { enrichmentJobId },
      });

      if (error) {
        console.warn("Enrichment poll error:", error.message);
        continue;
      }

      if (data?.status === "enrichment_completed" && data?.data) {
        const enriched = data.data;
        // Merge: only fill empty fields on the listing
        const { data: existing } = await typedFrom("external_listings")
          .select("images, features, description, area_sqm")
          .eq("id", listingId)
          .maybeSingle();

        if (existing) {
          const updates: Record<string, any> = {};

          // Merge images (append new ones)
          if (Array.isArray(enriched.images) && enriched.images.length > 0) {
            const currentImages = Array.isArray(existing.images) ? existing.images : [];
            const newImages = enriched.images.filter((img: string) => !currentImages.includes(img));
            if (newImages.length > 0) {
              updates.images = [...currentImages, ...newImages];
            }
          }

          // Merge features (fill missing keys)
          if (enriched.features && typeof enriched.features === "object") {
            const currentFeatures = (existing.features || {}) as Record<string, unknown>;
            const mergedFeatures = { ...currentFeatures };
            let hasNew = false;
            for (const [key, value] of Object.entries(enriched.features)) {
              if (value && !(key in currentFeatures)) {
                mergedFeatures[key] = value;
                hasNew = true;
              }
            }
            if (hasNew) updates.features = mergedFeatures;
          }

          // Fill description if empty
          if (!existing.description && enriched.description) {
            updates.description = enriched.description;
          }
          // Fill area_sqm if empty
          if (!existing.area_sqm && enriched.area_sqm) {
            updates.area_sqm = enriched.area_sqm;
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await typedFrom("external_listings")
              .update(updates)
              .eq("id", listingId);
            if (updateError) {
              console.warn("Enrichment merge failed:", updateError.message);
            } else {
              console.log("Enrichment merged successfully:", Object.keys(updates));
              return true;
            }
          }
        }
        return true;
      }

      if (data?.status === "enrichment_polling") {
        // Still running, wait and retry
        await new Promise((r) => setTimeout(r, INTERVAL_MS));
        continue;
      }

      // Any other status = done or failed
      return false;
    } catch (err) {
      console.warn("Enrichment poll exception:", err);
    }
  }

  return false;
}

// ── Hooks ───────────────────────────────────────────────────────────

/** Cancel a running Firecrawl agent job */
export function useCancelScrape() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase.functions.invoke("scrape-idealista-cancel", {
        body: { jobId },
      });
      if (error) throw error;
    },
  });
}

/**
 * Two-phase scrape: start → poll → complete/fail.
 * Uses shared createPoller() for DRY recursive setTimeout logic.
 */
export function useScrapeIdealista() {
  const [jobId, setJobId] = useState<string | null>(null);
  
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelScrape = useCancelScrape();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const cancel = useCallback(async () => {
    stopPolling();
    if (jobId) {
      try { await cancelScrape.mutateAsync(jobId); } catch { /* best effort */ }
    }
    setJobId(null);
    
  }, [jobId, stopPolling, cancelScrape]);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (url: string): Promise<any> => {
      if (jobId) throw new Error("Er loopt al een scrape");

      // Phase 1: Start
      const { data: startData, error: startError } = await supabase.functions.invoke("scrape-idealista", {
        body: { url },
      });
      if (startError || !startData?.success) {
        throw new ScrapeError(startData?.error || startError?.message || "Start mislukt", startData?.code);
      }

      const activeJobId = startData.jobId;
      const activeSourceUrl = startData.sourceUrl || url;
      setJobId(activeJobId);
      

      // Phase 2: Poll
      const poller = createPoller(pollRef, stopPolling, {
        jobId: activeJobId,
        sourceUrl: activeSourceUrl,
        onCancel: (id) => cancelScrape.mutateAsync(id),
      });

      try {
        const result: PollResult = await poller.start();
        setJobId(null);
        // Return full result so enrichmentJobId is accessible
        return { ...result.data, _enrichmentJobId: result.enrichmentJobId };
      } catch (e) {
        setJobId(null);
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-listing-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["all-external-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["customer-external-listings"] });
      queryClient.invalidateQueries({ queryKey: ["external-submissions"] });
    },
    onSettled: () => stopPolling(),
  });

  return { ...mutation, jobId, cancel, isActive: !!jobId };
}

/**
 * Admin: retry scrape for a failed listing (two-phase).
 * Uses shared createPoller() + updateListingFromScrape().
 */
export function useRetryScrape() {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelScrape = useCancelScrape();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const cancel = useCallback(async () => {
    stopPolling();
    if (activeJobId) {
      try { await cancelScrape.mutateAsync(activeJobId); } catch { /* */ }
    }
    setActiveJobId(null);
  }, [activeJobId, stopPolling, cancelScrape]);

  const mutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { data: listing, error: fetchError } = await typedFrom("external_listings")
        .select("id, source_url")
        .eq("id", listingId)
        .single();
      if (fetchError || !listing?.source_url) throw new Error("Kon listing niet ophalen");

      await typedFrom("external_listings")
        .update({ scrape_status: "pending", last_scrape_attempt: new Date().toISOString() })
        .eq("id", listingId);

      // Phase 1: Start
      const { data: startData, error: startError } = await supabase.functions.invoke("scrape-idealista", {
        body: { url: listing.source_url },
      });
      if (startError || !startData?.success) {
        const errMsg = startData?.error || startError?.message || "Start mislukt";
        await updateListingFromScrape(listingId, { code: startData?.code || "UNKNOWN" }, "failed");
        throw new Error(errMsg);
      }

      const jId = startData.jobId;
      const sUrl = startData.sourceUrl || listing.source_url;
      setActiveJobId(jId);

      // Phase 2: Poll
      const poller = createPoller(pollRef, stopPolling, {
        jobId: jId,
        sourceUrl: sUrl,
        onCancel: async (id) => {
          try { await cancelScrape.mutateAsync(id); } catch { /* */ }
          await updateListingFromScrape(listingId, { code: "TIMEOUT" }, "failed");
        },
      });

      try {
        const result: PollResult = await poller.start();
        setActiveJobId(null);
        const scraped = result.data;
        await updateListingFromScrape(listingId, scraped, "success");
        return scraped;
      } catch (e) {
        setActiveJobId(null);
        const code = e instanceof ScrapeError ? e.code : "AGENT_FAILED";
        await updateListingFromScrape(listingId, { code }, "failed");
        throw e;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-listing-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["all-external-assignments"] });
      toast.success("Pand succesvol opnieuw gescrapet");
    },
    onError: (error) => {
      toast.error(`Scraping mislukt: ${error.message}`);
    },
    onSettled: () => stopPolling(),
  });

  return { ...mutation, activeJobId, cancel, isActive: !!activeJobId };
}
