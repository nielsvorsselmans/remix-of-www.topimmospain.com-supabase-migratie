import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const MAX_DURATION_SECONDS = 5 * 60;
const WARNING_AT_SECONDS = 4 * 60;

interface UseMediaRecordingOptions {
  onRecordingComplete: (blob: Blob) => void;
}

export function useMediaRecording({ onRecordingComplete }: UseMediaRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const warnedRef = useRef(false);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    warnedRef.current = false;
  }, []);

  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (isPaused) {
      recorder.resume();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      setIsPaused(false);
    } else {
      recorder.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPaused(true);
    }
  }, [isPaused]);

  useEffect(() => {
    if (isRecording && !isPaused && duration >= MAX_DURATION_SECONDS) {
      toast({ title: "Maximum bereikt", description: "Opname gestopt na 5 minuten." });
      stopRecording();
    } else if (isRecording && !isPaused && duration >= WARNING_AT_SECONDS && !warnedRef.current) {
      warnedRef.current = true;
      toast({ title: "Nog 1 minuut", description: "De opname stopt automatisch na 5 minuten." });
    }
  }, [isRecording, isPaused, duration, stopRecording]);

  // Internal helper to init MediaRecorder on a given stream
  const initRecorder = useCallback((stream: MediaStream) => {
    const mimeTypes = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm",
    ];
    const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      onRecordingComplete(blob);
      setDuration(0);
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000);
    setIsRecording(true);
    setIsPaused(false);
    setDuration(0);
    warnedRef.current = false;
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, [onRecordingComplete]);

  // Start with an externally acquired stream (preserves user gesture chain)
  const startWithStream = useCallback((stream: MediaStream) => {
    initRecorder(stream);
  }, [initRecorder]);

  // Fallback: acquire stream internally (works on desktop, may break gesture chain on mobile)
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initRecorder(stream);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast({ title: "Microfoon geweigerd", description: "Geef toegang tot de microfoon om op te nemen.", variant: "destructive" });
    }
  }, [initRecorder]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return {
    isRecording,
    isPaused,
    duration,
    maxDuration: MAX_DURATION_SECONDS,
    startRecording,
    startWithStream,
    stopRecording,
    togglePause,
    formatTime,
  };
}
