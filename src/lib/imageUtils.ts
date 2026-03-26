/**
 * Generate a thumbnail URL using Supabase Storage image transformation.
 * Uses the /render/image/public/ path which actually applies transformations,
 * unlike /object/public/ which ignores query parameters.
 */
export function getSnaggingThumbnailUrl(
  url: string,
  width: number = 240,
  quality: number = 60
): string {
  if (!url) return url;
  if (!url.includes('supabase.co/storage/')) return url;
  const transformed = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  const separator = transformed.includes('?') ? '&' : '?';
  return `${transformed}${separator}width=${width}&quality=${quality}&resize=contain`;
}
