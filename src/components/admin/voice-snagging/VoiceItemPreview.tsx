import { useState, useRef, useEffect, useMemo } from "react";
import { VoiceItem } from "@/hooks/useVoiceSnagging";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Camera,
  Loader2,
  MessageSquare,
  Pencil,
  X,
  Check,
  ChevronDown,
  Image as ImageIcon,
  CloudOff,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shareOrDownloadBlob, buildPhotoFilename } from "@/lib/shareOrDownload";

interface Props {
  items: VoiceItem[];
  onUpdateItems: (items: VoiceItem[]) => void;
  onUploadMedia: (itemIndex: number, files: File[]) => void;
  isUploading?: boolean;
  uploadingItemIndex?: number | null;
  isMobile?: boolean;
  desktopFilter?: "all" | "defects" | "no-photo" | "ok";
  autoEditIndex?: number | null;
  onAutoEditHandled?: () => void;
  roomName?: string;
}

interface EditDraft {
  item_name: string;
  status: "ok" | "defect";
  severity?: "minor" | "major" | "critical";
  notes: string;
}

const isLocalPhoto = (url: string) => url.startsWith("blob:");

const extractLocation = (name: string) => {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*(.*)$/);
  if (match) {
    const mainName = (match[1] + (match[3] ? " " + match[3] : "")).trim();
    return { mainName, location: match[2] };
  }
  return { mainName: name, location: null };
};

export function VoiceItemPreview({ items, onUpdateItems, onUploadMedia, isUploading, uploadingItemIndex, isMobile, desktopFilter, autoEditIndex, onAutoEditHandled, roomName }: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(() => {
    // Defects open by default on mobile
    if (isMobile) {
      const defectIndices = new Set<number>();
      items.forEach((item, idx) => { if (item.status === "defect") defectIndices.add(idx); });
      return defectIndices;
    }
    return new Set();
  });
  const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string; alt: string } | null>(null);
  const [savingPhotoIndex, setSavingPhotoIndex] = useState<string | null>(null);

  // Lock body scroll when fullscreen viewer is open
  useEffect(() => {
    if (fullscreenPhoto) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [fullscreenPhoto]);
  const cameraInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const galleryInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const trackedBlobUrls = useRef<Set<string>>(new Set());

  // Track blob URLs for cleanup
  const allBlobUrls = useMemo(() => {
    const urls = new Set<string>();
    items.forEach((item) => {
      item.media?.forEach((url) => {
        if (url.startsWith("blob:")) urls.add(url);
      });
    });
    return urls;
  }, [items]);

  // Revoke blob URLs on unmount
  useEffect(() => {
    allBlobUrls.forEach((url) => trackedBlobUrls.current.add(url));
    return () => {
      trackedBlobUrls.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      trackedBlobUrls.current.clear();
    };
  }, []);
  // Auto-expand new defect items when items change (e.g. after AI analysis)
  useEffect(() => {
    if (!isMobile) return;
    setExpandedItems((prev) => {
      const next = new Set(prev);
      items.forEach((item, idx) => {
        if (item.status === "defect" && !prev.has(idx)) next.add(idx);
      });
      return next.size !== prev.size ? next : prev;
    });
  }, [items, isMobile]);

  useEffect(() => {
    if (autoEditIndex != null && autoEditIndex >= 0 && autoEditIndex < items.length && editingIndex === null) {
      startEdit(autoEditIndex);
      onAutoEditHandled?.();
    }
  }, [autoEditIndex, items.length]);

  const startEdit = (index: number) => {
    const item = items[index];
    setEditingIndex(index);
    setEditDraft({
      item_name: item.item_name,
      status: item.status as "ok" | "defect",
      severity: item.severity as EditDraft["severity"],
      notes: item.notes || "",
    });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editDraft || !editDraft.item_name.trim()) return;
    const updated = [...items];
    updated[editingIndex] = {
      ...updated[editingIndex],
      item_name: editDraft.item_name.trim(),
      status: editDraft.status,
      severity: editDraft.status === "ok" ? undefined : editDraft.severity,
      notes: editDraft.notes,
    };
    onUpdateItems(updated);
    setEditingIndex(null);
    setEditDraft(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditDraft(null);
  };

  const toggleStatus = (index: number) => {
    const updated = [...items];
    const item = updated[index];
    updated[index] = {
      ...item,
      status: item.status === "ok" ? "defect" : "ok",
      severity: item.status === "ok" ? "minor" : undefined,
    };
    onUpdateItems(updated);
  };

  const removeItem = (index: number) => {
    onUpdateItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onUpdateItems([
      ...items,
      { item_name: "Nieuw punt", status: "defect", severity: "minor", notes: "" },
    ]);
  };

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const removeMedia = (itemIndex: number, mediaIndex: number) => {
    const updated = [...items];
    const media = [...(updated[itemIndex].media || [])];
    media.splice(mediaIndex, 1);
    updated[itemIndex] = { ...updated[itemIndex], media };
    onUpdateItems(updated);
  };

  const btnSize = isMobile ? "h-10 w-10" : "h-8 w-8";
  const iconSize = "h-4 w-4";

  const sortedItems = items.map((item, i) => ({ item, originalIndex: i }));
  if (isMobile) {
    sortedItems.sort((a, b) => {
      const aDefect = a.item.status === "defect";
      const bDefect = b.item.status === "defect";
      if (aDefect && !bDefect) return -1;
      if (!aDefect && bDefect) return 1;
      if (aDefect && bDefect) {
        const aHasPhoto = (a.item.media?.length || 0) > 0;
        const bHasPhoto = (b.item.media?.length || 0) > 0;
        if (!aHasPhoto && bHasPhoto) return -1;
        if (aHasPhoto && !bHasPhoto) return 1;
      }
      return 0;
    });
  }

  const defectCount = items.filter(it => it.status === "defect").length;
  const defectsWithoutPhoto = items.filter(it => it.status === "defect" && (!it.media || it.media.length === 0)).length;
  const okCount = items.filter(it => it.status === "ok").length;

  if (!items.length) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Geen items gevonden.</p>
        <Button size={isMobile ? "default" : "sm"} variant="outline" onClick={addItem} className={cn(isMobile && "h-11")}>
          <Plus className={iconSize + " mr-1"} /> Punt toevoegen
        </Button>
      </div>
    );
  }


  const handleSaveToDevice = async (url: string, itemIndex: number, mediaIndex: number) => {
    const key = `${itemIndex}-${mediaIndex}`;
    setSavingPhotoIndex(key);
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const filename = buildPhotoFilename(roomName || "kamer", itemIndex);
      await shareOrDownloadBlob(blob, filename);
    } catch (err) {
      console.error("[photo-fallback] export failed", err);
    } finally {
      setSavingPhotoIndex(null);
    }
  };

  // Photo thumbnail component with tap-to-fullscreen
  const renderThumbnail = (url: string, alt: string, itemIndex: number, mediaIndex: number, size: string = "h-28 w-28") => {
    const isLocal = isLocalPhoto(url);
    const saveKey = `${itemIndex}-${mediaIndex}`;
    const isSaving = savingPhotoIndex === saveKey;

    return (
      <div key={mediaIndex} className="relative group/photo">
        <button
          onClick={() => setFullscreenPhoto({ url, alt })}
          className="block focus:outline-none focus:ring-2 focus:ring-primary rounded"
        >
          <img src={url} alt={alt} className={cn(size, "object-cover rounded border")} />
        </button>
        {isLocal && (
          <div className="absolute bottom-0.5 left-0.5 bg-orange-500 text-white rounded-full p-0.5" title="Nog niet geüpload">
            <CloudOff className="h-3 w-3" />
          </div>
        )}
        {isLocal && (
          <button
            onClick={(e) => { e.stopPropagation(); handleSaveToDevice(url, itemIndex, mediaIndex); }}
            className="absolute bottom-0.5 right-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center h-6 w-6 shadow-sm"
            title="Bewaar op toestel"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          </button>
        )}
        <button onClick={() => removeMedia(itemIndex, mediaIndex)} className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center h-6 w-6">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  // Photo action buttons — replaces DropdownMenu with direct 1-tap buttons
  const renderPhotoActions = (i: number, compact?: boolean) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(compact ? "h-8 w-8" : btnSize, "relative")}
        disabled={uploadingItemIndex === i}
        title="Camera"
        onClick={(e) => { e.stopPropagation(); cameraInputRefs.current.get(i)?.click(); }}
      >
        {uploadingItemIndex === i ? <Loader2 className={cn(iconSize, "animate-spin")} /> : <Camera className={iconSize} />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(compact ? "h-8 w-8" : btnSize)}
        disabled={uploadingItemIndex === i}
        title="Galerij"
        onClick={(e) => { e.stopPropagation(); galleryInputRefs.current.get(i)?.click(); }}
      >
        <ImageIcon className={iconSize} />
      </Button>
    </div>
  );

  const renderEditForm = (i: number) => {
    if (!editDraft) return null;
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Naam</label>
          <Input
            value={editDraft.item_name}
            onChange={(e) => setEditDraft({ ...editDraft, item_name: e.target.value })}
            className={cn(isMobile ? "h-10 text-base" : "h-8 text-sm")}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
          />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <button
              onClick={() =>
                setEditDraft({
                  ...editDraft,
                  status: editDraft.status === "ok" ? "defect" : "ok",
                  severity: editDraft.status === "ok" ? "minor" : undefined,
                })
              }
              className={cn(
                "flex items-center gap-1.5 px-3 rounded-md text-sm font-medium transition-colors",
                isMobile ? "h-10" : "h-8",
                editDraft.status === "ok"
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-red-100 text-destructive border border-red-300"
              )}
            >
              {editDraft.status === "ok" ? (
                <><CheckCircle2 className="h-4 w-4" /> OK</>
              ) : (
                <><AlertTriangle className="h-4 w-4" /> Aandachtspunt</>
              )}
            </button>
          </div>
          {editDraft.status === "defect" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ernst</label>
              <Select
                value={editDraft.severity || "none"}
                onValueChange={(v) =>
                  setEditDraft({ ...editDraft, severity: v === "none" ? undefined : (v as EditDraft["severity"]) })
                }
              >
                <SelectTrigger className={cn(isMobile ? "h-10" : "h-8", "w-auto text-sm px-3")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="none">Geen ernst</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Kritiek</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Notities</label>
          <Textarea
            placeholder="Voeg een notitie toe..."
            value={editDraft.notes}
            onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
            className="min-h-[60px] text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" className={cn(isMobile && "h-10")} onClick={saveEdit}>
            <Check className="h-4 w-4 mr-1" /> Opslaan
          </Button>
          <Button size="sm" variant="outline" className={cn(isMobile && "h-10")} onClick={cancelEdit}>
            Annuleren
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Summary bar — only on desktop (mobile shows in header) */}

      {!isMobile && <p className="text-sm font-medium">{items.length} punten gevonden:</p>}

      <ul className={cn("space-y-3", isMobile && "space-y-2")}>
        {sortedItems.map(({ item, originalIndex }) => {
          const i = originalIndex;
          const isOk = item.status === "ok";
          const isEditing = editingIndex === i;
          const isExpanded = expandedItems.has(i);
          const { mainName, location } = extractLocation(item.item_name);
          const mediaCount = item.media?.length || 0;
          const isDefectWithoutPhoto = !isOk && mediaCount === 0;

          // Mobile: collapsible layout
          if (isMobile) {
            return (
              <li
                key={i}
                className={cn(
                  "rounded-lg border bg-card shadow-sm transition-colors",
                  isOk
                    ? "border-green-200 bg-green-50/50"
                    : isDefectWithoutPhoto
                      ? "border-orange-300 bg-orange-50/50"
                      : "border-red-200 bg-red-50/50"
                )}
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(i)}>
                  {/* Collapsed header */}
                  <div className="flex items-center gap-2.5 p-3.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(i); }}
                      className={cn(
                        "shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-transform active:scale-90",
                        isOk
                          ? "bg-green-100 text-green-600 border border-green-300"
                          : "bg-red-100 text-destructive border border-red-300"
                      )}
                      title={isOk ? "Markeer als defect" : "Markeer als OK"}
                    >
                      {isOk ? <CheckCircle2 className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
                    </button>

                    <CollapsibleTrigger asChild>
                      <button className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-[15px] line-clamp-2 break-words">{mainName}</span>
                        {location && <span className="block text-xs text-muted-foreground mt-0.5">{location}</span>}
                      </button>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* 1-tap camera button in collapsed header */}
                      {isDefectWithoutPhoto ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); cameraInputRefs.current.get(i)?.click(); }}
                          className="h-10 w-10 rounded-full flex items-center justify-center bg-orange-100 text-orange-600 border border-orange-300"
                          title="Foto maken"
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); cameraInputRefs.current.get(i)?.click(); }}
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border transition-colors",
                            mediaCount > 0 ? "bg-green-50 text-green-600 border-green-200" : "bg-muted text-muted-foreground border-border"
                          )}
                          title="Foto maken"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                      {mediaCount > 0 && (
                        <span className="text-xs text-green-600 font-medium min-w-[16px] text-center">{mediaCount}</span>
                      )}
                      <CollapsibleTrigger asChild>
                        <button className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-accent">
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-3 border-t pt-3">
                      {isEditing ? (
                        <>
                          {renderEditForm(i)}
                          {item.media && item.media.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {item.media.map((url, mi) => renderThumbnail(url, `${item.item_name} foto ${mi + 1}`, i, mi))}
                            </div>
                          )}
                          {renderPhotoActions(i)}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <Badge variant={isOk ? "secondary" : "destructive"} className="text-xs">
                              {isOk ? "OK" : "Aandachtspunt"}
                            </Badge>
                            {!isOk && item.severity && (
                              <Badge variant="outline" className="text-xs capitalize">{item.severity}</Badge>
                            )}
                          </div>

                          {item.notes && item.notes.trim() && (
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <p className="text-sm text-muted-foreground flex-1 whitespace-pre-wrap">{item.notes}</p>
                            </div>
                          )}

                          {item.media && item.media.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {item.media.map((url, mi) => renderThumbnail(url, `${item.item_name} foto ${mi + 1}`, i, mi))}
                            </div>
                          )}

                          {/* Action buttons — labeled for clarity */}
                          <div className="flex items-center gap-2 min-h-[44px]">
                            <Button variant="outline" size="sm" className="h-11 gap-1.5 text-sm" onClick={() => startEdit(i)}>
                              <Pencil className="h-4 w-4" /> Bewerk
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-11 gap-1.5 text-sm"
                              disabled={uploadingItemIndex === i}
                              onClick={() => cameraInputRefs.current.get(i)?.click()}
                            >
                              {uploadingItemIndex === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Camera
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-11 gap-1.5 text-sm"
                              disabled={uploadingItemIndex === i}
                              onClick={() => galleryInputRefs.current.get(i)?.click()}
                            >
                              <ImageIcon className="h-4 w-4" /> Galerij
                            </Button>
                          </div>

                          <div className="border-t pt-3">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" className="w-full h-10 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 text-sm">
                                  <Trash2 className="h-4 w-4" /> Item verwijderen
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Punt verwijderen?</AlertDialogTitle>
                                  <AlertDialogDescription>"{item.item_name}" wordt permanent verwijderd.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => removeItem(i)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Verwijderen</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                {/* Single set of hidden file inputs per item */}
                <input ref={(el) => { if (el) cameraInputRefs.current.set(i, el); }} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) onUploadMedia(i, [file]); e.target.value = ""; }} />
                <input ref={(el) => { if (el) galleryInputRefs.current.set(i, el); }} type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => { const files = e.target.files; if (files && files.length > 0) onUploadMedia(i, Array.from(files)); e.target.value = ""; }} />
              </li>
            );
          }

          // Desktop: compact table row layout
          // Filter items based on desktopFilter
          const passesFilter = (() => {
            if (!desktopFilter || desktopFilter === "all") return true;
            if (desktopFilter === "defects") return !isOk;
            if (desktopFilter === "ok") return isOk;
            if (desktopFilter === "no-photo") return !isOk && mediaCount === 0;
            return true;
          })();
          if (!passesFilter) return null;

          return (
            <li key={i} className="group">
              {/* Compact table row */}
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md border-l-4 transition-colors cursor-pointer hover:bg-accent/40",
                  isOk
                    ? "border-l-green-500 bg-green-50/20"
                    : isDefectWithoutPhoto
                      ? "border-l-orange-400 bg-orange-50/20"
                      : "border-l-destructive bg-destructive/5"
                )}
                onClick={() => toggleExpanded(i)}
              >
                {/* Status toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleStatus(i); }}
                  className="shrink-0"
                  title={isOk ? "Markeer als aandachtspunt" : "Markeer als OK"}
                >
                  {isOk ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                </button>

                {/* Name — inline editable */}
                {isEditing ? (
                  <Input
                    value={editDraft?.item_name || ""}
                    onChange={(e) => editDraft && setEditDraft({ ...editDraft, item_name: e.target.value })}
                    className="h-7 text-sm flex-1 min-w-0"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                ) : (
                  <span className="text-sm flex-1 min-w-0 truncate">{mainName}</span>
                )}

                {/* Severity inline dropdown (only for defects) */}
                {!isOk && (
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <Select
                      value={isEditing ? (editDraft?.severity || "none") : (item.severity || "none")}
                      onValueChange={(v) => {
                        const newSeverity = v === "none" ? undefined : (v as "minor" | "major" | "critical");
                        if (isEditing && editDraft) {
                          setEditDraft({ ...editDraft, severity: newSeverity });
                        } else {
                          const updated = [...items];
                          updated[i] = { ...updated[i], severity: newSeverity };
                          onUpdateItems(updated);
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[70]">
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="critical">Kritiek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Photo count indicator */}
                <div className="shrink-0 flex items-center gap-1 min-w-[40px] justify-end">
                  {isDefectWithoutPhoto ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); galleryInputRefs.current.get(i)?.click(); }}
                      className="text-orange-500 flex items-center gap-0.5 text-xs font-medium"
                      title="Foto toevoegen"
                    >
                      <Camera className="h-3.5 w-3.5" /> 0
                    </button>
                  ) : mediaCount > 0 ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <ImageIcon className="h-3 w-3" /> {mediaCount}
                    </span>
                  ) : null}
                </div>

                {/* Action buttons */}
                <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit} title="Opslaan">
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit} title="Annuleren">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(i)} title="Bewerken">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => galleryInputRefs.current.get(i)?.click()}
                        disabled={uploadingItemIndex === i}
                        title="Foto toevoegen"
                      >
                        {uploadingItemIndex === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Punt verwijderen?</AlertDialogTitle>
                            <AlertDialogDescription>"{item.item_name}" wordt permanent verwijderd.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeItem(i)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Verwijderen</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>

                {/* Expand chevron */}
                <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-180")} />
              </div>

              {/* Expandable sub-row: notes + photos + edit form */}
              {isExpanded && (
                <div className="pl-10 pr-3 py-3 space-y-3 bg-muted/20 rounded-b-md border-l-4 border-l-transparent">
                  {isEditing && editDraft ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                        <button
                          onClick={() =>
                            setEditDraft({
                              ...editDraft,
                              status: editDraft.status === "ok" ? "defect" : "ok",
                              severity: editDraft.status === "ok" ? "minor" : undefined,
                            })
                          }
                          className={cn(
                            "flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-medium transition-colors",
                            editDraft.status === "ok"
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-red-100 text-destructive border border-red-300"
                          )}
                        >
                          {editDraft.status === "ok" ? <><CheckCircle2 className="h-4 w-4" /> OK</> : <><AlertTriangle className="h-4 w-4" /> Aandachtspunt</>}
                        </button>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Notities</label>
                        <Textarea
                          placeholder="Voeg een notitie toe..."
                          value={editDraft.notes}
                          onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                          className="min-h-[50px] text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}><Check className="h-4 w-4 mr-1" /> Opslaan</Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>Annuleren</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {item.notes && item.notes.trim() && (
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <p className="text-sm text-muted-foreground flex-1 whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Photos */}
                  {item.media && item.media.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {item.media.map((url, mi) => (
                        <div key={mi} className="relative group/photo">
                          <button
                            onClick={() => setFullscreenPhoto({ url, alt: `${item.item_name} foto ${mi + 1}` })}
                            className="block focus:outline-none"
                          >
                            <img src={url} alt={`${item.item_name} foto ${mi + 1}`} className="h-16 w-16 object-cover rounded-md border" />
                          </button>
                          {isLocalPhoto(url) && (
                            <div className="absolute bottom-0.5 left-0.5 bg-orange-500 text-white rounded-full p-0.5" title="Nog niet geüpload">
                              <CloudOff className="h-3 w-3" />
                            </div>
                          )}
                          <button onClick={() => removeMedia(i, mi)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center h-5 w-5 opacity-0 group-hover/photo:opacity-100 transition-opacity shadow-sm">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Photo upload row */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => galleryInputRefs.current.get(i)?.click()} disabled={uploadingItemIndex === i}>
                      {uploadingItemIndex === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />} Foto toevoegen
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => cameraInputRefs.current.get(i)?.click()} disabled={uploadingItemIndex === i}>
                      <Camera className="h-3 w-3" /> Camera
                    </Button>
                  </div>
                </div>
              )}

              {/* Hidden file inputs */}
              <input ref={(el) => { if (el) cameraInputRefs.current.set(i, el); }} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) onUploadMedia(i, [file]); e.target.value = ""; }} />
              <input ref={(el) => { if (el) galleryInputRefs.current.set(i, el); }} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { const files = e.target.files; if (files && files.length > 0) onUploadMedia(i, Array.from(files)); e.target.value = ""; }} />
            </li>
          );
        })}
      </ul>
      {/* Hide on mobile — FAB handles this */}
      {!isMobile && (
        <Button size="sm" variant="outline" onClick={addItem} className="mt-2">
          <Plus className={iconSize + " mr-1"} /> Punt toevoegen
        </Button>
      )}

      {/* Fullscreen photo viewer */}
      {fullscreenPhoto && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreenPhoto(null)}
        >
          <button
            onClick={() => setFullscreenPhoto(null)}
            className="absolute top-4 right-4 h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fullscreenPhoto.url}
            alt={fullscreenPhoto.alt}
            className="max-w-full max-h-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
