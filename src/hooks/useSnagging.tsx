import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeFileName } from "@/lib/sanitizeFileName";

// Standard checklist items per category
export const STANDARD_SNAGGING_ITEMS = [
  // Keuken (8 items)
  { category: 'keuken', item_name: 'Kasten openen/sluiten goed' },
  { category: 'keuken', item_name: 'Werkblad onbeschadigd' },
  { category: 'keuken', item_name: 'Kraan werkt correct' },
  { category: 'keuken', item_name: 'Afvoer loopt goed door' },
  { category: 'keuken', item_name: 'Aansluitingen witgoed aanwezig' },
  { category: 'keuken', item_name: 'Stopcontacten werken' },
  { category: 'keuken', item_name: 'Verlichting werkt' },
  { category: 'keuken', item_name: 'Afwerking muren/tegels' },
  
  // Badkamer (10 items) — template category stays 'badkamer'
  { category: 'badkamer', item_name: 'Douche/bad werkt' },
  { category: 'badkamer', item_name: 'Kranen werken correct' },
  { category: 'badkamer', item_name: 'Toilet spoelt goed' },
  { category: 'badkamer', item_name: 'Wastafel onbeschadigd' },
  { category: 'badkamer', item_name: 'Afvoeren lopen door' },
  { category: 'badkamer', item_name: 'Ventilatie werkt' },
  { category: 'badkamer', item_name: 'Tegels onbeschadigd' },
  { category: 'badkamer', item_name: 'Voegen in orde' },
  { category: 'badkamer', item_name: 'Spiegel onbeschadigd' },
  { category: 'badkamer', item_name: 'Handdoekhouders bevestigd' },
  
  // Slaapkamers (6 items) — template category stays 'slaapkamers'
  { category: 'slaapkamers', item_name: 'Deuren sluiten goed' },
  { category: 'slaapkamers', item_name: 'Ramen openen/sluiten' },
  { category: 'slaapkamers', item_name: 'Rolluiken werken' },
  { category: 'slaapkamers', item_name: 'Stopcontacten werken' },
  { category: 'slaapkamers', item_name: 'Verlichting werkt' },
  { category: 'slaapkamers', item_name: 'Muren/plafond afwerking' },
  
  // Woonkamer (7 items)
  { category: 'woonkamer', item_name: 'Ramen openen/sluiten' },
  { category: 'woonkamer', item_name: 'Schuifpui werkt' },
  { category: 'woonkamer', item_name: 'Rolluiken werken' },
  { category: 'woonkamer', item_name: 'Stopcontacten werken' },
  { category: 'woonkamer', item_name: 'Verlichting werkt' },
  { category: 'woonkamer', item_name: 'Muren/plafond afwerking' },
  { category: 'woonkamer', item_name: 'Vloer onbeschadigd' },
  
  // Elektriciteit (6 items)
  { category: 'elektriciteit', item_name: 'Zekeringkast in orde' },
  { category: 'elektriciteit', item_name: 'Alle stopcontacten werken' },
  { category: 'elektriciteit', item_name: 'Lichtschakelaars werken' },
  { category: 'elektriciteit', item_name: 'Intercom/deurbel werkt' },
  { category: 'elektriciteit', item_name: 'Thermostaat werkt' },
  { category: 'elektriciteit', item_name: 'Meterstanden genoteerd' },
  
  // Sanitair & Water (5 items)
  { category: 'sanitair', item_name: 'Waterdruk voldoende' },
  { category: 'sanitair', item_name: 'Warm water beschikbaar' },
  { category: 'sanitair', item_name: 'Geen lekkages zichtbaar' },
  { category: 'sanitair', item_name: 'Alle afvoeren werken' },
  { category: 'sanitair', item_name: 'Boiler/warmwatertoestel werkt' },
  
  // Airco/Klimaat (4 items)
  { category: 'airco', item_name: 'Airco units werken' },
  { category: 'airco', item_name: 'Afstandsbediening werkt' },
  { category: 'airco', item_name: 'Filters schoon' },
  { category: 'airco', item_name: 'Geen lekkage bij units' },
  
  // Terras & Buiten (6 items)
  { category: 'buiten', item_name: 'Tegels/vloer onbeschadigd' },
  { category: 'buiten', item_name: 'Reling/balustrade stevig' },
  { category: 'buiten', item_name: 'Afwatering werkt' },
  { category: 'buiten', item_name: 'Buitenkraan werkt' },
  { category: 'buiten', item_name: 'Buitenverlichting werkt' },
  { category: 'buiten', item_name: 'Tuin/gemeenschappelijke ruimtes' },
];

export const CATEGORY_LABELS: Record<string, string> = {
  keuken: 'Keuken',
  badkamer: 'Badkamer(s)',
  slaapkamers: 'Slaapkamers',
  woonkamer: 'Woonkamer',
  elektriciteit: 'Elektriciteit',
  sanitair: 'Sanitair & Water',
  airco: 'Airco & Klimaat',
  buiten: 'Terras & Buiten',
  overig: 'Overig',
};

export const CATEGORY_ORDER = ['keuken', 'badkamer', 'slaapkamers', 'woonkamer', 'elektriciteit', 'sanitair', 'airco', 'buiten', 'overig'];

// Numeric sort helper: slaapkamer_1 < slaapkamer_2 < slaapkamer_10
function numericCategorySort(a: string, b: string): number {
  const matchA = a.match(/^(.+?)_(\d+)$/);
  const matchB = b.match(/^(.+?)_(\d+)$/);
  if (matchA && matchB && matchA[1] === matchB[1]) {
    return parseInt(matchA[2]) - parseInt(matchB[2]);
  }
  return a.localeCompare(b);
}

// Dynamic label helper for categories like slaapkamer_1, badkamer_2
export function getCategoryLabel(category: string): string {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  const bedroomMatch = category.match(/^slaapkamer_(\d+)$/);
  if (bedroomMatch) return `Slaapkamer ${bedroomMatch[1]}`;
  const bathroomMatch = category.match(/^badkamer_(\d+)$/);
  if (bathroomMatch) return `Badkamer ${bathroomMatch[1]}`;
  return category;
}

// Normalize legacy category to numbered form
export function normalizeCategory(category: string): string {
  if (category === 'slaapkamers') return 'slaapkamer_1';
  if (category === 'badkamer') return 'badkamer_1';
  return category;
}

// Get the template category for a numbered category
function getTemplateCategory(category: string): string {
  if (category.match(/^slaapkamer_\d+$/)) return 'slaapkamers';
  if (category.match(/^badkamer_\d+$/)) return 'badkamer';
  return category;
}

// Check if an item is a standard template item (accounts for numbered categories)
export function isStandardItem(item: { category: string; item_name: string }): boolean {
  const templateCat = getTemplateCategory(item.category);
  return STANDARD_SNAGGING_ITEMS.some(
    s => s.item_name === item.item_name && s.category === templateCat
  );
}

// Build dynamic category order based on actual items present
export function getDynamicCategoryOrder(items: { category: string }[]): string[] {
  const categories = [...new Set(items.map(i => i.category))];
  
  const baseOrder = ['keuken'];
  // Add badkamer categories in numeric order
  const bathrooms = categories.filter(c => c.match(/^badkamer(_\d+)?$/)).sort(numericCategorySort);
  baseOrder.push(...bathrooms);
  // Add slaapkamer categories in numeric order
  const bedrooms = categories.filter(c => c.match(/^slaapkamer(_\d+)?$/) || c === 'slaapkamers').sort(numericCategorySort);
  baseOrder.push(...bedrooms);
  baseOrder.push('woonkamer', 'elektriciteit', 'sanitair', 'airco', 'buiten', 'overig');
  
  // Return only categories that exist in items, plus any unlisted ones at the end
  const ordered = baseOrder.filter(c => categories.includes(c));
  const remaining = categories.filter(c => !ordered.includes(c));
  return [...ordered, ...remaining];
}

// Generate snagging items with per-room categories — ALWAYS numbered
export function generateSnaggingItems(bedrooms: number = 1, bathrooms: number = 1) {
  const bathroomTemplate = STANDARD_SNAGGING_ITEMS.filter(i => i.category === 'badkamer');
  const bedroomTemplate = STANDARD_SNAGGING_ITEMS.filter(i => i.category === 'slaapkamers');
  const otherItems = STANDARD_SNAGGING_ITEMS.filter(i => i.category !== 'badkamer' && i.category !== 'slaapkamers');
  
  const items = [...otherItems];
  
  // Generate per-bathroom items — always numbered
  for (let i = 1; i <= bathrooms; i++) {
    const cat = `badkamer_${i}`;
    items.push(...bathroomTemplate.map(t => ({ category: cat, item_name: t.item_name })));
  }
  
  // Generate per-bedroom items — always numbered
  for (let i = 1; i <= bedrooms; i++) {
    const cat = `slaapkamer_${i}`;
    items.push(...bedroomTemplate.map(t => ({ category: cat, item_name: t.item_name })));
  }
  
  return items;
}

export interface SnaggingInspection {
  id: string;
  sale_id: string;
  inspection_date: string;
  inspection_type: 'initial' | 'reinspection';
  inspector_name: string | null;
  status: 'in_progress' | 'completed' | 'sent_to_developer';
  sent_to_developer_at: string | null;
  developer_response_deadline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SnaggingItem {
  id: string;
  inspection_id: string;
  category: string;
  item_name: string;
  status: 'pending' | 'ok' | 'defect' | 'not_applicable';
  severity: 'minor' | 'major' | 'critical' | null;
  notes: string | null;
  photo_urls: string[] | null;
  resolved_at: string | null;
  resolved_notes: string | null;
  checked_by: string | null;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SnaggingPhoto {
  id: string;
  snagging_item_id: string;
  photo_url: string;
  storage_path: string | null;
  notes: string | null;
  room: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  uploaded_at: string;
  created_at: string;
}

// Fetch all inspections for a sale
export function useSnaggingInspections(saleId: string | undefined) {
  return useQuery({
    queryKey: ['snagging-inspections', saleId],
    queryFn: async () => {
      if (!saleId) return [];
      
      const { data, error } = await supabase
        .from('snagging_inspections')
        .select('*')
        .eq('sale_id', saleId)
        .order('inspection_date', { ascending: false });
      
      if (error) throw error;
      return data as SnaggingInspection[];
    },
    enabled: !!saleId,
  });
}

// Fetch items for an inspection
export function useSnaggingItems(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ['snagging-items', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return [];
      
      const { data, error } = await supabase
        .from('snagging_items')
        .select('*')
        .eq('inspection_id', inspectionId)
        .order('category')
        .order('item_name');
      
      if (error) throw error;
      return data as SnaggingItem[];
    },
    enabled: !!inspectionId,
  });
}

// Create new inspection with standard items
export function useCreateSnaggingInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      saleId, 
      inspectionType = 'initial',
      inspectorName,
      defectItemsOnly,
      bedrooms,
      bathrooms,
    }: { 
      saleId: string; 
      inspectionType?: 'initial' | 'reinspection';
      inspectorName?: string;
      defectItemsOnly?: SnaggingItem[];
      bedrooms?: number;
      bathrooms?: number;
    }) => {
      // Create inspection
      const { data: inspection, error: inspectionError } = await supabase
        .from('snagging_inspections')
        .insert({
          sale_id: saleId,
          inspection_type: inspectionType,
          inspector_name: inspectorName,
        })
        .select()
        .single();
      
      if (inspectionError) throw inspectionError;
      
      // Create items - either standard items or only defect items from previous inspection
      const generatedItems = generateSnaggingItems(bedrooms, bathrooms);
      const itemsToCreate = defectItemsOnly 
        ? defectItemsOnly.map(item => ({
            inspection_id: inspection.id,
            category: item.category,
            item_name: item.item_name,
            status: 'pending' as const,
            notes: item.notes,
          }))
        : generatedItems.map(item => ({
            inspection_id: inspection.id,
            category: item.category,
            item_name: item.item_name,
            status: 'pending' as const,
          }));
      
      const { error: itemsError } = await supabase
        .from('snagging_items')
        .insert(itemsToCreate);
      
      if (itemsError) throw itemsError;
      
      return inspection;
    },
    onSuccess: (_, { saleId }) => {
      queryClient.invalidateQueries({ queryKey: ['snagging-inspections', saleId] });
      toast.success('Inspectie aangemaakt');
    },
    onError: () => {
      toast.error('Fout bij aanmaken inspectie');
    },
  });
}

// Update inspection
export function useUpdateSnaggingInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<SnaggingInspection> & { id: string }) => {
      const { error } = await supabase
        .from('snagging_inspections')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-inspections'] });
      toast.success('Inspectie bijgewerkt');
    },
    onError: () => {
      toast.error('Fout bij bijwerken inspectie');
    },
  });
}

// Delete inspection
export function useDeleteSnaggingInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('snagging_inspections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-inspections'] });
      toast.success('Inspectie verwijderd');
    },
    onError: () => {
      toast.error('Fout bij verwijderen inspectie');
    },
  });
}

// Update single item
export function useUpdateSnaggingItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<SnaggingItem> & { id: string }) => {
      const { error } = await supabase
        .from('snagging_items')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-items'] });
    },
    onError: () => {
      toast.error('Fout bij bijwerken item');
    },
  });
}

// Fetch photos with metadata for an item
export function useSnaggingPhotos(itemId: string | undefined) {
  return useQuery({
    queryKey: ['snagging-photos', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      
      const { data, error } = await supabase
        .from('snagging_photos')
        .select('*')
        .eq('snagging_item_id', itemId)
        .order('uploaded_at', { ascending: true });
      
      if (error) throw error;
      return data as SnaggingPhoto[];
    },
    enabled: !!itemId,
  });
}

// Batch fetch all photos for an entire inspection (reduces N queries to 1)
export function useSnaggingPhotosByInspection(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ['snagging-photos-inspection', inspectionId],
    queryFn: async () => {
      if (!inspectionId) return [];
      
      // Get all item IDs for this inspection, then fetch their photos
      const { data: items, error: itemsError } = await supabase
        .from('snagging_items')
        .select('id')
        .eq('inspection_id', inspectionId);
      
      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return [];
      
      const itemIds = items.map(i => i.id);
      const { data, error } = await supabase
        .from('snagging_photos')
        .select('*')
        .in('snagging_item_id', itemIds)
        .order('uploaded_at', { ascending: true });
      
      if (error) throw error;
      return data as SnaggingPhoto[];
    },
    enabled: !!inspectionId,
  });
}

// Upload photo for item (writes to snagging_photos table)
export function useUploadSnaggingPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      itemId, 
      file, 
      room,
      notes,
      cachedUserInfo,
    }: { 
      itemId: string; 
      file: File; 
      room?: string;
      notes?: string;
      cachedUserInfo?: { userId: string; uploaderName: string } | null;
    }) => {
      const sanitizedName = sanitizeFileName(file.name);
      const uploadFile = sanitizedName === file.name
        ? file
        : new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified });

      const filePath = `${itemId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('snagging-photos')
        .upload(filePath, uploadFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('snagging-photos')
        .getPublicUrl(filePath);
      
      // Use cached user info if available, otherwise fetch (fallback)
      let userId: string | null = cachedUserInfo?.userId ?? null;
      let uploaderName = cachedUserInfo?.uploaderName ?? 'Onbekend';
      
      if (!cachedUserInfo) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .maybeSingle();
          if (profile) {
            uploaderName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || user.email || 'Onbekend';
          }
        }
      }
      
      // Insert into snagging_photos table
      const { error: photoError } = await supabase
        .from('snagging_photos')
        .insert({
          snagging_item_id: itemId,
          photo_url: publicUrl,
          storage_path: filePath,
          notes: notes || null,
          room: room || null,
          uploaded_by: userId,
          uploaded_by_name: uploaderName,
        });
      
      if (photoError) throw photoError;
      
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-items'] });
      queryClient.invalidateQueries({ queryKey: ['snagging-photos'] });
      toast.success('Foto geüpload');
    },
    onError: () => {
      toast.error('Fout bij uploaden foto');
    },
  });
}

// Update photo metadata (notes/room)
export function useUpdateSnaggingPhotoMeta() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { id: string; notes?: string | null; room?: string | null }) => {
      const { error } = await supabase
        .from('snagging_photos')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-photos'] });
    },
    onError: () => {
      toast.error('Fout bij bijwerken foto');
    },
  });
}

// Delete photo from item
export function useDeleteSnaggingPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      photoUrl, 
      photoId,
    }: { 
      photoUrl: string; 
      photoId: string;
    }) => {
      // Delete from storage
      const urlParts = photoUrl.split('/snagging-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('snagging-photos')
          .remove([filePath]);
      }
      
      // Delete from snagging_photos table
      const { error } = await supabase
        .from('snagging_photos')
        .delete()
        .eq('id', photoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-items'] });
      queryClient.invalidateQueries({ queryKey: ['snagging-photos'] });
      toast.success('Foto verwijderd');
    },
    onError: () => {
      toast.error('Fout bij verwijderen foto');
    },
  });
}

// Add a new snagging item to an inspection
export function useAddSnaggingItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      inspectionId, 
      category, 
      itemName,
    }: { 
      inspectionId: string; 
      category: string; 
      itemName: string;
    }) => {
      const { data, error } = await supabase
        .from('snagging_items')
        .insert({
          inspection_id: inspectionId,
          category,
          item_name: itemName,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-items'] });
      toast.success('Item toegevoegd');
    },
    onError: () => {
      toast.error('Fout bij toevoegen item');
    },
  });
}

// Delete a snagging item
export function useDeleteSnaggingItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('snagging_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snagging-items'] });
      toast.success('Item verwijderd');
    },
    onError: () => {
      toast.error('Fout bij verwijderen item');
    },
  });
}

// ==========================================
// ADD ROOM: clone items from room 1 to new numbered room
// ==========================================
export function useAddSnaggingRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      roomType,
      currentItems,
    }: {
      inspectionId: string;
      roomType: 'slaapkamer' | 'badkamer';
      currentItems: SnaggingItem[];
    }) => {
      // 1. Normalize legacy categories in DB first
      const legacyCategory = roomType === 'slaapkamer' ? 'slaapkamers' : 'badkamer';
      const hasLegacy = currentItems.some(i => i.category === legacyCategory);
      
      if (hasLegacy) {
        // Rename legacy category to _1
        const legacyIds = currentItems.filter(i => i.category === legacyCategory).map(i => i.id);
        for (const id of legacyIds) {
          await supabase
            .from('snagging_items')
            .update({ category: `${roomType}_1` })
            .eq('id', id);
        }
      }

      // 2. Find highest existing index
      const existingIndices = currentItems
        .map(i => {
          const match = i.category.match(new RegExp(`^${roomType}_(\\d+)$`));
          return match ? parseInt(match[1]) : null;
        })
        .filter((n): n is number => n !== null);
      
      // Also count the legacy one we just renamed
      if (hasLegacy && !existingIndices.includes(1)) {
        existingIndices.push(1);
      }
      
      const maxIndex = existingIndices.length > 0 ? Math.max(...existingIndices) : 0;
      const nextIndex = maxIndex + 1;
      const newCategory = `${roomType}_${nextIndex}`;

      // 3. Get items from room 1 to clone
      const sourceCategory = `${roomType}_1`;
      // Use updated items (after normalization) — find by matching source
      const sourceItems = hasLegacy
        ? currentItems.filter(i => i.category === legacyCategory)
        : currentItems.filter(i => i.category === sourceCategory);

      if (sourceItems.length === 0) {
        // Fallback: use template
        const templateCat = roomType === 'slaapkamer' ? 'slaapkamers' : 'badkamer';
        const templateItems = STANDARD_SNAGGING_ITEMS.filter(i => i.category === templateCat);
        const newItems = templateItems.map(t => ({
          inspection_id: inspectionId,
          category: newCategory,
          item_name: t.item_name,
          status: 'pending' as const,
        }));
        const { error } = await supabase.from('snagging_items').insert(newItems);
        if (error) throw error;
      } else {
        // Clone from room 1
        const newItems = sourceItems.map(item => ({
          inspection_id: inspectionId,
          category: newCategory,
          item_name: item.item_name,
          status: 'pending' as const,
        }));
        const { error } = await supabase.from('snagging_items').insert(newItems);
        if (error) throw error;
      }

      return { newCategory, nextIndex };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['snagging-items'] });
      toast.success(`${getCategoryLabel(result.newCategory)} toegevoegd`);
    },
    onError: () => {
      toast.error('Fout bij toevoegen kamer');
    },
  });
}

// Delete all items for a numbered room category (slaapkamer_2+, badkamer_2+)
export function useDeleteSnaggingRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inspectionId,
      category,
    }: {
      inspectionId: string;
      category: string;
    }) => {
      // Safety: only allow deleting numbered rooms >= 2
      const match = category.match(/^(slaapkamer|badkamer)_(\d+)$/);
      if (!match || parseInt(match[2]) <= 1) {
        throw new Error('Kamer 1 kan niet verwijderd worden');
      }

      // Delete all snagging_photos for items in this category first
      const { data: items } = await supabase
        .from('snagging_items')
        .select('id')
        .eq('inspection_id', inspectionId)
        .eq('category', category);

      if (items && items.length > 0) {
        const itemIds = items.map(i => i.id);
        await supabase
          .from('snagging_photos')
          .delete()
          .in('snagging_item_id', itemIds);
      }

      // Delete the items
      const { error } = await supabase
        .from('snagging_items')
        .delete()
        .eq('inspection_id', inspectionId)
        .eq('category', category);

      if (error) throw error;
      return { category };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['snagging-items'] });
      queryClient.invalidateQueries({ queryKey: ['snagging-photos'] });
      toast.success(`${getCategoryLabel(result.category)} verwijderd`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Fout bij verwijderen kamer');
    },
  });
}


export function getInspectionSummary(items: SnaggingItem[]) {
  const defectsByCategory: Record<string, { count: number; items: SnaggingItem[] }> = {};
  const defectsBySeverity = { minor: 0, major: 0, critical: 0 };
  let ok = 0, defect = 0, notApplicable = 0, pending = 0;

  for (const item of items) {
    switch (item.status) {
      case 'ok': ok++; break;
      case 'defect':
        defect++;
        if (item.severity === 'minor') defectsBySeverity.minor++;
        else if (item.severity === 'major') defectsBySeverity.major++;
        else if (item.severity === 'critical') defectsBySeverity.critical++;
        if (!defectsByCategory[item.category]) {
          defectsByCategory[item.category] = { count: 0, items: [] };
        }
        defectsByCategory[item.category].count++;
        defectsByCategory[item.category].items.push(item);
        break;
      case 'not_applicable': notApplicable++; break;
      case 'pending': pending++; break;
    }
  }

  return {
    total: items.length,
    ok,
    defect,
    notApplicable,
    pending,
    defectsByCategory,
    defectsBySeverity,
  };
}

// Realtime subscription for snagging data — auto-invalidates React Query cache
export function useSnaggingRealtime(inspectionId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!inspectionId) return;

    const channel = supabase
      .channel(`snagging-realtime-${inspectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'snagging_items',
          filter: `inspection_id=eq.${inspectionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['snagging-items', inspectionId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'snagging_photos',
        },
        (payload) => {
          // Invalidate photos for the changed item
          const itemId = (payload.new as any)?.snagging_item_id || (payload.old as any)?.snagging_item_id;
          if (itemId) {
            queryClient.invalidateQueries({ queryKey: ['snagging-photos', itemId] });
          }
          // Also refresh batch photos and items
          queryClient.invalidateQueries({ queryKey: ['snagging-photos-inspection', inspectionId] });
          queryClient.invalidateQueries({ queryKey: ['snagging-items', inspectionId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'snagging_inspections',
          filter: `id=eq.${inspectionId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['snagging-inspections'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inspectionId, queryClient]);
}
