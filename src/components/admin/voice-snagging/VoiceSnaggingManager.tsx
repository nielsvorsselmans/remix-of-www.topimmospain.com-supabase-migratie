import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useVoiceRecordings, useUploadVoiceRecording, useAnalyzeVoiceRecording, useDeleteVoiceRecording, useUpdateVoiceItems, useUploadItemMedia, useCreateManualRecording, useDeleteRoom, useRenameRoom, VoiceRecording, VoiceItem } from "@/hooks/useVoiceSnagging";
import { useInspections, useCreateInspection, useUpdateInspection, useDeleteInspection, SnaggingInspection } from "@/hooks/useInspections";
import { VoiceRoomCard } from "./VoiceRoomCard";
import { RecordingDialog } from "./RecordingDialog";
import { OfflineBanner } from "./OfflineBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, ArrowLeft, Mic, Upload, AlertTriangle, CheckCircle2, Trash2, Circle, Pencil, MoreVertical, ChevronDown, ChevronRight, ChevronLeft, ClipboardList, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SnaggingPdfDownload } from "./SnaggingPdfDownload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { voiceOfflineStorage } from "@/lib/voiceOfflineStorage";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSaleContext } from "@/hooks/useSaleContext";
import { triggerAudioDownload, buildAudioFilename } from "@/utils/triggerAudioDownload";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";

interface Props {
  saleId: string;
  onClose?: () => void;
  initialInspectionId?: string;
}

const DEFAULT_ROOMS = [
  "Woonkamer",
  "Keuken",
  "Badkamer",
  "Slaapkamer 1",
  "Hal/Entree",
  "Terras/Tuin",
];

export function VoiceSnaggingManager({ saleId, onClose, initialInspectionId }: Props) {
  const { data: inspections, isLoading: inspectionsLoading } = useInspections(saleId);
  const createInspectionMutation = useCreateInspection();
  const updateInspectionMutation = useUpdateInspection();
  const deleteInspectionMutation = useDeleteInspection();

  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(initialInspectionId || null);
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [newInspectionLabel, setNewInspectionLabel] = useState("Inspectie");
  const [newInspectionDate, setNewInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [editingInspection, setEditingInspection] = useState<SnaggingInspection | null>(null);
  const [inspectionToDelete, setInspectionToDelete] = useState<string | null>(null);

  // Auto-open if only one inspection
  useEffect(() => {
    if (!activeInspectionId && inspections && inspections.length === 1) {
      setActiveInspectionId(inspections[0].id);
    }
  }, [inspections, activeInspectionId]);

  const handleCreateInspection = async () => {
    const trimmed = newInspectionLabel.trim();
    if (!trimmed) return;
    const result = await createInspectionMutation.mutateAsync({
      saleId,
      label: trimmed,
      inspectionDate: newInspectionDate,
    });
    setShowNewInspection(false);
    setNewInspectionLabel("Inspectie");
    setNewInspectionDate(new Date().toISOString().split("T")[0]);
    setActiveInspectionId(result.id);
  };

  const handleUpdateInspection = async () => {
    if (!editingInspection) return;
    await updateInspectionMutation.mutateAsync({
      id: editingInspection.id,
      saleId,
      label: editingInspection.label,
      inspectionDate: editingInspection.inspection_date,
    });
    setEditingInspection(null);
  };

  const handleDeleteInspection = async () => {
    if (!inspectionToDelete) return;
    await deleteInspectionMutation.mutateAsync({ id: inspectionToDelete, saleId });
    if (activeInspectionId === inspectionToDelete) setActiveInspectionId(null);
    setInspectionToDelete(null);
  };

  if (activeInspectionId) {
    return (
      <InspectionDetailView
        saleId={saleId}
        inspectionId={activeInspectionId}
        inspectionLabel={inspections?.find(i => i.id === activeInspectionId)?.label}
        onBack={() => setActiveInspectionId(null)}
        onClose={onClose}
        showBackToList={(inspections?.length || 0) > 1}
      />
    );
  }

  if (inspectionsLoading) {
    return <div className="text-sm text-muted-foreground">Laden...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Plaatsbeschrijving</h1>
          <p className="text-sm text-muted-foreground">{inspections?.length || 0} inspectie(s)</p>
        </div>
      </div>

      <div className="space-y-3">
        {(inspections || []).map((inspection) => (
          <InspectionCard
            key={inspection.id}
            inspection={inspection}
            saleId={saleId}
            onOpen={() => setActiveInspectionId(inspection.id)}
            onEdit={() => setEditingInspection({ ...inspection })}
            onDelete={() => setInspectionToDelete(inspection.id)}
          />
        ))}

        {(!inspections || inspections.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Nog geen inspecties</p>
              <p className="text-xs mt-1">Maak een nieuwe inspectie aan om te beginnen.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Button onClick={() => setShowNewInspection(true)} className="w-full gap-2" size="lg">
        <Plus className="h-5 w-5" />
        Nieuwe inspectie
      </Button>

      {/* Create dialog */}
      <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nieuwe inspectie</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Label</label>
              <Input placeholder="Bijv. Vooroplevering, Eindcontrole..." value={newInspectionLabel} onChange={(e) => setNewInspectionLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateInspection()} autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Datum</label>
              <Input type="date" value={newInspectionDate} onChange={(e) => setNewInspectionDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInspection(false)}>Annuleren</Button>
            <Button onClick={handleCreateInspection} disabled={!newInspectionLabel.trim() || createInspectionMutation.isPending}>
              {createInspectionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Aanmaken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingInspection} onOpenChange={(o) => !o && setEditingInspection(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Inspectie bewerken</DialogTitle></DialogHeader>
          {editingInspection && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Label</label>
                <Input value={editingInspection.label} onChange={(e) => setEditingInspection({ ...editingInspection, label: e.target.value })} autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Datum</label>
                <Input type="date" value={editingInspection.inspection_date} onChange={(e) => setEditingInspection({ ...editingInspection, inspection_date: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInspection(null)}>Annuleren</Button>
            <Button onClick={handleUpdateInspection} disabled={updateInspectionMutation.isPending}>
              {updateInspectionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!inspectionToDelete} onOpenChange={(o) => !o && setInspectionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inspectie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>Alle opnames en punten van deze inspectie worden permanent verwijderd.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInspection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteInspectionMutation.isPending}>
              {deleteInspectionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Inspection card ──
function InspectionCard({ inspection, saleId, onOpen, onEdit, onDelete }: {
  inspection: SnaggingInspection;
  saleId: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: recordings } = useVoiceRecordings(saleId, inspection.id);

  const stats = useMemo(() => {
    let rooms = new Set<string>();
    let defects = 0, ok = 0, total = 0;
    for (const rec of recordings || []) {
      rooms.add(rec.room_name);
      for (const item of (rec.ai_items || []) as VoiceItem[]) {
        total++;
        if (item.status === "defect") defects++;
        else ok++;
      }
    }
    return { rooms: rooms.size, defects, ok, total };
  }, [recordings]);

  const formattedDate = new Date(inspection.inspection_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={onOpen}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{inspection.label}</h3>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formattedDate}</span>
              {stats.total > 0 && (
                <>
                  <span>{stats.total} punten</span>
                  {stats.defects > 0 && <span className="flex items-center gap-0.5 text-destructive"><AlertTriangle className="h-3 w-3" /> {stats.defects}</span>}
                  {stats.ok > 0 && <span className="flex items-center gap-0.5 text-green-600"><CheckCircle2 className="h-3 w-3" /> {stats.ok}</span>}
                </>
              )}
              {stats.rooms > 0 && <span>{stats.rooms} ruimtes</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil className="h-4 w-4 mr-2" /> Bewerken</DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Verwijderen</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Detail view for a single inspection ──
function InspectionDetailView({ saleId, inspectionId, inspectionLabel, onBack, onClose, showBackToList }: {
  saleId: string;
  inspectionId: string;
  inspectionLabel?: string;
  onBack: () => void;
  onClose?: () => void;
  showBackToList: boolean;
}) {
  const { data: recordings, isLoading } = useVoiceRecordings(saleId, inspectionId);
  const { data: saleContext } = useSaleContext(saleId);
  const queryClient = useQueryClient();
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [customRooms, setCustomRooms] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`snagging-custom-rooms-${saleId}-${inspectionId}`);
      if (stored) return JSON.parse(stored);
      // Fallback to old key for backward compat
      const oldStored = localStorage.getItem(`snagging-custom-rooms-${saleId}`);
      return oldStored ? JSON.parse(oldStored) : [];
    } catch { return []; }
  });
  // Upload queue replaces legacy sync
  const { pendingCount: offlinePendingCount, failedCount, hasPending: hasPendingUploads, isProcessing: isSyncing, retryFailed } = useUploadQueue(saleId, {
    uploadRecording: async (vars) => uploadMutation.mutateAsync(vars),
    analyzeRecording: (vars) => analyzeMutation.mutate(vars),
    onSyncComplete: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-recordings", saleId, inspectionId] });
    },
  });
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({});
  const [desktopFilter, setDesktopFilter] = useState<"all" | "defects" | "no-photo" | "ok">("all");
  const [globalRecordingOpen, setGlobalRecordingOpen] = useState(false);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const uploadMutation = useUploadVoiceRecording();
  const analyzeMutation = useAnalyzeVoiceRecording();
  const deleteMutation = useDeleteVoiceRecording();
  const updateItemsMutation = useUpdateVoiceItems();
  const uploadMediaMutation = useUploadItemMedia();
  const createManualMutation = useCreateManualRecording();
  const deleteRoomMutation = useDeleteRoom();
  const renameRoomMutation = useRenameRoom();
  const isMobile = useIsMobile();
  const { isOnline, isReachable } = useOnlineStatus();

  const existingRooms = [...new Set((recordings || []).map((r) => r.room_name))];
  const allRooms = [...new Set([...existingRooms, ...customRooms])];

  useEffect(() => {
    localStorage.setItem(`snagging-custom-rooms-${saleId}-${inspectionId}`, JSON.stringify(customRooms));
  }, [customRooms, saleId, inspectionId]);

  useEffect(() => {
    if (isMobile && allRooms.length > 0 && !activeRoom) {
      setActiveRoom(allRooms[0]);
    }
  }, [isMobile, allRooms.length, activeRoom]);

  // Legacy sync replaced by useUploadQueue hook above

  const handleAddRoom = () => {
    const trimmed = newRoomName.trim();
    if (trimmed && !allRooms.includes(trimmed)) {
      setCustomRooms((prev) => [...prev, trimmed]);
      if (isMobile) setActiveRoom(trimmed);
    }
    setNewRoomName("");
    setShowAddRoom(false);
  };

  const addDefaultRoom = (room: string) => {
    if (!allRooms.includes(room)) {
      setCustomRooms((prev) => [...prev, room]);
      if (isMobile) setActiveRoom(room);
    }
  };

  interface RoomStats {
    defects: number;
    ok: number;
    items: number;
    recordings: number;
    noPhoto: number;
    status: "empty" | "pending" | "complete";
  }

  const roomStats = useMemo(() => {
    const map: Record<string, RoomStats> = {};
    let totalItems = 0, totalDefects = 0, totalOk = 0, totalNoPhoto = 0;

    for (const rec of recordings || []) {
      const room = rec.room_name;
      if (!map[room]) map[room] = { defects: 0, ok: 0, items: 0, recordings: 0, noPhoto: 0, status: "empty" };
      map[room].recordings++;
      const items = (rec.ai_items as any[]) || [];
      for (const it of items) {
        map[room].items++;
        totalItems++;
        if (it.status === "defect") {
          map[room].defects++;
          totalDefects++;
          if (!it.media || it.media.length === 0) { map[room].noPhoto++; totalNoPhoto++; }
        } else if (it.status === "ok") { map[room].ok++; totalOk++; }
      }
    }

    for (const key of Object.keys(map)) {
      const s = map[key];
      if (s.items === 0) s.status = "empty";
      else if (s.noPhoto > 0) s.status = "pending";
      else s.status = "complete";
    }

    return { map, totalItems, totalDefects, totalOk, totalNoPhoto };
  }, [recordings]);

  const getRoomStat = (room: string): RoomStats =>
    roomStats.map[room] || { defects: 0, ok: 0, items: 0, recordings: 0, noPhoto: 0, status: "empty" as const };

  const [showFabLabels, setShowFabLabels] = useState(() => {
    try { return !localStorage.getItem("viva-fab-labels-dismissed"); } catch { return true; }
  });
  const dismissFabLabels = () => {
    setShowFabLabels(false);
    try { localStorage.setItem("viva-fab-labels-dismissed", "1"); } catch {}
  };

  const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
  const handleDeleteRoom = async (room: string) => {
    const stat = getRoomStat(room);
    if (stat.recordings > 0) {
      await deleteRoomMutation.mutateAsync({ saleId, roomName: room });
    }
    setCustomRooms((prev) => prev.filter((r) => r !== room));
    if (activeRoom === room) {
      const remaining = allRooms.filter((r) => r !== room);
      setActiveRoom(remaining.length > 0 ? remaining[0] : null);
    }
    setRoomToDelete(null);
    toast({ title: "Kamer verwijderd", description: `"${room}" is verwijderd.` });
  };

  const [roomToRename, setRoomToRename] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const handleRenameRoom = async () => {
    const trimmed = renameValue.trim();
    if (!roomToRename || !trimmed || trimmed === roomToRename) { setRoomToRename(null); return; }
    if (allRooms.includes(trimmed)) {
      toast({ title: "Naam bestaat al", description: `Er is al een kamer "${trimmed}".`, variant: "destructive" });
      return;
    }
    const hasRecordings = getRoomStat(roomToRename).recordings > 0;
    if (hasRecordings) {
      await renameRoomMutation.mutateAsync({ saleId, oldName: roomToRename, newName: trimmed });
    }
    setCustomRooms((prev) => prev.map((r) => (r === roomToRename ? trimmed : r)));
    if (activeRoom === roomToRename) setActiveRoom(trimmed);
    setRoomToRename(null);
    toast({ title: "Kamer hernoemd", description: `"${roomToRename}" → "${trimmed}"` });
  };

  const addManualItemRef = useRef<(() => void) | null>(null);
  const handleFabAddManualItem = () => { dismissFabLabels(); addManualItemRef.current?.(); };
  const fileUploadRef = useRef<HTMLInputElement | null>(null);

  const acquireStreamAndOpenRecorder = async () => {
    dismissFabLabels();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;
      setGlobalRecordingOpen(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast({ title: "Microfoon geweigerd", description: "Geef toegang tot de microfoon om op te nemen.", variant: "destructive" });
    }
  };

  const handleGlobalRecordingComplete = async (blob: Blob, roomName: string) => {
    if (!allRooms.includes(roomName)) {
      setCustomRooms((prev) => [...prev, roomName]);
    }
    if (isMobile) {
      setActiveRoom(roomName);
      // Always scroll to top after room assignment, even if same room
      setTimeout(() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }

    const filename = buildAudioFilename(saleContext?.projectName ?? undefined, saleContext?.propertyTitle ?? undefined, roomName);

    if (!navigator.onLine) {
      triggerAudioDownload(blob, filename);
      await voiceOfflineStorage.save(blob, saleId, roomName, inspectionId);
      toast({ title: "Opname opgeslagen", description: "Lokale backup gedownload. Wordt verwerkt zodra je weer online bent." });
      return;
    }
    try {
      const recording = await uploadMutation.mutateAsync({ saleId, roomName, blob, inspectionId });
      analyzeMutation.mutate({ recordingId: recording.id, saleId });
      toast({ title: "Opname verwerkt", description: `Opname wordt geanalyseerd voor ${roomName}.` });
    } catch {
      triggerAudioDownload(blob, filename);
      toast({ title: "Upload mislukt", description: "Opname lokaal gedownload als backup." });
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laden...</div>;
  }

  if (allRooms.length === 0) {
    return (
      <div className="space-y-4">
        {showBackToList && (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
            <ArrowLeft className="h-4 w-4" /> Terug naar inspecties
          </Button>
        )}
        <OfflineBanner isOnline={isOnline} isReachable={isReachable} saleId={saleId} failedCount={failedCount} onRetryAll={retryFailed} />
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">
            Voeg een ruimte toe om te beginnen met de plaatsbeschrijving.
          </p>
          <Button size="lg" onClick={acquireStreamAndOpenRecorder} className="gap-2">
            <Mic className="h-5 w-5" /> Start opname
          </Button>
          <p className="text-xs text-muted-foreground">of voeg eerst een ruimte toe:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {DEFAULT_ROOMS.map((room) => (
              <Button key={room} variant="outline" size="sm" onClick={() => addDefaultRoom(room)}>
                <Plus className="h-3 w-3 mr-1" /> {room}
              </Button>
            ))}
          </div>
        </div>
        <RecordingDialog
          open={globalRecordingOpen}
          onOpenChange={(v) => { if (!v) activeStreamRef.current = null; setGlobalRecordingOpen(v); }}
          stream={activeStreamRef.current}
          existingRooms={allRooms}
          projectName={saleContext?.projectName ?? undefined}
          propertyTitle={saleContext?.propertyTitle ?? undefined}
          onRecordingComplete={handleGlobalRecordingComplete}
        />
      </div>
    );
  }

  // Mutations object to pass to VoiceRoomCard
  const mutations = {
    uploadRecording: uploadMutation,
    analyzeRecording: analyzeMutation,
    deleteRecording: deleteMutation,
    updateItems: updateItemsMutation,
    uploadMedia: uploadMediaMutation,
    createManual: createManualMutation,
  };

  const sharedDialogs = (
    <>
      <AlertDialog open={!!roomToDelete} onOpenChange={(o) => !o && setRoomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kamer verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              "{roomToDelete}" wordt verwijderd.
              {roomToDelete && getRoomStat(roomToDelete).recordings > 0 && (
                <> Inclusief {getRoomStat(roomToDelete).recordings} opname(s) en {getRoomStat(roomToDelete).items} punt(en).</>
              )}
              {" "}Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={() => roomToDelete && handleDeleteRoom(roomToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteRoomMutation.isPending}>
              {deleteRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!roomToRename} onOpenChange={(o) => !o && setRoomToRename(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Kamer hernoemen</DialogTitle></DialogHeader>
          <Input placeholder="Nieuwe naam..." value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRenameRoom()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomToRename(null)}>Annuleren</Button>
            <Button onClick={handleRenameRoom} disabled={!renameValue.trim() || renameValue.trim() === roomToRename || renameRoomMutation.isPending}>
              {renameRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddRoomDialog open={showAddRoom} onOpenChange={setShowAddRoom} newRoomName={newRoomName} setNewRoomName={setNewRoomName} onAdd={handleAddRoom} />

      <RecordingDialog
        open={globalRecordingOpen}
        onOpenChange={(v) => { if (!v) activeStreamRef.current = null; setGlobalRecordingOpen(v); }}
        stream={activeStreamRef.current}
        existingRooms={allRooms}
        projectName={saleContext?.projectName ?? undefined}
        propertyTitle={saleContext?.propertyTitle ?? undefined}
        onRecordingComplete={handleGlobalRecordingComplete}
      />
    </>
  );

  // Mobile view
  if (isMobile) {
    const activeRoomRecordings = (recordings || []).filter((r) => r.room_name === activeRoom);
    const { totalItems, totalDefects, totalOk, totalNoPhoto: noPhoto } = roomStats;

    return (
      <div className="flex flex-col h-full -mx-4 -mt-4">
        <div className="sticky top-0 z-10 bg-primary safe-area-top shadow-md">
          <div className="px-4 py-2 min-h-[44px] flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-9 px-2 shrink-0 text-primary-foreground hover:bg-primary-foreground/10" onClick={showBackToList ? onBack : onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 truncate">
              <h2 className="font-semibold text-sm text-primary-foreground truncate">
                {inspectionLabel || "Plaatsbeschrijving"}
                {totalItems > 0 && (
                  <span className="font-normal text-primary-foreground/70 ml-1.5">
                    · {totalDefects > 0 && `${totalDefects} ⚠`}{totalOk > 0 && ` ${totalOk} ✓`}
                  </span>
                )}
              </h2>
            </div>
            <div className="mr-1">
              <SnaggingPdfDownload saleId={saleId} inspectionId={inspectionId} disabled={allRooms.length === 0} iconOnly hasPendingUploads={hasPendingUploads} pendingCount={offlinePendingCount + failedCount} className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
            </div>
          </div>

          {/* Mobile room navigator */}
          {(() => {
            const currentIndex = allRooms.indexOf(activeRoom || "");
            const isFirst = currentIndex <= 0;
            const isLast = currentIndex >= allRooms.length - 1;
            const navigateTo = (room: string) => { setActiveRoom(room); contentRef.current?.scrollTo({ top: 0 }); };
            return (
              <div className="px-2 pb-2 flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isFirst || allRooms.length === 0}
                  className="h-10 w-10 shrink-0 text-primary-foreground hover:bg-primary-foreground/10 disabled:opacity-30"
                  onClick={() => !isFirst && navigateTo(allRooms[currentIndex - 1])}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <button
                  onClick={() => setShowRoomPicker(true)}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center rounded-lg bg-primary-foreground/10 min-h-[44px] px-3 py-1 active:bg-primary-foreground/20 transition-colors"
                >
                  <span className="text-sm font-semibold text-primary-foreground truncate max-w-full flex items-center gap-1">
                    {activeRoom || "Kies kamer"}
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </span>
                  {allRooms.length > 0 && (
                    <span className="text-[10px] text-primary-foreground/60">
                      Kamer {currentIndex + 1} van {allRooms.length}
                      {(() => { const s = getRoomStat(activeRoom || ""); return s.items > 0 ? ` · ${s.items} punt${s.items !== 1 ? "en" : ""}${s.defects > 0 ? ` · ${s.defects} ⚠` : ""}` : ""; })()}
                    </span>
                  )}
                </button>

                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isLast || allRooms.length === 0}
                  className="h-10 w-10 shrink-0 text-primary-foreground hover:bg-primary-foreground/10 disabled:opacity-30"
                  onClick={() => !isLast && navigateTo(allRooms[currentIndex + 1])}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            );
          })()}
        </div>

        <OfflineBanner isOnline={isOnline} isReachable={isReachable} saleId={saleId} failedCount={failedCount} onRetryAll={retryFailed} />

        <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-4 pb-24 scroll-smooth" style={{ overscrollBehavior: 'contain' }}>
          {activeRoom && (
            <VoiceRoomCard key={activeRoom} saleId={saleId} roomName={activeRoom} recordings={(recordings || []).filter((r) => r.room_name === activeRoom)} mutations={mutations} isMobile onAddManualItemRef={addManualItemRef} onFileUploadRef={fileUploadRef} inspectionId={inspectionId} />
          )}

          {DEFAULT_ROOMS.filter((r) => !allRooms.includes(r)).length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Snel toevoegen:</p>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_ROOMS.filter((r) => !allRooms.includes(r)).map((room) => (
                  <Button key={room} variant="ghost" size="sm" className="text-xs h-9" onClick={() => addDefaultRoom(room)}>+ {room}</Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <FabCluster
          onRecord={acquireStreamAndOpenRecorder}
          onUpload={() => { dismissFabLabels(); fileUploadRef.current?.click(); }}
          onAddItem={handleFabAddManualItem}
          showLabels={showFabLabels}
          onDismissLabels={dismissFabLabels}
        />

        {/* Room picker bottom sheet */}
        <Sheet open={showRoomPicker} onOpenChange={setShowRoomPicker}>
          <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl px-0 pb-safe">
            <SheetHeader className="px-4 pb-2">
              <SheetTitle className="text-base">Kamer kiezen</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-2 space-y-0.5">
              {allRooms.map((room) => {
                const stat = getRoomStat(room);
                const isActive = activeRoom === room;
                return (
                  <div key={room} className="flex items-center gap-1">
                    <button
                      onClick={() => { setActiveRoom(room); setShowRoomPicker(false); contentRef.current?.scrollTo({ top: 0 }); }}
                      className={cn(
                        "flex-1 flex items-center gap-3 px-3 py-3 rounded-lg text-left min-h-[48px] transition-colors",
                        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      )}
                    >
                      <span className="shrink-0">
                        {stat.status === "empty" && <Circle className="h-4 w-4 opacity-40" />}
                        {stat.status === "pending" && <span className="h-4 w-4 rounded-full bg-orange-400 inline-block" />}
                        {stat.status === "complete" && <CheckCircle2 className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-green-500")} />}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-medium text-sm">{room}</span>
                      <span className={cn("text-xs shrink-0", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {stat.items > 0 && `${stat.items} punt${stat.items !== 1 ? "en" : ""}`}
                        {stat.defects > 0 && (
                          <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1 text-[10px]">{stat.defects}</Badge>
                        )}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-10 w-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[160px]">
                        <DropdownMenuItem onClick={() => { setShowRoomPicker(false); setRoomToRename(room); setRenameValue(room); }}><Pencil className="h-4 w-4 mr-2" /> Hernoemen</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setShowRoomPicker(false); setRoomToDelete(room); }} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Verwijderen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
            <div className="px-4 pt-3 border-t mt-2">
              <Button variant="outline" className="w-full gap-1.5" onClick={() => { setShowRoomPicker(false); setShowAddRoom(true); }}>
                <Plus className="h-4 w-4" /> Kamer toevoegen
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {sharedDialogs}
      </div>
    );
  }

  // Desktop view
  const { totalItems, totalDefects, totalOk, totalNoPhoto } = roomStats;
  const completedRooms = allRooms.filter((r) => getRoomStat(r).status === "complete").length;
  const desktopActiveRoom = activeRoom || allRooms[0] || null;
  const desktopActiveRoomRecordings = (recordings || []).filter((r) => r.room_name === desktopActiveRoom);

  return (
    <div className="flex-1 overflow-y-auto space-y-0">
      <div className="sticky top-0 z-20 bg-background border-b shadow-sm -mx-6 px-6 py-4 mb-0">
        <div className="flex items-center gap-4">
          {showBackToList && (
            <Button size="sm" variant="ghost" onClick={onBack} className="shrink-0 gap-1">
              <ArrowLeft className="h-4 w-4" /> Inspecties
            </Button>
          )}
          {!showBackToList && onClose && (
            <Button size="icon" variant="ghost" onClick={onClose} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">{inspectionLabel || "Plaatsbeschrijving"}</h1>
            {totalItems > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {allRooms.length} ruimtes · {totalItems} punten
                {totalDefects > 0 && <> · <span className="text-destructive">{totalDefects} defects</span></>}
                {totalOk > 0 && <> · <span className="text-green-600">{totalOk} OK</span></>}
                {totalNoPhoto > 0 && <> · <span className="text-orange-500">{totalNoPhoto} zonder foto</span></>}
                {" "}· {completedRooms}/{allRooms.length} afgerond
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={acquireStreamAndOpenRecorder} className="gap-2">
              <Mic className="h-4 w-4" /> Opname starten
            </Button>
            <SnaggingPdfDownload saleId={saleId} inspectionId={inspectionId} disabled={allRooms.length === 0} hasPendingUploads={hasPendingUploads} pendingCount={offlinePendingCount + failedCount} />
          </div>
        </div>
      </div>

      <OfflineBanner isOnline={isOnline} isReachable={isReachable} saleId={saleId} failedCount={failedCount} onRetryAll={retryFailed} />

      <div className="flex gap-0 min-h-[500px]">
        <div className="w-56 shrink-0 border-r bg-muted/30 py-3">
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kamers</span>
          </div>
          <nav className="space-y-0.5 px-2">
            {allRooms.map((room) => {
              const stat = getRoomStat(room);
              const isActive = desktopActiveRoom === room;
              return (
                <div key={room} className="group flex items-center">
                  <button onClick={() => setActiveRoom(room)} className={cn("flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors text-left", isActive ? "bg-primary/10 text-foreground font-medium border-l-2 border-primary" : "hover:bg-accent text-muted-foreground")}>
                    {stat.status === "empty" && <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
                    {stat.status === "pending" && <span className="h-3.5 w-3.5 rounded-full bg-orange-400 inline-block shrink-0" />}
                    {stat.status === "complete" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                    <span className="truncate flex-1">{room}</span>
                    {stat.items > 0 && <span className="text-xs text-muted-foreground tabular-nums">{stat.items}</span>}
                    {stat.defects > 0 && <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[9px]">{stat.defects}</Badge>}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity shrink-0">
                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem onClick={() => { setRoomToRename(room); setRenameValue(room); }}><Pencil className="h-4 w-4 mr-2" /> Hernoemen</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoomToDelete(room)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Verwijderen</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </nav>
          <div className="px-3 pt-3 mt-2 border-t space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs gap-1 h-8" onClick={() => setShowAddRoom(true)}>
              <Plus className="h-3.5 w-3.5" /> Kamer toevoegen
            </Button>
            {DEFAULT_ROOMS.filter((r) => !allRooms.includes(r)).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {DEFAULT_ROOMS.filter((r) => !allRooms.includes(r)).map((room) => (
                  <button key={room} onClick={() => addDefaultRoom(room)} className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors">+ {room}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 py-3 px-5">
          {desktopActiveRoom ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold text-foreground flex-1">{desktopActiveRoom}</h2>
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  {([
                    { key: "all" as const, label: "Alle", count: getRoomStat(desktopActiveRoom).items },
                    { key: "defects" as const, label: "Defecten", count: getRoomStat(desktopActiveRoom).defects },
                    { key: "no-photo" as const, label: "Zonder foto", count: getRoomStat(desktopActiveRoom).noPhoto },
                    { key: "ok" as const, label: "OK", count: getRoomStat(desktopActiveRoom).ok },
                  ]).map(({ key, label, count }) => (
                    <button key={key} onClick={() => setDesktopFilter(key)} className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-colors", desktopFilter === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                      {label} {count > 0 && <span className="ml-0.5 tabular-nums">({count})</span>}
                    </button>
                  ))}
                </div>
              </div>
              <VoiceRoomCard key={desktopActiveRoom} saleId={saleId} roomName={desktopActiveRoom} recordings={desktopActiveRoomRecordings} mutations={mutations} embedded desktopFilter={desktopFilter} inspectionId={inspectionId} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Selecteer een kamer om items te bekijken.</p>
          )}
        </div>
      </div>

      {sharedDialogs}
    </div>
  );
}

// ── Expandable FAB cluster ──
function FabCluster({ onRecord, onUpload, onAddItem, showLabels, onDismissLabels }: {
  onRecord: () => void;
  onUpload: () => void;
  onAddItem: () => void;
  showLabels: boolean;
  onDismissLabels: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[61] flex flex-col items-end gap-2">
      {/* Secondary actions — expandable (above primary) */}
      {expanded && (
        <>
          <button
            onClick={() => { setExpanded(false); onAddItem(); }}
            className="h-11 w-11 rounded-full bg-background text-foreground shadow-md border flex items-center justify-center active:scale-95 transition-transform"
            title="Item toevoegen"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setExpanded(false); onUpload(); }}
            className="h-11 w-11 rounded-full bg-background text-foreground shadow-md border flex items-center justify-center active:scale-95 transition-transform"
            title="Upload audio"
          >
            <Upload className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Primary: Record */}
      <button
        onClick={() => { onDismissLabels(); onRecord(); }}
        className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Mic className="h-6 w-6" />
      </button>

      {/* Toggle for secondary actions — below primary, close to thumb */}
      <button
        onClick={() => { setExpanded(!expanded); onDismissLabels(); }}
        className={cn(
          "h-9 w-9 rounded-full bg-muted text-muted-foreground shadow-sm border flex items-center justify-center transition-transform",
          expanded && "rotate-45"
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddRoomDialog({ open, onOpenChange, newRoomName, setNewRoomName, onAdd }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  newRoomName: string;
  setNewRoomName: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Ruimte toevoegen</DialogTitle></DialogHeader>
        <Input placeholder="Naam van de ruimte..." value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onAdd()} autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={onAdd} disabled={!newRoomName.trim()}>Toevoegen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
