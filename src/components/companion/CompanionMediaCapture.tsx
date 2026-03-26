import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Camera, Video, Square, Trash2, Play, Pause } from "lucide-react";
import { useMediaRecording } from "@/hooks/useMediaRecording";
import { CompanionMediaItem } from "@/hooks/useCompanionNotes";

interface CompanionMediaCaptureProps {
  viewingId: string;
  projectId: string;
  media: CompanionMediaItem[];
  onUpload: (viewingId: string, projectId: string, file: Blob, type: "audio" | "photo" | "video") => Promise<void>;
  onDelete: (viewingId: string, storagePath: string) => Promise<void>;
}

export function CompanionMediaCapture({ viewingId, projectId, media, onUpload, onDelete }: CompanionMediaCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const { isRecording, isPaused, duration, startRecording, stopRecording, togglePause, formatTime } =
    useMediaRecording({
      onRecordingComplete: async (blob) => {
        setUploading(true);
        try {
          await onUpload(viewingId, projectId, blob, "audio");
        } finally {
          setUploading(false);
        }
      },
    });

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>, type: "photo" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(viewingId, projectId, file, type);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const audioItems = media.filter((m) => m.type === "audio");
  const photoItems = media.filter((m) => m.type === "photo");
  const videoItems = media.filter((m) => m.type === "video");

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Media ({media.length})
      </p>

      {/* Capture buttons */}
      <div className="flex gap-2 flex-wrap">
        {isRecording ? (
          <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-mono">{formatTime(duration)}</span>
            <Button size="sm" variant="ghost" onClick={togglePause}>
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="destructive" onClick={stopRecording}>
              <Square className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={uploading}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            Audio
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => photoRef.current?.click()}
          disabled={uploading || isRecording}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Foto
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => videoRef.current?.click()}
          disabled={uploading || isRecording}
          className="gap-2"
        >
          <Video className="h-4 w-4" />
          Video
        </Button>

        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileCapture(e, "photo")}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFileCapture(e, "video")}
        />
      </div>

      {uploading && (
        <p className="text-sm text-muted-foreground animate-pulse">Uploaden…</p>
      )}

      {/* Media grid */}
      {media.length > 0 && (
        <div className="space-y-3">
          {/* Photos */}
          {photoItems.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photoItems.map((item) => (
                <div key={item.storage_path} className="relative group rounded-lg overflow-hidden border">
                  <img src={item.url} alt="" className="w-full aspect-square object-cover" />
                  <button
                    onClick={() => onDelete(viewingId, item.storage_path)}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Audio */}
          {audioItems.map((item) => (
            <div key={item.storage_path} className="flex items-center gap-2 border rounded-lg p-2">
              <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
              <audio controls src={item.url} className="flex-1 h-8" />
              <button
                onClick={() => onDelete(viewingId, item.storage_path)}
                className="p-1 text-destructive hover:bg-destructive/10 rounded"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Videos */}
          {videoItems.map((item) => (
            <div key={item.storage_path} className="relative group border rounded-lg overflow-hidden">
              <video controls src={item.url} className="w-full max-h-48" />
              <button
                onClick={() => onDelete(viewingId, item.storage_path)}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
