import { toast } from "sonner";

/**
 * Triggers a browser download for an audio blob with a descriptive filename.
 */
export function triggerAudioDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke after a short delay to allow download to start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Builds a descriptive filename for an audio recording.
 * Format: ProjectNaam_WoningTitel_KamerNaam_2026-03-05_14-30.m4a
 */
export function buildAudioFilename(
  projectName?: string,
  propertyTitle?: string,
  roomName?: string
): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // 2026-03-05
  const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;

  const parts = [
    projectName || "Project",
    propertyTitle || "Woning",
    roomName || "Opname",
    `${date}_${time}`,
  ];

  return (
    parts
      .map((p) => p.replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, "_"))
      .join("_") + ".m4a"
  );
}
