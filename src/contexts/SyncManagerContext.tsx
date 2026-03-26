import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";

// ============= TYPES =============

interface SyncResult {
  imported: number;
  updated: number;
  errors: string[];
}

type V2Phase = 'idle' | 'scraping' | 'processing-background' | 'done';

interface SyncState {
  projectId: string;
  projectName?: string;
  phase: V2Phase;
  jobId: string | null;
  progress: { processed: number; total: number };
  syncResult: SyncResult | null;
}

interface SyncManagerContextValue {
  activeSyncs: Record<string, SyncState>;
  startSync: (projectId: string, dropboxUrl: string, projectName?: string) => Promise<void>;
  resumeSync: (projectId: string, syncStatus: string, syncLog: any, projectName?: string) => void;
  cancelSync: (projectId: string) => Promise<void>;
  resetSync: (projectId: string) => void;
  getSyncState: (projectId: string) => SyncState | null;
  hasActiveSyncs: boolean;
  failedSyncs: FailedSync[];
}

export interface FailedSync {
  projectId: string;
  projectName: string;
  failedAt: string;
  error: string;
}

const SyncManagerContext = createContext<SyncManagerContextValue | null>(null);

// ============= HELPERS =============

function getDynamicInterval(pollCount: number): number {
  const elapsed = pollCount * 5;
  if (elapsed < 120) return 5000;
  if (elapsed < 300) return 10000;
  if (elapsed < 1200) return 20000;
  return 30000;
}

const BACKGROUND_POLL_INTERVAL = 10000; // 10s
const FAILED_SYNC_POLL_INTERVAL = 60000; // 1 minute

// ============= PROVIDER =============

export function SyncManagerProvider({ children }: { children: ReactNode }) {
  const [activeSyncs, setActiveSyncs] = useState<Record<string, SyncState>>({});
  const [failedSyncs, setFailedSyncs] = useState<FailedSync[]>([]);

  // Refs per project for polling/retries
  const pollTimeoutRefs = useRef<Record<string, NodeJS.Timeout | null>>({});
  const pollCountRefs = useRef<Record<string, number>>({});
  const backgroundPollRefs = useRef<Record<string, NodeJS.Timeout | null>>({});
  const failedSyncPollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for failed syncs
  const fetchFailedSyncs = useCallback(async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('project_dropbox_sources')
        .select('project_id, sync_log, updated_at')
        .eq('sync_status', 'failed')
        .gte('updated_at', twentyFourHoursAgo);

      if (!data || data.length === 0) {
        setFailedSyncs([]);
        return;
      }

      // Get project names
      const projectIds = data.map(d => d.project_id);
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .in('id', projectIds);

      const projectMap = new Map((projects || []).map(p => [p.id, p.name]));

      setFailedSyncs(data.map(d => ({
        projectId: d.project_id,
        projectName: projectMap.get(d.project_id) || 'Onbekend project',
        failedAt: d.updated_at,
        error: (d.sync_log as any)?.error || 'Onbekende fout',
      })));
    } catch (err) {
      console.error("Failed to fetch failed syncs:", err);
    }
  }, []);

  useEffect(() => {
    fetchFailedSyncs();
    failedSyncPollRef.current = setInterval(fetchFailedSyncs, FAILED_SYNC_POLL_INTERVAL);
    return () => {
      if (failedSyncPollRef.current) clearInterval(failedSyncPollRef.current);
    };
  }, [fetchFailedSyncs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(pollTimeoutRefs.current).forEach(t => { if (t) clearTimeout(t); });
      Object.values(backgroundPollRefs.current).forEach(t => { if (t) clearTimeout(t); });
    };
  }, []);

  const updateSync = useCallback((projectId: string, updates: Partial<SyncState>) => {
    setActiveSyncs(prev => {
      const existing = prev[projectId];
      if (!existing) return prev;
      return { ...prev, [projectId]: { ...existing, ...updates } };
    });
  }, []);

  const initSync = useCallback((projectId: string, projectName?: string): SyncState => {
    const state: SyncState = {
      projectId,
      projectName,
      phase: 'idle',
      jobId: null,
      progress: { processed: 0, total: 0 },
      syncResult: null,
    };
    setActiveSyncs(prev => ({ ...prev, [projectId]: state }));
    pollCountRefs.current[projectId] = 0;
    return state;
  }, []);

  const resetSync = useCallback((projectId: string) => {
    const timeout = pollTimeoutRefs.current[projectId];
    if (timeout) clearTimeout(timeout);
    pollTimeoutRefs.current[projectId] = null;
    const bgTimeout = backgroundPollRefs.current[projectId];
    if (bgTimeout) clearTimeout(bgTimeout);
    backgroundPollRefs.current[projectId] = null;
    pollCountRefs.current[projectId] = 0;
    setActiveSyncs(prev => {
      const next = { ...prev };
      delete next[projectId];
      return next;
    });
  }, []);

  // ============= BACKGROUND STATUS POLLING =============

  const startBackgroundPoll = useCallback((projectId: string) => {
    const existing = backgroundPollRefs.current[projectId];
    if (existing) clearTimeout(existing);

    const poll = async () => {
      try {
        const { data: source } = await supabase
          .from('project_dropbox_sources')
          .select('sync_status, sync_log')
          .eq('project_id', projectId)
          .single();

        if (!source) return;

        const syncLog = source.sync_log as any || {};

        if (source.sync_status === 'completed' || source.sync_status === 'completed_with_errors') {
          const result: SyncResult = {
            imported: syncLog.total_imported || 0,
            updated: syncLog.total_updated || 0,
            errors: syncLog.all_errors || [],
          };

          setActiveSyncs(prev => {
            const sync = prev[projectId];
            if (!sync) return prev;
            return { ...prev, [projectId]: { ...sync, phase: 'done' as V2Phase, syncResult: result } };
          });

          const name = (() => {
            let n: string | undefined;
            setActiveSyncs(prev => { n = prev[projectId]?.projectName; return prev; });
            return n;
          })();

          if (result.errors.length > 0) {
            toast.warning(`Sync voltooid: ${result.imported} geïmporteerd, ${result.errors.length} fouten`, {
              description: name || undefined,
            });
          } else {
            toast.success(`Sync voltooid: ${result.imported} geïmporteerd, ${result.updated} bijgewerkt`, {
              description: name || undefined,
            });
          }

          // Refresh failed syncs list
          fetchFailedSyncs();

          backgroundPollRefs.current[projectId] = setTimeout(() => resetSync(projectId), 5000);
          return;
        }

        if (source.sync_status === 'failed') {
          const errorMsg = syncLog.error || "Synchronisatie mislukt";
          toast.error(friendlyError(errorMsg));
          resetSync(projectId);
          fetchFailedSyncs();
          return;
        }

        updateSync(projectId, {
          progress: {
            processed: syncLog.processed_index || 0,
            total: syncLog.total_files_to_process || 0,
          },
        });

        backgroundPollRefs.current[projectId] = setTimeout(poll, BACKGROUND_POLL_INTERVAL);
      } catch (err) {
        console.error("Background poll error:", err);
        backgroundPollRefs.current[projectId] = setTimeout(poll, BACKGROUND_POLL_INTERVAL);
      }
    };

    backgroundPollRefs.current[projectId] = setTimeout(poll, BACKGROUND_POLL_INTERVAL);
  }, [resetSync, updateSync, fetchFailedSyncs]);

  // ============= TRIGGER BACKGROUND PROCESSING =============

  const triggerProcessAll = useCallback(async (projectId: string, projectName?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = user ? await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single() : { data: null };

      const { data, error } = await supabase.functions.invoke("sync-dropbox-folder-v2", {
        body: {
          project_id: projectId,
          mode: 'process-all',
          admin_email: profile?.email || user?.email,
          admin_name: profile?.first_name || 'Admin',
          project_name: projectName || 'Project',
        },
      });

      if (error) {
        console.error("Process-all trigger failed:", error);
        toast.error("De verwerking kon niet worden gestart. Neem contact op als dit blijft voorkomen.");
        resetSync(projectId);
        return;
      }

      if (data.status === 'already_completed') {
        console.log("Sync already completed, resetting state");
        resetSync(projectId);
        toast.success("Synchronisatie is al afgerond.");
        return;
      }

      if (data.status === 'already_running') {
        startBackgroundPoll(projectId);
        return;
      }

      startBackgroundPoll(projectId);

      toast.success("Verwerking gestart. Je ontvangt een e-mail zodra het klaar is.", {
        duration: 6000,
      });
    } catch (err) {
      console.error("Process-all error:", err);
      toast.error("De verwerking kon niet worden gestart. Probeer het later opnieuw.");
      resetSync(projectId);
    }
  }, [resetSync, startBackgroundPoll]);

  const schedulePollV2 = useCallback((projectId: string, jobId: string) => {
    const pollCount = pollCountRefs.current[projectId] || 0;
    const interval = getDynamicInterval(pollCount);

    pollTimeoutRefs.current[projectId] = setTimeout(async () => {
      pollCountRefs.current[projectId] = (pollCountRefs.current[projectId] || 0) + 1;

      try {
        const { data, error } = await supabase.functions.invoke("sync-dropbox-folder-v2", {
          body: { jobId, project_id: projectId },
        });

        if (error) {
          console.error("V2 poll error:", error);
          schedulePollV2(projectId, jobId);
          return;
        }

        if (data.status === 'completed') {
          if (data.files_preview && data.files_preview.length > 0) {
            let projectName: string | undefined;
            setActiveSyncs(prev => { projectName = prev[projectId]?.projectName; return prev; });

            updateSync(projectId, {
              phase: 'processing-background',
              jobId: null,
              progress: { processed: 0, total: data.files_preview.length },
            });
            toast.info(`${data.files_found} bestanden gevonden — verwerking gestart`, {
              description: projectName || undefined,
            });
            
            triggerProcessAll(projectId, projectName);
          } else {
            toast.info("Geen importeerbare bestanden gevonden");
            resetSync(projectId);
          }
          return;
        }

        if (data.status === 'failed' || data.status === 'cancelled') {
          toast.error(friendlyError(data.error || "Synchronisatie mislukt"));
          resetSync(projectId);
          return;
        }

        schedulePollV2(projectId, jobId);
      } catch (err) {
        console.error("V2 poll error:", err);
        schedulePollV2(projectId, jobId);
      }
    }, interval);
  }, [updateSync, resetSync, triggerProcessAll]);

  // ============= PUBLIC API =============

  const startSync = useCallback(async (projectId: string, dropboxUrl: string, projectName?: string) => {
    initSync(projectId, projectName);
    updateSync(projectId, { phase: 'scraping' });

    try {
      const { data, error } = await supabase.functions.invoke("sync-dropbox-folder-v2", {
        body: { project_id: projectId, dropbox_url: dropboxUrl },
      });

      if (error) throw error;

      if (data.success && data.jobId) {
        updateSync(projectId, { jobId: data.jobId });
        schedulePollV2(projectId, data.jobId);
      } else {
        toast.error(friendlyError(data.error || "Synchronisatie kon niet worden gestart"));
        resetSync(projectId);
      }
    } catch (err) {
      console.error("V2 sync error:", err);
      toast.error("Er ging iets mis bij het starten van de synchronisatie. Probeer het later opnieuw.");
      resetSync(projectId);
    }
  }, [initSync, updateSync, schedulePollV2, resetSync]);

  const resumeSync = useCallback((projectId: string, syncStatus: string, syncLog: any, projectName?: string) => {
    setActiveSyncs(prev => {
      if (prev[projectId] && prev[projectId].phase !== 'idle') {
        return prev;
      }
      return prev;
    });

    initSync(projectId, projectName);

    if (syncStatus === 'syncing_v2' && syncLog?.jobId) {
      updateSync(projectId, { phase: 'scraping', jobId: syncLog.jobId });
      schedulePollV2(projectId, syncLog.jobId);
    } else if (syncStatus === 'processing') {
      const lastProcessAt = syncLog?.last_process_at ? new Date(syncLog.last_process_at).getTime() : 0;
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      
      updateSync(projectId, {
        phase: 'processing-background',
        progress: {
          processed: syncLog?.processed_index || 0,
          total: syncLog?.total_files_to_process || 0,
        },
      });

      if (lastProcessAt > twoMinutesAgo && (syncLog?.processed_index || 0) > 0) {
        startBackgroundPoll(projectId);
      } else {
        triggerProcessAll(projectId, projectName);
      }
    }
  }, [initSync, updateSync, schedulePollV2, triggerProcessAll, startBackgroundPoll]);

  const cancelSync = useCallback(async (projectId: string) => {
    const sync = activeSyncs[projectId];
    try {
      if (sync?.jobId) {
        await supabase.functions.invoke("sync-dropbox-folder-v2", {
          body: { jobId: sync.jobId, project_id: projectId, mode: 'cancel' },
        });
      } else {
        await supabase.functions.invoke("sync-dropbox-folder-v2", {
          body: { project_id: projectId, mode: 'cancel' },
        });
      }
      toast.info("Synchronisatie geannuleerd");
      resetSync(projectId);
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error("Fout bij annuleren van de synchronisatie");
    }
  }, [activeSyncs, resetSync]);

  const getSyncState = useCallback((projectId: string): SyncState | null => {
    return activeSyncs[projectId] || null;
  }, [activeSyncs]);

  const hasActiveSyncs = Object.values(activeSyncs).some(
    s => s.phase === 'scraping' || s.phase === 'processing-background'
  );

  return (
    <SyncManagerContext.Provider
      value={{
        activeSyncs,
        startSync,
        resumeSync,
        cancelSync,
        resetSync,
        getSyncState,
        hasActiveSyncs,
        failedSyncs,
      }}
    >
      {children}
    </SyncManagerContext.Provider>
  );
}

export function useSyncManager() {
  const ctx = useContext(SyncManagerContext);
  if (!ctx) throw new Error("useSyncManager must be used within SyncManagerProvider");
  return ctx;
}
