import { toast } from "sonner";

/**
 * Share or download a Blob file.
 * Prefers Web Share API (mobile), falls back to download trigger.
 */
export async function shareOrDownloadBlob(blob: Blob, filename: string): Promise<void> {
  console.log("[photo-fallback] export started", { filename, size: blob.size });

  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

  // Try Web Share API (works on iOS Safari 15+, Android Chrome 93+)
  try {
    if (navigator.canShare?.({ files: [file] })) {
      console.log("[photo-fallback] using Web Share API");
      await navigator.share({ files: [file], title: filename });
      console.log("[photo-fallback] share succeeded");
      toast.success("Foto gedeeld");
      return;
    }
  } catch (err: any) {
    // AbortError = user cancelled share sheet — not a real error
    if (err?.name === "AbortError") {
      console.log("[photo-fallback] share cancelled by user");
      return;
    }
    console.warn("[photo-fallback] share failed, falling back to download", err);
  }

  // Fallback: download via <a> tag
  try {
    console.log("[photo-fallback] using download fallback");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    console.log("[photo-fallback] download fallback used");
    toast.success("Download gestart", { description: filename });
  } catch (err) {
    console.error("[photo-fallback] export failed", err);
    toast.error("Exporteren mislukt", {
      description: "Je browser ondersteunt deze actie niet. Probeer een screenshot te maken.",
    });
  }
}

/**
 * Build a descriptive filename for an exported inspection photo.
 */
export function buildPhotoFilename(roomName: string, itemIndex: number): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  const safe = roomName.replace(/[\/\\:*?"<>|]/g, "").replace(/\s+/g, "_");
  return `inspectie-${safe}-${itemIndex + 1}-${date}_${time}.jpg`;
}
