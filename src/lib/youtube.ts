/**
 * YouTube URL utilities
 * Supports: watch?v=, youtu.be/, embed/, and shorts/ URLs
 */

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "").replace("m.", "");
    
    // youtube.com/watch?v=VIDEOID
    if (hostname === "youtube.com" && parsed.searchParams.has("v")) {
      return parsed.searchParams.get("v");
    }
    
    // youtube.com/shorts/VIDEOID or youtube.com/embed/VIDEOID
    if (hostname === "youtube.com") {
      const pathMatch = parsed.pathname.match(/^\/(shorts|embed)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) {
        return pathMatch[2];
      }
    }
    
    // youtu.be/VIDEOID
    if (hostname === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      if (id && id.match(/^[a-zA-Z0-9_-]{11}$/)) {
        return id;
      }
    }
  } catch {
    // Fallback regex for malformed URLs
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
  
  return null;
}

/**
 * Check if URL is a YouTube Shorts URL
 */
export function isYouTubeShorts(url: string): boolean {
  if (!url) return false;
  return url.includes("/shorts/");
}

/**
 * Get YouTube embed URL (privacy-enhanced)
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/**
 * Get YouTube thumbnail URL
 */
export function extractYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
