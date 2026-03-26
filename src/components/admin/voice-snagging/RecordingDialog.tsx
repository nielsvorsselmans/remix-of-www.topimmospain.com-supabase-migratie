import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckCircle2, Download, Pause, Play, Square, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaRecording } from "@/hooks/useMediaRecording";
import { useEffect, useRef, useState, useMemo } from "react";
import { AudioPlayer } from "./AudioPlayer";
import { triggerAudioDownload, buildAudioFilename } from "@/utils/triggerAudioDownload";

interface RecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomName?: string;
  existingRooms?: string[];
  projectName?: string;
  propertyTitle?: string;
  stream?: MediaStream | null;
  onRecordingComplete: (blob: Blob, roomName: string) => void;
}

export function RecordingDialog({ open, onOpenChange, roomName, existingRooms = [], projectName, propertyTitle, stream: streamProp, onRecordingComplete }: RecordingDialogProps) {
  const startedRef = useRef(false);
  const [reviewBlob, setReviewBlob] = useState<Blob | null>(null);
  const [showRoomSelect, setShowRoomSelect] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  const reviewUrl = useMemo(() => {
    if (reviewBlob) return URL.createObjectURL(reviewBlob);
    return null;
  }, [reviewBlob]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    };
  }, [reviewUrl]);

  const handleComplete = (blob: Blob) => {
    setReviewBlob(blob);
  };

  const {
    isRecording,
    isPaused,
    duration,
    maxDuration,
    startRecording,
    startWithStream,
    stopRecording,
    togglePause,
    formatTime,
  } = useMediaRecording({ onRecordingComplete: handleComplete });

  const progressPercent = (duration / maxDuration) * 100;
  const timeRemaining = maxDuration - duration;
  const isNearLimit = timeRemaining <= 60;

  const resetAndClose = () => {
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    setReviewBlob(null);
    setShowRoomSelect(false);
    setSelectedRoom(null);
    setNewRoomName("");
    setIsAddingNew(false);
    startedRef.current = false;
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!reviewBlob) return;

    // If roomName was provided (per-room shortcut), skip room selection
    if (roomName) {
      const blob = reviewBlob;
      resetAndClose();
      onRecordingComplete(blob, roomName);
    } else {
      // Show room selection step
      setShowRoomSelect(true);
    }
  };

  const handleRoomConfirm = () => {
    if (!reviewBlob) return;
    const finalRoom = isAddingNew ? newRoomName.trim() : selectedRoom;
    if (!finalRoom) return;
    const blob = reviewBlob;
    resetAndClose();
    onRecordingComplete(blob, finalRoom);
  };

  const handleDiscard = () => {
    resetAndClose();
  };

  // Auto-start recording when dialog opens with a stream
  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      setReviewBlob(null);
      setShowRoomSelect(false);
      setSelectedRoom(null);
      setNewRoomName("");
      setIsAddingNew(false);
      if (streamProp) {
        startWithStream(streamProp);
      } else {
        // Fallback for cases where no stream is provided (e.g. desktop)
        startRecording();
      }
    }
  }, [open, streamProp, startWithStream, startRecording]);

  const handleStop = () => {
    stopRecording();
  };

  const isReviewing = !!reviewBlob && !showRoomSelect;
  const isSelectingRoom = !!reviewBlob && showRoomSelect;
  const isBusy = isRecording || isReviewing || isSelectingRoom;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && isBusy) return;
      onOpenChange(v);
    }}>
      <DialogContent
        className="sm:max-w-md max-sm:h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 flex flex-col items-center gap-5 p-5 sm:gap-8 sm:p-8 sm:justify-center max-sm:justify-between max-sm:pt-12 max-sm:pb-8"
        onPointerDownOutside={(e) => {
          if (isBusy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault();
        }}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-semibold">
            {isSelectingRoom ? "Kies een ruimte" : roomName ? `Opname — ${roomName}` : "Opname"}
          </DialogTitle>
        </DialogHeader>

        {isSelectingRoom ? (
          /* ── Room selection step — horizontal chips ── */
          <div className="flex flex-col items-center gap-5 w-full flex-1 max-sm:justify-center">
            <p className="text-sm text-muted-foreground text-center">
              Aan welke ruimte wil je deze opname koppelen?
            </p>

            {/* Existing rooms */}
            {existingRooms.length > 0 && !isAddingNew && (
              <div className="relative w-full">
                <ScrollArea className="w-full">
                  <div className="flex items-center gap-2 px-1 pr-6">
                    {existingRooms.map((room) => (
                      <button
                        key={room}
                        onClick={() => setSelectedRoom(room)}
                        className={cn(
                          "px-4 py-2.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap min-h-[44px] shrink-0",
                          selectedRoom === room
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card hover:bg-accent border-border"
                        )}
                      >
                        {room}
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                {existingRooms.length > 3 && (
                  <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                )}
              </div>
            )}

            {/* Add new room */}
            {isAddingNew ? (
              <div className="w-full max-w-xs space-y-3">
                <Input
                  placeholder="Naam van de ruimte..."
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newRoomName.trim() && handleRoomConfirm()}
                  autoFocus
                  className="h-11"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsAddingNew(false); setNewRoomName(""); }}
                >
                  ← Terug naar lijst
                </Button>
              </div>
            ) : (
              <button
                onClick={() => { setIsAddingNew(true); setSelectedRoom(null); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm border border-dashed text-muted-foreground hover:bg-accent min-h-[44px]"
              >
                <Plus className="h-4 w-4" /> Nieuwe ruimte
              </button>
            )}

            {/* Confirm / Back */}
            <div className="flex items-center gap-3 w-full max-w-xs pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => { setShowRoomSelect(false); setSelectedRoom(null); setIsAddingNew(false); setNewRoomName(""); }}
              >
                Terug
              </Button>
              <Button
                className="flex-1 h-12"
                onClick={handleRoomConfirm}
                disabled={isAddingNew ? !newRoomName.trim() : !selectedRoom}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Bewaren
              </Button>
            </div>
          </div>
        ) : isReviewing ? (
          /* ── Review mode ── */
          <div className="flex flex-col items-center gap-5 w-full flex-1 max-sm:justify-center">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <span className="text-lg font-medium">Opname voltooid</span>
            </div>

            {reviewUrl && (
              <div className="w-full max-w-xs">
                <AudioPlayer src={reviewUrl} />
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Beluister de opname en kies om te bewaren of te verwijderen.
            </p>

            <div className="flex items-center gap-3 w-full max-w-xs">
              <Button
                variant="outline"
                className="flex-1 gap-2 h-12"
                onClick={handleDiscard}
              >
                <Trash2 className="h-4 w-4" />
                Verwijderen
              </Button>
              <Button
                variant="outline"
                className="gap-2 px-3 h-12"
                onClick={() => {
                  if (!reviewBlob) return;
                  const filename = buildAudioFilename(projectName, propertyTitle, roomName);
                  triggerAudioDownload(reviewBlob, filename);
                }}
                title="Download als backup"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                className="flex-1 gap-2 h-12"
                onClick={handleSave}
              >
                <CheckCircle2 className="h-4 w-4" />
                Bewaren
              </Button>
            </div>
          </div>
        ) : (
          /* ── Recording mode ── */
          <div className="flex flex-col items-center gap-5 w-full flex-1 max-sm:justify-between">
            {/* Timer section */}
            <div className="flex flex-col items-center gap-4 flex-1 max-sm:justify-center">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  {!isPaused && isRecording && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  )}
                  <span
                    className={cn(
                      "relative inline-flex rounded-full h-4 w-4",
                      isPaused ? "bg-amber-500 animate-pulse" : "bg-destructive"
                    )}
                  />
                </span>
                <span
                  className={cn(
                    "text-6xl font-mono font-bold tabular-nums tracking-tight",
                    isPaused ? "text-amber-600 animate-pulse" : "text-foreground",
                    isNearLimit && !isPaused && "text-destructive"
                  )}
                >
                  {formatTime(duration)}
                </span>
              </div>

              <div className="w-full max-w-xs">
                <Progress
                  value={progressPercent}
                  className={cn("h-2", isNearLimit && "[&>div]:bg-destructive")}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {isPaused ? "Opname gepauzeerd" : "Spreek duidelijk in je microfoon"}
              </p>
            </div>

            {/* Controls — pushed to bottom on mobile for thumb reach */}
            <div className="flex flex-col items-center gap-3 max-sm:pb-4">
              <div className="flex items-center gap-5">
                <button
                  onClick={togglePause}
                  className="h-16 w-16 rounded-full border-2 border-border bg-card flex items-center justify-center active:scale-95 transition-transform shadow-md"
                >
                  {isPaused ? <Play className="h-7 w-7 text-foreground" /> : <Pause className="h-7 w-7 text-foreground" />}
                </button>
                <button
                  onClick={handleStop}
                  className="h-20 w-20 rounded-full bg-destructive flex flex-col items-center justify-center active:scale-95 transition-transform shadow-lg"
                >
                  <Square className="h-7 w-7 text-destructive-foreground" />
                  <span className="text-[10px] font-medium text-destructive-foreground mt-0.5">Stop</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Max. 5 minuten</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
