/**
 * Sanitizes a filename for safe use with Supabase Storage.
 * Removes diacritics, special characters, and spaces.
 * 
 * Example: "SÓTANO BLOQUE 4 (1).pdf" → "SOTANO_BLOQUE_4_1.pdf"
 */
export function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  const ext = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';
  
  const sanitized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (é → e, Ó → O)
    .replace(/\s+/g, '_')            // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')  // Remove special chars like ()
    .slice(0, 100);                  // Limit length
  
  return sanitized + ext.toLowerCase();
}
