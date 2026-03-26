import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { compressImage } from "@/lib/imageCompression";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordingDialog } from "./RecordingDialog";
import { VoiceItemPreview } from "./VoiceItemPreview";
import { VoiceRecording, VoiceItem } from "@/hooks/useVoiceSnagging";
import { voiceOfflineStorage } from "@/lib/voiceOfflineStorage";
import { useUploadQueueStore } from "@/lib/uploadQueue";
import { Upload, Loader2, Trash2, RotateCcw, Clock, FileAudio, ChevronDown, Mic, Plus, CloudOff } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ── Concrete mutation interfaces (replaces ReturnType<typeof useXxx> imports) ──

interface MutationCallbacks {
  uploadRecording: {
    mutateAsync: (vars: { saleId: string; roomName: string; blob: Blob; inspectionId?: string }) => Promise<VoiceRecording>;
    isPending: boolean;
  };
  analyzeRecording: {
    mutate: (vars: { recordingId: string; saleId: string }) => void;
    mutateAsync: (vars: { recordingId: string; saleId: string }) => Promise<any>;
    isPending: boolean;
  };
  deleteRecording: {
    mutate: (vars: { recording: VoiceRecording }) => void;
    isPending: boolean;
  };
  updateItems: {
    mutate: (vars: { recordingId: string; saleId: string; items: VoiceItem[] }) => void;
  };
  uploadMedia: {
    mutateAsync: (vars: { saleId: string; roomName: string; itemIndex: number; file: File }) => Promise<string>;
    isPending: boolean;
  };
  createManual: {
    mutateAsync: (vars: { saleId: string; roomName: string; items: VoiceItem[]; inspectionId?: string }) => Promise<VoiceRecording>;
    isPending: boolean;
  };
}

interface Props {
  saleId: string;
  roomName: string;
  recordings: VoiceRecording[];
  mutations: MutationCallbacks;
  isMobile?: boolean;
  embedded?: boolean;
  desktopFilter?: "all" | "defects" | "no-photo" | "ok";
  onAddManualItemRef?: React.MutableRefObject<(() => void) | null>;
  onFileUploadRef?: React.MutableRefObject<HTMLInputElement | null>;
  inspectionId?: string;
}

export function VoiceRoomCard({ saleId, roomName, recordings, mutations, isMobile, embedded, desktopFilter, onAddManualItemRef, onFileUploadRef, inspectionId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = mutations.uploadRecording;
  const analyzeMutation = mutations.analyzeRecording;
  const deleteMutation = mutations.deleteRecording;
  const updateItemsMutation = mutations.updateItems;
  const uploadMediaMutation = mutations.uploadMedia;
  const createManualMutation = mutations.createManual;
  const [pendingOffline, setPendingOffline] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "uploading" | "analyzing">("idle");
  const [showSourceMaterial, setShowSourceMaterial] = useState(false);
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = useState(false);
  const [autoEditIndex, setAutoEditIndex] = useState<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const handleAddManualItemRef = useRef<() => void>(() => {});

  // Merge all items from all completed recordings into one flat list
  const mergedItems = useMemo(() => {
    const items: { item: VoiceItem; recordingId: string; localIndex: number }[] = [];
    for (const rec of recordings) {
      if (rec.status === "completed" && rec.ai_items) {
        rec.ai_items.forEach((item, idx) => {
          items.push({ item, recordingId: rec.id, localIndex: idx });
        });
      }
    }
    return items;
  }, [recordings]);

  const flatItems = useMemo(() => mergedItems.map(m => m.item), [mergedItems]);

  const handleRecordingComplete = async (blob: Blob, _roomName: string) => {
    if (!navigator.onLine) {
      await voiceOfflineStorage.save(blob, saleId, roomName, inspectionId || "");
      setPendingOffline(true);
      toast({ title: "Opname opgeslagen", description: "Wordt verwerkt zodra je weer online bent." });
      return;
    }
    try {
      if (!inspectionId) {
        toast({ title: "Geen inspectie geselecteerd", description: "Opname kan niet worden opgeslagen zonder actieve inspectie.", variant: "destructive" });
        return;
      }
      setProcessingStatus("uploading");
      const recording = await uploadMutation.mutateAsync({ saleId, roomName, blob, inspectionId });
      setProcessingStatus("analyzing");
      await analyzeMutation.mutateAsync({ recordingId: recording.id, saleId });
      const itemCount = recording.ai_items?.length || 0;
      toast({ title: "Analyse voltooid", description: `${itemCount > 0 ? itemCount + " punten gevonden" : "Verwerking klaar"}.` });
    } catch {
      // errors handled by mutations
    } finally {
      setProcessingStatus("idle");
    }
  };

  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = [".mp3", ".webm", ".m4a", ".ogg", ".wav"];
  const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/x-m4a"];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      toast({ title: "Ongeldig bestandstype", description: `Toegestane formaten: ${ALLOWED_EXTENSIONS.join(", ")}`, variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Bestand te groot", description: "Maximum bestandsgrootte is 20MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (!navigator.onLine) {
      await voiceOfflineStorage.save(file, saleId, roomName, inspectionId || "");
      setPendingOffline(true);
      toast({ title: "Bestand opgeslagen", description: "Wordt verwerkt zodra je weer online bent." });
      return;
    }
    try {
      if (!inspectionId) {
        toast({ title: "Geen inspectie geselecteerd", description: "Upload kan niet worden verwerkt zonder actieve inspectie.", variant: "destructive" });
        return;
      }
      setProcessingStatus("uploading");
      const recording = await uploadMutation.mutateAsync({ saleId, roomName, blob: file, inspectionId });
      setProcessingStatus("analyzing");
      await analyzeMutation.mutateAsync({ recordingId: recording.id, saleId });
      toast({ title: "Analyse voltooid", description: "AI heeft de opname geanalyseerd." });
    } catch {
      // handled by mutations
    } finally {
      setProcessingStatus("idle");
      e.target.value = "";
    }
  };

  const persistItems = useCallback((updatedFlatItems: VoiceItem[]) => {
    const recordingUpdates = new Map<string, { recording: VoiceRecording; items: VoiceItem[] }>();
    for (const rec of recordings) {
      if (rec.status === "completed" && rec.ai_items) {
        recordingUpdates.set(rec.id, { recording: rec, items: [...rec.ai_items] });
      }
    }

    updatedFlatItems.forEach((item, flatIdx) => {
      if (flatIdx < mergedItems.length) {
        const { recordingId, localIndex } = mergedItems[flatIdx];
        const entry = recordingUpdates.get(recordingId);
        if (entry) entry.items[localIndex] = item;
      } else {
        const lastRec = recordings.filter(r => r.status === "completed").pop();
        if (lastRec) {
          const entry = recordingUpdates.get(lastRec.id);
          if (entry) entry.items.push(item);
        }
      }
    });

    if (updatedFlatItems.length < mergedItems.length) {
      const newRecItems = new Map<string, VoiceItem[]>();
      for (const rec of recordings) {
        if (rec.status === "completed") newRecItems.set(rec.id, []);
      }
      updatedFlatItems.forEach((item, idx) => {
        if (idx < mergedItems.length) {
          const { recordingId } = mergedItems[idx];
          newRecItems.get(recordingId)?.push(item);
        } else {
          const lastRec = recordings.filter(r => r.status === "completed").pop();
          if (lastRec) newRecItems.get(lastRec.id)?.push(item);
        }
      });
      for (const [recId] of newRecItems) {
        const items = newRecItems.get(recId)!;
        updateItemsMutation.mutate({ recordingId: recId, saleId, items });
      }
      return;
    }

    for (const [recId, { recording, items }] of recordingUpdates) {
      if (JSON.stringify(items) !== JSON.stringify(recording.ai_items)) {
        updateItemsMutation.mutate({ recordingId: recId, saleId, items });
      }
    }
  }, [recordings, mergedItems, updateItemsMutation, saleId]);

  const handleUpdateItems = useCallback((updatedFlatItems: VoiceItem[]) => {
    persistItems(updatedFlatItems);
  }, [persistItems]);

  const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);

  // Read pending photo count for this room from upload queue
  const pendingPhotoCount = useUploadQueueStore((s) =>
    s.items.filter(
      (i) => i.type === "photo" && i.saleId === saleId && i.roomName === roomName && i.status !== "done"
    ).length
  );

  const handleUploadMedia = async (itemIndex: number, files: File[]) => {
    if (itemIndex >= mergedItems.length) return;
    const { recordingId, localIndex } = mergedItems[itemIndex];
    const rec = recordings.find(r => r.id === recordingId);
    if (!rec) return;

    setUploadingItemIndex(itemIndex);
    try {
      for (const file of files) {
        console.log("[photo] captured", { itemIndex, localIndex, roomName, fileSize: file.size, type: file.type });
        const compressed = await compressImage(file);

        // 1. Always persist to IndexedDB first
        const photoInspectionId = inspectionId || "";
        let offlinePhoto;
        try {
          offlinePhoto = await voiceOfflineStorage.savePhoto(compressed, saleId, roomName, localIndex, photoInspectionId);
        } catch (persistErr) {
          console.error("[photo] IndexedDB save failed", persistErr);
          toast({ title: "Opslaan mislukt", description: "Foto kon niet lokaal worden opgeslagen.", variant: "destructive" });
          continue;
        }

        const localUrl = URL.createObjectURL(compressed);

        // 2. Add to upload queue immediately so it survives refresh
        useUploadQueueStore.getState().addItems([{
          id: offlinePhoto.id,
          type: "photo",
          saleId,
          inspectionId: photoInspectionId,
          roomName,
          itemIndex: localIndex,
          status: "queued",
          retries: 0,
        }]);
        console.log("[photo] queue item created", { id: offlinePhoto.id, roomName, localIndex });

        // 3. If online: attempt immediate cloud upload
        if (navigator.onLine) {
          try {
            const cloudUrl = await uploadMediaMutation.mutateAsync({ saleId, roomName, itemIndex: localIndex, file: compressed });

            // Write cloud URL to ai_items in DB
            const currentRec = recordings.find(r => r.id === recordingId);
            const currentItems = [...(currentRec?.ai_items || rec.ai_items || [])];
            if (currentItems[localIndex]) {
              currentItems[localIndex] = {
                ...currentItems[localIndex],
                media: [...(currentItems[localIndex].media || []), cloudUrl],
              };
              updateItemsMutation.mutate({ recordingId: rec.id, saleId, items: currentItems });
            }

            // Mark as synced
            await voiceOfflineStorage.markPhotoSynced(offlinePhoto.id);
            useUploadQueueStore.getState().updateItem(offlinePhoto.id, { status: "done" });
            URL.revokeObjectURL(localUrl);
            console.log("[photo] upload succeeded (immediate)", { id: offlinePhoto.id, cloudUrl });
          } catch (uploadError) {
            console.error("[photo] immediate upload failed, stays in queue", uploadError);
            // Do NOT write blob URL to DB — linkPhotoToItem handles it after sync.
            toast({ title: "Foto lokaal bewaard", description: "Upload mislukt — wordt later automatisch gesynchroniseerd.", variant: "default" });
          }
        } else {
          // 4. Offline: toast only AFTER IndexedDB persist
          // Do NOT write blob URL to DB — linkPhotoToItem handles it after sync.
          toast({ title: "Foto lokaal opgeslagen", description: "Wordt automatisch geüpload zodra je weer online bent." });
        }
      }
    } finally {
      setUploadingItemIndex(null);
    }
  };

  const isUploading = uploadMutation.isPending;
  const isAnalyzing = analyzeMutation.isPending;
  const isBusy = isUploading || isAnalyzing || processingStatus !== "idle";

  const processingRecordings = recordings.filter(r => r.status === "processing" || r.status === "pending");
  const failedRecordings = recordings.filter(r => r.status === "failed");
  const completedRecordings = recordings.filter(r => r.status === "completed");

  const newItemRef = useRef<HTMLDivElement>(null);
  const handleAddManualItem = async () => {
    const newItem: VoiceItem = { item_name: "", status: "ok", notes: "" };
    const existingCompleted = completedRecordings[completedRecordings.length - 1];
    if (existingCompleted) {
      const updatedItems = [...(existingCompleted.ai_items || []), newItem];
      updateItemsMutation.mutate({ recordingId: existingCompleted.id, saleId, items: updatedItems });
      setAutoEditIndex(flatItems.length);
    } else {
      if (!inspectionId) {
        toast({ title: "Geen inspectie geselecteerd", description: "Item kan niet worden aangemaakt zonder actieve inspectie.", variant: "destructive" });
        return;
      }
      await createManualMutation.mutateAsync({ saleId, roomName, items: [newItem], inspectionId });
      setAutoEditIndex(0);
    }
    setTimeout(() => newItemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    toast({ title: "Punt toegevoegd", description: "Nieuw aandachtspunt aangemaakt." });
  };
  handleAddManualItemRef.current = handleAddManualItem;

  useEffect(() => {
    if (onAddManualItemRef) onAddManualItemRef.current = handleAddManualItem;
    return () => { if (onAddManualItemRef) onAddManualItemRef.current = null; };
  });

  useEffect(() => {
    if (onFileUploadRef) onFileUploadRef.current = fileInputRef.current;
    return () => { if (onFileUploadRef) onFileUploadRef.current = null; };
  });

  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;
      setIsRecordingDialogOpen(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast({ title: "Microfoon geweigerd", description: "Geef toegang tot de microfoon om op te nemen.", variant: "destructive" });
    }
  };

  const handleRecordingDialogChange = (v: boolean) => {
    if (!v) activeStreamRef.current = null;
    setIsRecordingDialogOpen(v);
  };

  // ── Shared content block (used by all three layouts) ──
  const compact = !isMobile;
  const btnSize = isMobile ? "h-10 w-10" : "h-7 w-7";
  const iconSize = isMobile ? "h-4 w-4" : "h-3 w-3";

  const roomContent = (
    <>
      <input ref={fileInputRef} type="file" accept=".mp3,.webm,.m4a,.ogg,.wav" className="hidden" onChange={handleFileUpload} />

      {/* Processing status — enhanced multi-step feedback */}
      {processingStatus !== "idle" && (
        <div className={cn(
          "rounded-lg border",
          isMobile ? "p-4" : "p-3",
          "bg-primary/5 border-primary/20"
        )}>
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <Loader2 className={cn("animate-spin text-primary", isMobile ? "h-5 w-5" : "h-4 w-4")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium text-foreground", isMobile ? "text-sm" : "text-xs")}>
                {processingStatus === "uploading" ? "Opname wordt geüpload..." : "AI analyseert je opname..."}
              </p>
              <p className={cn("text-muted-foreground mt-0.5", isMobile ? "text-xs" : "text-[10px]")}>
                {processingStatus === "uploading"
                  ? "Even geduld"
                  : "Dit duurt meestal 15–30 seconden"}
              </p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={cn("h-2 w-2 rounded-full", "bg-primary")} />
              <div className={cn("h-2 w-2 rounded-full", processingStatus === "analyzing" ? "bg-primary" : "bg-border")} />
            </div>
          </div>
        </div>
      )}

      {/* Legacy processing recordings that are still in DB as pending/processing */}
      {processingStatus === "idle" && processingRecordings.length > 0 && (
        <div className={cn(
          "rounded-lg border bg-primary/5 border-primary/20",
          isMobile ? "p-4" : "p-3"
        )}>
          <div className="flex items-center gap-3">
            <Loader2 className={cn("animate-spin text-primary", isMobile ? "h-5 w-5" : "h-4 w-4")} />
            <p className={cn("text-foreground", isMobile ? "text-sm" : "text-xs")}>Verwerken...</p>
          </div>
        </div>
      )}

      {pendingOffline && (
        <div className={cn(
          "flex items-center gap-2 text-muted-foreground bg-muted rounded-lg",
          isMobile ? "text-sm p-3" : "text-xs p-2"
        )}>
          <Clock className={cn(isMobile ? "h-4 w-4" : "h-3 w-3")} /> Opname wacht op verwerking (offline)
        </div>
      )}

      {/* Pending offline photos badge */}
      {pendingPhotoCount > 0 && (
        <div className={cn(
          "flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg",
          isMobile ? "text-sm p-3" : "text-xs p-2"
        )}>
          <CloudOff className={cn("text-amber-600 dark:text-amber-400", isMobile ? "h-4 w-4" : "h-3 w-3")} />
          <span className="text-amber-700 dark:text-amber-300">
            {pendingPhotoCount} foto{pendingPhotoCount !== 1 ? "'s" : ""} wacht{pendingPhotoCount === 1 ? "" : "en"} op synchronisatie
          </span>
        </div>
      )}

      {failedRecordings.map(rec => (
        <div key={rec.id} className={cn(
          "flex items-center justify-between border border-destructive/30 bg-destructive/5 rounded-lg",
          isMobile ? "gap-2 text-sm p-3" : "text-xs p-2"
        )}>
          <span className="text-destructive">
            Analyse mislukt{!isMobile && ` — ${new Date(rec.created_at).toLocaleString("nl-BE")}`}
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className={btnSize}
              onClick={() => analyzeMutation.mutate({ recordingId: rec.id, saleId })}
              disabled={analyzeMutation.isPending}>
              <RotateCcw className={iconSize} />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className={cn(btnSize, "text-destructive")}>
                  <Trash2 className={iconSize} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Opname verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>Deze opname wordt permanent verwijderd.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMutation.mutate({ recording: rec })}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Verwijderen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}

      <VoiceItemPreview
        items={flatItems}
        onUpdateItems={handleUpdateItems}
        onUploadMedia={handleUploadMedia}
        isUploading={uploadMediaMutation.isPending}
        uploadingItemIndex={isMobile ? uploadingItemIndex : undefined}
        isMobile={isMobile}
        desktopFilter={desktopFilter}
        autoEditIndex={autoEditIndex}
        onAutoEditHandled={() => setAutoEditIndex(null)}
        roomName={roomName}
      />

      {completedRecordings.length > 0 && (
        <Collapsible open={showSourceMaterial} onOpenChange={setShowSourceMaterial}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 text-muted-foreground w-full hover:text-foreground transition-colors",
              isMobile ? "text-sm py-2" : "text-xs py-1.5"
            )}>
              <FileAudio className={cn(isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
              <span>Bronmateriaal ({completedRecordings.length}{isMobile ? ` opname${completedRecordings.length !== 1 ? "s" : ""}` : ""})</span>
              <ChevronDown className={cn("ml-auto transition-transform", isMobile ? "h-4 w-4" : "h-3.5 w-3.5", showSourceMaterial && "rotate-180")} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className={cn("pt-2", isMobile ? "space-y-3" : "space-y-2")}>
              {completedRecordings.map(rec => (
                <SourceRecordingCard key={rec.id} rec={rec} saleId={saleId} isMobile={isMobile} deleteMutation={deleteMutation} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <RecordingDialog
        open={isRecordingDialogOpen}
        onOpenChange={handleRecordingDialogChange}
        stream={activeStreamRef.current}
        roomName={roomName}
        onRecordingComplete={handleRecordingComplete}
      />
    </>
  );

  // ── Action buttons (shared between embedded + desktop) ──
  const actionButtons = (
    <div className="flex items-center gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={startMicRecording} disabled={isBusy}>
        <Mic className="h-4 w-4 mr-1" /> Opname starten
      </Button>
      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
        <Upload className="h-4 w-4 mr-1" /> Upload
      </Button>
      <Button size="sm" variant="outline" onClick={handleAddManualItem} disabled={createManualMutation.isPending}>
        <Plus className="h-4 w-4 mr-1" /> Item
      </Button>
    </div>
  );

  // ── Mobile layout ──
  if (isMobile) {
    return <div className="space-y-3">{roomContent}</div>;
  }

  // ── Embedded layout ──
  if (embedded) {
    return (
      <div className="space-y-4 pt-4">
        {actionButtons}
        {roomContent}
      </div>
    );
  }

  // Fallback (should not be reached — always called with isMobile or embedded)
  return (
    <div className="space-y-4 pt-4">
      {actionButtons}
      {roomContent}
    </div>
  );
}

// ── Source recording card ──
function SourceRecordingCard({
  rec,
  saleId,
  isMobile,
  deleteMutation,
}: {
  rec: VoiceRecording;
  saleId: string;
  isMobile?: boolean;
  deleteMutation: { mutate: (vars: { recording: VoiceRecording }) => void };
}) {
  const btnSize = isMobile ? "h-10 w-10" : "h-7 w-7";
  const iconSize = isMobile ? "h-4 w-4" : "h-3 w-3";
  const itemCount = rec.ai_items?.length || 0;
  const defectCount = rec.ai_items?.filter(i => i.status === "defect").length || 0;
  const okCount = itemCount - defectCount;

  return (
    <div className={cn("border rounded-lg space-y-2", isMobile ? "p-4" : "p-3")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <FileAudio className={cn("text-muted-foreground", isMobile ? "h-5 w-5" : "h-4 w-4")} />
          <span className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-xs")}>
            {new Date(rec.created_at).toLocaleString("nl-BE")}
          </span>
          {itemCount > 0 && (
            <span className="text-xs text-muted-foreground">
              · {defectCount > 0 && `${defectCount} aandachtspunt${defectCount !== 1 ? "en" : ""}`}{defectCount > 0 && okCount > 0 && ", "}{okCount > 0 && `${okCount} OK`}
            </span>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className={cn(btnSize, "text-destructive")}>
              <Trash2 className={iconSize} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Opname verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>Deze opname en alle bijbehorende items worden permanent verwijderd.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate({ recording: rec })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Verwijderen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {rec.audio_url && <AudioPlayer src={rec.audio_url} isMobile={isMobile} />}
      {rec.transcript && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Transcriptie</summary>
          <p className="mt-1 p-2 bg-muted rounded text-muted-foreground whitespace-pre-wrap">{rec.transcript}</p>
        </details>
      )}
    </div>
  );
}
