import { toast } from "sonner";

interface DownloadOptions {
  filename?: string;
}

/**
 * Downloads a file directly by triggering browser download.
 * More reliable than fetch-based approaches as it bypasses adblockers.
 */
export function downloadFile(url: string, options?: DownloadOptions): void {
  const filename = options?.filename || url.split('/').pop() || 'document';
  
  window.open(url, '_blank', 'noopener,noreferrer');
  
  toast.success("Document geopend", {
    description: filename,
    duration: 3000,
  });
}
