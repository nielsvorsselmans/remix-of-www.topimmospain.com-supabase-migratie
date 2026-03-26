import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendlyError";
import { useSyncManager } from "@/contexts/SyncManagerContext";
import {
  FileText,
  FileImage,
  Trash2,
  Download,
  Eye,
  FolderSync,
  RefreshCw,
  ExternalLink,
  
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DocumentUploader } from "@/components/DocumentUploader";
import { ZipUploader } from "@/components/ZipUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { learnFromCorrection } from "@/lib/classifyDocument";

// Platform detection helpers
function detectPlatformFromUrl(url: string): 'dropbox' | 'google_drive' | 'onedrive' | 'generic' {
  if (!url) return 'generic';
  if (/dropbox\.com/i.test(url)) return 'dropbox';
  if (/drive\.google\.com/i.test(url)) return 'google_drive';
  if (/onedrive\.live\.com|sharepoint\.com|1drv\.ms/i.test(url)) return 'onedrive';
  return 'generic';
}

function detectPlatformLabel(url: string): string {
  const p = detectPlatformFromUrl(url);
  switch (p) {
    case 'dropbox': return 'Dropbox';
    case 'google_drive': return 'Google Drive';
    case 'onedrive': return 'OneDrive';
    default: return 'URL';
  }
}

// Dynamic poll interval based on elapsed time
function getDynamicInterval(pollCount: number): number {
  const elapsedSeconds = pollCount * 5;
  if (elapsedSeconds < 120) return 5000;
  if (elapsedSeconds < 300) return 10000;
  if (elapsedSeconds < 1200) return 20000;
  return 30000;
}

const DOCUMENT_TYPES = [
  { value: "beschikbaarheidslijst", label: "Beschikbaarheidslijst" },
  { value: "brochure", label: "Brochure" },
  { value: "floorplan", label: "Grondplan" },
  { value: "masterplan", label: "Masterplan" },
  { value: "pricelist", label: "Prijslijst" },
  { value: "specificaties", label: "Specificaties" },
  { value: "video_link", label: "Video Link" },
  { value: "andere", label: "Andere" },
];

const CATEGORY_LABELS: Record<string, string> = {
  prijslijst: "Prijslijst",
  plannen: "Grondplan",
  brochure: "Brochure",
  andere: "Andere",
  other: "Andere",
};

interface ProjectDocument {
  id: string;
  title: string;
  description: string | null;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  visible_public: boolean;
  visible_portal: boolean;
  order_index: number;
  sync_source: string;
  is_pricelist: boolean;
  dropbox_url: string | null;
}

interface SyncLog {
  foldersFound?: number;
  foldersSkipped?: number;
  documentsImported?: number;
  documentsUpdated?: number;
  documentsSkipped?: number;
  documentsHidden?: number;
  videoLinksStored?: number;
  errors?: string[];
  jobId?: string;
  platform?: string;
  raw_files?: any[];
  processed_index?: number;
  total_files_to_process?: number;
  total_imported?: number;
  total_updated?: number;
  total_pricelist_versions?: number;
  total_errors?: number;
  all_errors?: string[];
}

interface CloudSource {
  id: string;
  dropbox_root_url: string;
  source_type: 'dropbox' | 'sharepoint';
  sync_status: string;
  last_full_sync_at: string | null;
  sync_log: SyncLog | null;
}

interface DropboxFolder {
  id: string;
  folder_url: string;
  folder_path: string;
  folder_name: string;
  folder_type: string;
  auto_check: boolean;
  skipped: boolean;
  file_count: number;
  last_checked_at: string | null;
}

interface FilePreview {
  index: number;
  filename: string;
  category: string;
  folder_path: string;
  is_building_plan: boolean;
}

interface SyncResult {
  imported: number;
  updated: number;
  errors: string[];
}

interface SyncHistoryEntry {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  files_found: number;
  files_imported: number;
  files_failed: number;
  error_summary: string | null;
  details: any;
  triggered_by: string | null;
}

interface ProjectDocumentManagerProps {
  projectId: string;
  projectName?: string;
}

type V2Phase = 'idle' | 'scraping' | 'processing-background' | 'done';

export function ProjectDocumentManager({ projectId, projectName }: ProjectDocumentManagerProps) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [cloudSource, setCloudSource] = useState<CloudSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dropboxUrl, setDropboxUrl] = useState("");
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);

  // Sync result display (local, from context done state)
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>([]);
  const [showSyncHistory, setShowSyncHistory] = useState(false);

  // Use global sync manager
  const {
    getSyncState,
    startSync,
    resumeSync,
    cancelSync,
    resetSync,
  } = useSyncManager();

  const syncState = getSyncState(projectId);
  const v2Phase = syncState?.phase || 'idle';
  const v2Progress = syncState?.progress || { processed: 0, total: 0 };
  const syncResult = syncState?.syncResult || null;
  const syncing = v2Phase === 'scraping' || v2Phase === 'processing-background';

  // Initial data fetch + auto-resume
  const fetchSyncHistory = async () => {
    try {
      const { data } = await supabase
        .from('project_sync_history')
        .select('*')
        .eq('project_id', projectId)
        .order('started_at', { ascending: false })
        .limit(5);
      setSyncHistory((data as SyncHistoryEntry[]) || []);
    } catch (err) {
      console.error("Error fetching sync history:", err);
    }
  };

  useEffect(() => {
    fetchDataAndRecover();
    fetchSyncHistory();
  }, [projectId]);

  const fetchDataAndRecover = async () => {
    try {
      setLoading(true);
      const { data: docs, error: docsError } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (docsError) throw docsError;
      setDocuments(docs || []);

      const { data: source } = await supabase
        .from("project_dropbox_sources")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (source) {
        const cs: CloudSource = {
          ...source,
          source_type: (source.source_type || 'dropbox') as 'dropbox' | 'sharepoint',
          sync_log: source.sync_log as SyncLog | null,
        };
        setCloudSource(cs);
        setDropboxUrl(source.dropbox_root_url);

        // Auto-resume: if DB shows active sync but no context state, resume automatically
        const currentSync = getSyncState(projectId);
        if (!currentSync || currentSync.phase === 'idle') {
          if (source.sync_status === 'syncing_v2' || source.sync_status === 'processing') {
            resumeSync(projectId, source.sync_status, source.sync_log as any, projectName);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Fout bij ophalen documenten");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const { data: docs } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });
      setDocuments(docs || []);

      const { data: source } = await supabase
        .from("project_dropbox_sources")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (source) {
        setCloudSource({
          ...source,
          source_type: (source.source_type || 'dropbox') as 'dropbox' | 'sharepoint',
          sync_log: source.sync_log as SyncLog | null,
        });
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };

  // ============= V2 SYNC METHODS (delegated to SyncManager) =============

  const handleDropboxSync = async () => {
    if (!dropboxUrl) {
      toast.error("Voer een URL in");
      return;
    }
    const platformLabel = detectPlatformLabel(dropboxUrl);
    toast.info(`Synchronisatie gestart voor ${platformLabel}...`);
    await startSync(projectId, dropboxUrl, projectName);
  };

  const handleSyncWithConfirmation = () => {
    if (documents.length > 0) {
      setShowSyncConfirm(true);
    } else {
      handleDropboxSync();
    }
  };

  // handleResumeSync removed - auto-resume handles this

  const handleCancelV2 = async () => {
    await cancelSync(projectId);
    await fetchData();
  };

  // handleStartProcessing removed - auto-import handles this

  // Refresh documents and sync history when sync completes
  useEffect(() => {
    if (v2Phase === 'done') {
      fetchData();
      fetchSyncHistory();
    }
  }, [v2Phase]);

  // ============= DOCUMENT CRUD =============

  const handleUpload = async (file: { name: string; size: number; type: string; url: string }) => {
    try {
      const title = file.name.replace(/\.[^/.]+$/, "");
      const { error } = await supabase.from("project_documents").insert({
        project_id: projectId,
        title,
        file_url: file.url,
        file_name: file.name,
        file_size: file.size,
        document_type: "andere",
        visible_public: true,
        visible_portal: true,
        order_index: documents.length,
        sync_source: "manual",
      });
      if (error) throw error;
      await fetchData();
      toast.success("Document toegevoegd");
    } catch (err) {
      console.error("Error saving document:", err);
      toast.error("Fout bij opslaan document");
    }
  };

  const updateDocument = async (id: string, updates: Partial<ProjectDocument>) => {
    try {
      const doc = documents.find((d) => d.id === id);
      if (updates.document_type && doc && updates.document_type !== doc.document_type) {
        learnFromCorrection(doc.file_name, doc.title, updates.document_type).then(() => {
          console.log('[updateDocument] Learning complete for pattern');
        });
      }
      const { error } = await supabase
        .from("project_documents")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );
      toast.success("Document bijgewerkt");
    } catch (err) {
      console.error("Error updating document:", err);
      toast.error(`Fout bij bijwerken document: ${err instanceof Error ? err.message : 'Onbekende fout'}`);
    }
  };

  const handleOpenDocument = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      toast.info("Download wordt gestart...");
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download mislukt');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download gestart");
    } catch (error) {
      console.error('Download failed:', error);
      toast.error("Download mislukt, document wordt geopend in nieuwe tab");
      handleOpenDocument(url);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const doc = documents.find((d) => d.id === id);
      const { error } = await supabase
        .from("project_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
      if (doc?.file_url && doc.sync_source === "manual") {
        const urlParts = doc.file_url.split("/project-documents/");
        if (urlParts.length > 1) {
          await supabase.storage
            .from("project-documents")
            .remove([urlParts[1]]);
        }
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document verwijderd");
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Fout bij verwijderen document");
    } finally {
      setDeleteId(null);
    }
  };

  // Preview helpers now delegated to SyncManager context

  // ============= RENDER HELPERS =============

  const getFileIcon = (doc: ProjectDocument) => {
    if (doc.document_type === "video_link") {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    const ext = doc.file_name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png"].includes(ext || "")) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    }
    return <FileText className="h-5 w-5 text-red-500" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };


  const getPhaseLabel = (): string => {
    switch (v2Phase) {
      case 'scraping': return 'Mapstructuur analyseren...';
      case 'processing-background':
        return v2Progress.total > 0
          ? `Bestanden verwerken op achtergrond (${v2Progress.processed}/${v2Progress.total})...`
          : 'Bestanden worden op de achtergrond verwerkt. Je ontvangt een e-mail zodra het klaar is.';
      case 'done': return 'Synchronisatie voltooid';
      default: return '';
    }
  };

  const getSyncStatusBadge = () => {
    const status = cloudSource?.sync_status;
    
    if (v2Phase === 'scraping') {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Analyseren...
        </Badge>
      );
    }
    
    if (v2Phase === 'processing-background') {
      return (
        <Badge variant="outline" className="text-indigo-600 border-indigo-600">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Achtergrond {v2Progress.total > 0 ? `(${v2Progress.processed}/${v2Progress.total})` : ''}
        </Badge>
      );
    }

    if (status === 'completed' || status === 'completed_with_errors') {
      return (
        <Badge variant="outline" className={status === 'completed_with_errors' ? "text-yellow-600 border-yellow-600" : "text-green-600 border-green-600"}>
          <CheckCircle className="h-3 w-3 mr-1" />
          {status === 'completed_with_errors' ? 'Voltooid (met fouten)' : 'Gesynchroniseerd'}
        </Badge>
      );
    }

    if (status === 'syncing' || status === 'syncing_v2') {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Bezig...
        </Badge>
      );
    }

    if (status === 'failed') {
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Mislukt
        </Badge>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cloud Sync Section */}
      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FolderSync className="h-4 w-4" />
            Cloud Sync
          </h4>
          {getSyncStatusBadge()}
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Dropbox, Google Drive of OneDrive URL"
              value={dropboxUrl}
              onChange={(e) => setDropboxUrl(e.target.value)}
            />
            {dropboxUrl && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Badge variant="secondary" className="text-[10px] py-0">
                  {detectPlatformLabel(dropboxUrl)}
                </Badge>
              </div>
            )}
          </div>
          <Button onClick={handleSyncWithConfirmation} disabled={syncing || !dropboxUrl}>
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {cloudSource ? "Re-sync" : "Start Sync"}
          </Button>
          {(v2Phase === 'scraping' || v2Phase === 'processing-background' || (v2Phase === 'idle' && !syncing && (cloudSource?.sync_status === 'syncing_v2' || cloudSource?.sync_status === 'processing'))) && (
            <Button variant="outline" onClick={handleCancelV2} className="text-destructive border-destructive">
              <XCircle className="h-4 w-4 mr-2" />
              Annuleren
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {v2Phase === 'processing-background' && v2Progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{getPhaseLabel()}</span>
              <span>{Math.round((v2Progress.processed / v2Progress.total) * 100)}%</span>
            </div>
            <Progress value={(v2Progress.processed / v2Progress.total) * 100} className="h-2" />
          </div>
        )}

        {v2Phase === 'scraping' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Mapstructuur wordt geanalyseerd — dit duurt meestal 1-3 minuten.</span>
          </div>
        )}

        {v2Phase === 'processing-background' && (
          <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            <span>Bestanden worden op de achtergrond verwerkt. Je kunt deze pagina veilig verlaten — je ontvangt een e-mail zodra het klaar is.</span>
          </div>
        )}

        {cloudSource?.last_full_sync_at && v2Phase === 'idle' && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Laatst gesynchroniseerd: {new Date(cloudSource.last_full_sync_at).toLocaleString("nl-NL")}
          </div>
        )}

        {/* Sync Result Summary */}
        {syncResult && v2Phase === 'idle' && (
          <Collapsible open={showResultDetails} onOpenChange={setShowResultDetails}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm w-full">
              <div className="flex items-center gap-2 flex-1">
                {syncResult.errors.length > 0 ? (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <span className="text-sm">
                  {syncResult.imported} geïmporteerd, {syncResult.updated} bijgewerkt
                  {syncResult.errors.length > 0 && (
                    <span className="text-yellow-600 ml-1">({syncResult.errors.length} fouten)</span>
                  )}
                </span>
              </div>
              {syncResult.errors.length > 0 && (
                <ChevronDown className={`h-4 w-4 transition-transform ${showResultDetails ? 'rotate-180' : ''}`} />
              )}
            </CollapsibleTrigger>
            {syncResult.errors.length > 0 && (
              <CollapsibleContent className="mt-2">
                <div className="bg-destructive/5 border border-destructive/20 rounded-md p-3 space-y-1">
                  {syncResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                      <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            )}
          </Collapsible>
        )}

        {/* Sync History */}
        {syncHistory.length > 0 && v2Phase === 'idle' && (
          <Collapsible open={showSyncHistory} onOpenChange={setShowSyncHistory}>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground w-full hover:text-foreground transition-colors">
              <Clock className="h-3 w-3" />
              <span>Laatste syncs ({syncHistory.length})</span>
              <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showSyncHistory ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1.5">
              {syncHistory.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-xs border rounded px-3 py-2 bg-background">
                  <div className="flex items-center gap-2">
                    {entry.status === 'success' && <CheckCircle className="h-3 w-3 text-green-600" />}
                    {entry.status === 'partial' && <AlertCircle className="h-3 w-3 text-yellow-600" />}
                    {entry.status === 'failed' && <XCircle className="h-3 w-3 text-destructive" />}
                    {entry.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-blue-600" />}
                    <span>
                      {new Date(entry.started_at).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {entry.files_imported > 0 && <span>{entry.files_imported} geïmporteerd</span>}
                    {entry.files_failed > 0 && <span className="text-destructive">{entry.files_failed} mislukt</span>}
                    {entry.error_summary && entry.status === 'failed' && (
                      <span className="text-destructive truncate max-w-[200px]" title={friendlyError(entry.error_summary)}>
                        {friendlyError(entry.error_summary)}
                      </span>
                    )}
                    {entry.triggered_by && (
                      <span className="text-muted-foreground/60">{entry.triggered_by.split('@')[0]}</span>
                    )}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Upload Section with Tabs */}
      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Documenten Toevoegen
        </h4>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Handmatig</TabsTrigger>
            <TabsTrigger value="zip">ZIP Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="mt-4">
            <DocumentUploader onUpload={handleUpload} />
          </TabsContent>
          <TabsContent value="zip" className="mt-4">
            <ZipUploader projectId={projectId} onComplete={fetchData} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Documenten ({documents.length})</h4>
          {documents.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getFileIcon(doc)}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Titel</Label>
                      <Input
                        value={doc.title}
                        onChange={(e) => updateDocument(doc.id, { title: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={doc.document_type}
                        onValueChange={(value) => updateDocument(doc.id, { document_type: value })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{doc.file_name} ({formatFileSize(doc.file_size)})</span>
                      {doc.sync_source && doc.sync_source !== "manual" && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          Via {doc.sync_source === 'dropbox' ? 'Dropbox' : doc.sync_source === 'google_drive' ? 'Google Drive' : doc.sync_source === 'onedrive' ? 'OneDrive' : doc.sync_source}
                        </Badge>
                      )}
                      {doc.is_pricelist && (
                        <Badge variant="outline" className="text-[10px] py-0 text-green-600 border-green-600">
                          Prijslijst (auto-update)
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Publiek</span>
                        <Switch
                          checked={doc.visible_public}
                          onCheckedChange={(checked) => updateDocument(doc.id, { visible_public: checked })}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Portaal</span>
                        <Switch
                          checked={doc.visible_portal}
                          onCheckedChange={(checked) => updateDocument(doc.id, { visible_portal: checked })}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {doc.dropbox_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDocument(doc.dropbox_url!)}
                      title="Open bronbestand"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleOpenDocument(doc.file_url)}
                    title="Bekijk document"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(doc.file_url, doc.file_name)}
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Document verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit document wordt permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteDocument(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync confirmation dialog */}
      <AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bestaande bestanden bijwerken?</AlertDialogTitle>
            <AlertDialogDescription>
              Er zijn al {documents.length} documenten gekoppeld aan dit project. Een nieuwe sync zal bestaande bestanden bijwerken en nieuwe toevoegen. Wil je doorgaan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowSyncConfirm(false); handleDropboxSync(); }}>
              Doorgaan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
