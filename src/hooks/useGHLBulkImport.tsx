import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: string[];
  dateAdded: string;
  source: string;
  isImported: boolean;
}

export interface TagSearchResult {
  contacts: GHLContact[];
  total: number;
  imported: number;
  toImport: number;
}

export interface BulkImportResult {
  success: boolean;
  results: {
    imported: number;
    linked: number;
    skipped: number;
    synced: number;
    errors: string[];
  };
  message: string;
}

export function useGHLTagSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TagSearchResult | null>(null);

  const searchByTag = async (tag: string): Promise<TagSearchResult | null> => {
    if (!tag.trim()) {
      toast.error('Voer een tag in');
      return null;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-ghl-contacts-by-tag', {
        body: { tag: tag.trim() },
      });

      if (error) throw error;

      setResult(data);
      return data;
    } catch (error) {
      console.error('Tag search error:', error);
      toast.error('Zoeken op tag mislukt');
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  return {
    searchByTag,
    isSearching,
    result,
    reset,
  };
}

export function useGHLBulkImport() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const queryClient = useQueryClient();

  const bulkImport = async (tag: string, syncData: boolean = true): Promise<BulkImportResult | null> => {
    if (!tag.trim()) {
      toast.error('Tag is verplicht');
      return null;
    }

    setIsImporting(true);
    setProgress('Contacten ophalen...');

    try {
      setProgress('Importeren en synchroniseren...');
      
      const { data, error } = await supabase.functions.invoke('bulk-import-ghl-contacts', {
        body: { tag: tag.trim(), sync_data: syncData },
      });

      if (error) throw error;

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['klanten'] });
      queryClient.invalidateQueries({ queryKey: ['leads-to-follow'] });

      const result = data as BulkImportResult;
      
      if (result.success) {
        const { imported, linked, synced } = result.results;
        toast.success(
          `Import voltooid: ${imported} nieuw, ${linked} gekoppeld${syncData ? `, ${synced} gesynchroniseerd` : ''}`
        );
      }

      return result;
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Bulk import mislukt');
      return null;
    } finally {
      setIsImporting(false);
      setProgress('');
    }
  };

  return {
    bulkImport,
    isImporting,
    progress,
  };
}
