import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  src: string;
  isMobile?: boolean;
}

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function isLikelyWebm(src: string) {
  return /\.webm(\?|$)/i.test(src);
}

export function AudioPlayer({ src, isMobile }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "metadata";
      a.src = src;
      a.addEventListener("loadedmetadata", () => setDuration(a.duration));
      a.addEventListener("timeupdate", () => setCurrentTime(a.currentTime));
      a.addEventListener("ended", () => setPlaying(false));
      a.addEventListener("error", () => {
        setPlaying(false);
        setPlaybackError(true);
      });
      audioRef.current = a;
    }
    return audioRef.current;
  }, [src]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [src]);

  const toggle = async () => {
    const audio = getAudio();
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        await audio.play();
        setPlaying(true);
        setPlaybackError(false);
      } catch (err: any) {
        setPlaying(false);
        setPlaybackError(true);
        const isNotSupported = err?.name === "NotSupportedError";
        toast({
          title: isNotSupported
            ? "Formaat niet ondersteund"
            : "Afspelen mislukt",
          description: isNotSupported
            ? "Dit audioformaat wordt niet ondersteund op dit toestel. Gebruik de downloadknop."
            : "Kan audio niet afspelen. Probeer te downloaden.",
          variant: "destructive",
        });
      }
    }
  };

  const scrub = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const audio = getAudio();
    if (!bar || !audio.duration) return;
    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setCurrentTime(audio.currentTime);
  };

  const openInNewTab = () => {
    window.open(src, "_blank", "noopener,noreferrer");
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const showWebmWarning = isLikelyWebm(src);

  return (
    <div className="space-y-1">
      {showWebmWarning && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Mogelijk niet afspeelbaar op iPhone</span>
        </div>
      )}
      <div className={cn("flex items-center gap-2", isMobile ? "gap-3" : "gap-2")}>
        <Button
          size="icon"
          variant="outline"
          className={cn(
            "shrink-0 rounded-full",
            isMobile ? "h-11 w-11" : "h-8 w-8"
          )}
          onClick={toggle}
        >
          {playing ? (
            <Pause className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
          ) : (
            <Play className={cn(isMobile ? "h-5 w-5" : "h-4 w-4", "ml-0.5")} />
          )}
        </Button>

        <div
          ref={progressRef}
          className={cn(
            "flex-1 relative cursor-pointer rounded-full bg-secondary",
            isMobile ? "h-3" : "h-2"
          )}
          onClick={scrub}
          onTouchStart={scrub}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className={cn(
          "shrink-0 tabular-nums text-muted-foreground",
          isMobile ? "text-sm" : "text-xs"
        )}>
          {formatTime(currentTime)}/{formatTime(duration)}
        </span>

        {(playbackError || showWebmWarning) && (
          <Button
            size="icon"
            variant="ghost"
            className={cn("shrink-0", isMobile ? "h-11 w-11" : "h-8 w-8")}
            onClick={openInNewTab}
            title="Open in nieuw tabblad / Download"
          >
            <Download className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
          </Button>
        )}
      </div>
    </div>
  );
}
