import { supabase } from "@/integrations/supabase/client";

export interface ClassificationResult {
  type: string;
  confidence: number;
  source: 'hardcoded' | 'learned' | 'ai';
  suggestLearn: boolean;
  matchedPattern?: string;
}

/**
 * Classify a document based on its filename and optional title.
 * Uses a 3-layer approach:
 * 1. Hardcoded patterns (most reliable)
 * 2. Learned patterns from database (admin-approved)
 * 3. AI classification (for new/unknown documents)
 */
export async function classifyDocument(
  fileName: string,
  title?: string
): Promise<ClassificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('classify-document', {
      body: { fileName, title },
    });

    if (error) {
      console.error('Classification error:', error);
      return {
        type: 'other',
        confidence: 0.1,
        source: 'ai',
        suggestLearn: false,
      };
    }

    return data as ClassificationResult;
  } catch (err) {
    console.error('Failed to classify document:', err);
    return {
      type: 'other',
      confidence: 0.1,
      source: 'ai',
      suggestLearn: false,
    };
  }
}

/**
 * Save a new document type pattern to the database.
 * This enables the system to learn and recognize similar documents in the future.
 */
export async function learnDocumentPattern(
  pattern: string,
  documentType: string,
  confidence: number = 0.9
): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.functions.invoke('classify-document', {
      body: {
        action: 'learn',
        pattern,
        documentType,
        confidence,
        userId: userData?.user?.id,
      },
    });

    if (error) {
      console.error('Learn pattern error:', error);
      return false;
    }

    return data?.success === true;
  } catch (err) {
    console.error('Failed to learn pattern:', err);
    return false;
  }
}

/**
 * Learn from admin correction: when an admin changes a document type,
 * automatically learn the pattern for future documents.
 */
export async function learnFromCorrection(
  fileName: string,
  title: string | null,
  correctType: string
): Promise<void> {
  try {
    // Use title if available, otherwise use filename
    const patternSource = title || fileName;
    const pattern = extractPatternFromFileName(patternSource);
    
    // Don't learn from very short patterns
    if (pattern.length < 4) {
      console.log('[learnFromCorrection] Pattern too short, skipping:', pattern);
      return;
    }
    
    const success = await learnDocumentPattern(pattern, correctType, 1.0);
    
    if (success) {
      console.log(`[learnFromCorrection] Learned: "${pattern}" → ${correctType}`);
    }
  } catch (err) {
    // Don't throw - learning is a background enhancement, shouldn't break the main flow
    console.error('[learnFromCorrection] Failed to learn pattern:', err);
  }
}

/**
 * Extract a potential pattern from a filename.
 * Removes common prefixes like dates, numbers, and file extensions.
 */
export function extractPatternFromFileName(fileName: string): string {
  let pattern = fileName;
  
  // Remove file extension
  pattern = pattern.replace(/\.[^.]+$/, '');
  
  // Remove common date prefixes (YYMMDD, YYYYMMDD, DD-MM-YYYY, etc.)
  pattern = pattern.replace(/^(\d{2,4}[-_]?\d{2}[-_]?\d{2,4})[-_\s]*/i, '');
  
  // Remove version numbers like _v1, _v2, (1), (2)
  pattern = pattern.replace(/[-_]?v\d+$/i, '');
  pattern = pattern.replace(/\s*\(\d+\)$/i, '');
  
  // Remove common suffixes like _final, _definitivo
  pattern = pattern.replace(/[-_]?(final|definitivo|draft|borrador)$/i, '');
  
  // Clean up underscores and dashes
  pattern = pattern.replace(/[-_]+/g, ' ').trim();
  
  // If pattern is too short (less than 3 chars), return original without extension
  if (pattern.length < 3) {
    return fileName.replace(/\.[^.]+$/, '');
  }
  
  return pattern;
}

/**
 * Get the display label for a document type.
 */
export function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'prijslijst': 'Prijslijst',
    'specifications': 'Specificatielijst',
    'floorplan': 'Grondplan woning',
    'grondplan': 'Grondplan woning',
    'payment_schedule': 'Betalingsschema',
    'reservation_contract': 'Reservatiecontract',
    'purchase_contract': 'Koopcontract',
    'masterplan': 'Masterplan project',
    'bank_guarantee': 'Bankgarantie',
    'building_permit': 'Bouwvergunning',
    'ownership_extract': 'Uittreksel eigendomsregister',
    'cadastral_file': 'Kadastrale fiche',
    'basement_plan': 'Kelderplan',
    'measurement_plan': 'Afmetingenplan',
    'home_plan': 'Woningplan',
    'other_plan': 'Overig plan',
    'brochure': 'Brochure',
    'video_link': 'Video',
    'andere': 'Overig',
    'other': 'Overig',
  };
  
  return labels[type] || type;
}

/**
 * Get the confidence badge color based on confidence level.
 */
export function getConfidenceBadgeColor(confidence: number): string {
  if (confidence >= 0.9) return 'bg-green-100 text-green-800';
  if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
  return 'bg-orange-100 text-orange-800';
}

/**
 * Get source badge color based on classification source.
 */
export function getSourceBadgeColor(source: 'hardcoded' | 'learned' | 'ai'): string {
  switch (source) {
    case 'hardcoded':
      return 'bg-blue-100 text-blue-800';
    case 'learned':
      return 'bg-purple-100 text-purple-800';
    case 'ai':
      return 'bg-amber-100 text-amber-800';
  }
}
