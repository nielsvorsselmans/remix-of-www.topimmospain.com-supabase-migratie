import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface TemplateOptionImage {
  image_url: string;
  title?: string;
  is_primary?: boolean;
  order_index?: number;
}

export interface TemplateOption {
  name: string;
  description?: string;
  color_code?: string;
  brand?: string;
  product_code?: string;
  price?: number;
  is_default?: boolean;
  order_index?: number;
  images?: TemplateOptionImage[];
}

export interface MaterialTemplate {
  id: string;
  project_id: string;
  category: string;
  room: string | null;
  title: string;
  description: string | null;
  default_options: TemplateOption[] | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Type for Supabase selection response with nested options and images
interface SelectionWithOptions {
  id: string;
  sale_id: string;
  title: string;
  room: string | null;
  category: string;
  description: string | null;
  order_index: number;
  customer_visible: boolean;
  notes: string | null;
  chosen_option_id: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  updated_at: string;
  options: Array<{
    id: string;
    name: string;
    description: string | null;
    color_code: string | null;
    brand: string | null;
    product_code: string | null;
    price: number | null;
    is_default: boolean;
    is_chosen: boolean;
    order_index: number;
    images: Array<{
      id: string;
      image_url: string;
      title: string | null;
      is_primary: boolean;
      order_index: number;
    }>;
  }>;
}

// Interface for tracking option insert positions during batch operations
interface OptionInsertTracker {
  sourceOptId: string;
  insertIndex: number;
}

// Result types for mutation functions
export interface ApplyTemplatesResult {
  saleId: string;
  count: number;
  skipped: number;
  imagesInserted?: number;
  imagesError?: string | null;
}

export interface CopyMaterialsResult {
  targetSaleId: string;
  count: number;
  imagesInserted: number;
  imagesError: string | null;
}

// Helper to cast TemplateOption[] to Json for Supabase
function optionsToJson(options: TemplateOption[] | null | undefined): Json | null {
  if (!options) return null;
  return options as unknown as Json;
}

/**
 * Build TemplateOption[] from source options with images.
 * DRY helper used by export and sync functions.
 */
function buildTemplateOptionsFromSource(
  sourceOptions: SelectionWithOptions['options']
): TemplateOption[] {
  return sourceOptions.map((opt, index) => {
    const option: TemplateOption = {
      name: opt.name,
      is_default: opt.is_default || false,
      order_index: opt.order_index ?? index,
    };
    // Only add optional fields if they have values (cleaner JSON)
    if (opt.description) option.description = opt.description;
    if (opt.color_code) option.color_code = opt.color_code;
    if (opt.brand) option.brand = opt.brand;
    if (opt.product_code) option.product_code = opt.product_code;
    if (opt.price) option.price = opt.price;
    
    if (opt.images && opt.images.length > 0) {
      option.images = opt.images.map((img, imgIdx) => {
        const image: TemplateOptionImage = {
          image_url: img.image_url,
          is_primary: img.is_primary || false,
          order_index: img.order_index ?? imgIdx,
        };
        if (img.title) image.title = img.title;
        return image;
      });
    }
    return option;
  });
}

// Fetch all templates for a project
export function useMaterialTemplates(projectId: string | undefined) {
  return useQuery({
    queryKey: ["material-templates", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("material_templates")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        default_options: item.default_options as unknown as TemplateOption[] | null,
      })) as MaterialTemplate[];
    },
    enabled: !!projectId,
  });
}

// Create a template
export function useCreateMaterialTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      project_id: string;
      category: string;
      room?: string | null;
      title: string;
      description?: string | null;
      default_options?: TemplateOption[] | null;
      order_index?: number;
      is_active?: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from("material_templates")
        .insert({
          ...data,
          default_options: optionsToJson(data.default_options),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["material-templates", variables.project_id] });
      toast.success("Template toegevoegd");
    },
    onError: (error) => {
      toast.error("Fout bij toevoegen template: " + error.message);
    },
  });
}

// Update a template
export function useUpdateMaterialTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      default_options,
      ...rest
    }: {
      id: string;
      projectId: string;
      category?: string;
      room?: string | null;
      title?: string;
      description?: string | null;
      default_options?: TemplateOption[] | null;
      is_active?: boolean;
      order_index?: number;
    }) => {
      const updateData: Record<string, unknown> = { ...rest };
      if (default_options !== undefined) {
        updateData.default_options = optionsToJson(default_options);
      }
      
      const { error } = await supabase
        .from("material_templates")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-templates", result.projectId] });
      toast.success("Template bijgewerkt");
    },
    onError: (error) => {
      toast.error("Fout bij bijwerken template: " + error.message);
    },
  });
}

// Delete a template
export function useDeleteMaterialTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("material_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-templates", result.projectId] });
      toast.success("Template verwijderd");
    },
    onError: (error) => {
      toast.error("Fout bij verwijderen template: " + error.message);
    },
  });
}

// Apply templates to a sale (including images) - OPTIMIZED with batch inserts
export function useApplyTemplatesToSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      saleId 
    }: { 
      projectId: string; 
      saleId: string;
    }) => {
      // Fetch all active templates for the project
      const { data: templates, error: templatesError } = await supabase
        .from("material_templates")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) {
        throw new Error("Geen actieve templates gevonden voor dit project");
      }

      // Check existing selections for duplicate detection
      // Uses BOTH source_template_id (reliable) AND title+room fallback (for legacy data)
      const { data: existingSelections } = await supabase
        .from("material_selections")
        .select("source_template_id, title, room")
        .eq("sale_id", saleId);
      
      // Primary check: by source_template_id (most reliable)
      const existingTemplateIds = new Set(
        existingSelections?.filter(s => s.source_template_id)
          .map(s => s.source_template_id) || []
      );

      // Fallback check: by title+room combination (for selections without source_template_id)
      const existingTitleRoomKeys = new Set(
        existingSelections?.map(s => `${s.title}||${s.room || ''}`) || []
      );

      // Filter templates that haven't been applied yet (check both methods)
      const templatesToApply = templates.filter(t => {
        // Skip if already linked by source_template_id
        if (existingTemplateIds.has(t.id)) return false;
        // Fallback: skip if title+room already exists
        const key = `${t.title}||${t.room || ''}`;
        if (existingTitleRoomKeys.has(key)) return false;
        return true;
      });
      const skipped = templates.length - templatesToApply.length;

      if (templatesToApply.length === 0) {
        return { saleId, count: 0, skipped };
      }

      // BATCH 1: Insert all selections at once with source_template_id for tracking
      const selectionsToInsert = templatesToApply.map(t => ({
        sale_id: saleId,
        category: t.category,
        room: t.room,
        title: t.title,
        description: t.description,
        order_index: t.order_index,
        customer_visible: true,
        source_template_id: t.id, // Link to source template for duplicate detection
      }));

      const { data: newSelections, error: selectionsError } = await supabase
        .from("material_selections")
        .insert(selectionsToInsert)
        .select();

      if (selectionsError) throw selectionsError;
      if (!newSelections) throw new Error("Kon selecties niet aanmaken");

      // Build a map from new selection id to template options using INDEX-BASED matching
      // The order of selectionsToInsert and newSelections is guaranteed to be the same
      const templateMap = new Map<string, { 
        selectionId: string; 
        options: TemplateOption[] 
      }>();
      
      newSelections.forEach((selection, idx) => {
        const template = templatesToApply[idx]; // Same order guaranteed by insert
        templateMap.set(selection.id, {
          selectionId: selection.id,
          options: (template.default_options as unknown as TemplateOption[]) || [],
        });
      });

      // BATCH 2: Collect all options and insert at once
      const allOptionsToInsert: Array<{
        selection_id: string;
        name: string;
        description: string | null;
        color_code: string | null;
        brand: string | null;
        product_code: string | null;
        price: number | null;
        is_default: boolean;
        is_chosen: boolean;
        order_index: number;
      }> = [];

      for (const [selectionId, { options }] of templateMap) {
        options.forEach((opt, index) => {
          allOptionsToInsert.push({
            selection_id: selectionId,
            name: opt.name,
            description: opt.description || null,
            color_code: opt.color_code || null,
            brand: opt.brand || null,
            product_code: opt.product_code || null,
            price: opt.price || null,
            is_default: opt.is_default || false,
            is_chosen: false,
            order_index: opt.order_index ?? index,
          });
        });
      }

      if (allOptionsToInsert.length === 0) {
        return { saleId, count: newSelections.length, skipped };
      }

      const { data: newOptions, error: optionsError } = await supabase
        .from("material_options")
        .insert(allOptionsToInsert)
        .select();

      if (optionsError) throw optionsError;

      // BATCH 3: Collect all images and insert at once
      const allImagesToInsert: Array<{
        option_id: string;
        image_url: string;
        title: string | null;
        is_primary: boolean;
        order_index: number;
      }> = [];

      // Track image insert result for better user feedback
      let imagesInserted = 0;
      let imagesError: string | null = null;

      if (newOptions) {
        // Build a Map for efficient order_index lookup per selection
        const optionPositionMap = new Map<string, Map<number, TemplateOption>>();
        for (const [selectionId, { options }] of templateMap) {
          const positionMap = new Map<number, TemplateOption>();
          options.forEach((opt, idx) => {
            positionMap.set(opt.order_index ?? idx, opt);
          });
          optionPositionMap.set(selectionId, positionMap);
        }

        // Match by selection_id and order_index to get template options
        for (const newOpt of newOptions) {
          const positionMap = optionPositionMap.get(newOpt.selection_id);
          if (!positionMap) continue;

          const templateOpt = positionMap.get(newOpt.order_index);

          if (templateOpt?.images && templateOpt.images.length > 0) {
            templateOpt.images.forEach((img, imgIndex) => {
              allImagesToInsert.push({
                option_id: newOpt.id,
                image_url: img.image_url,
                title: img.title || null,
                is_primary: img.is_primary || false,
                order_index: img.order_index ?? imgIndex,
              });
            });
          }
        }
      }

      if (allImagesToInsert.length > 0) {
        const { error } = await supabase
          .from("material_option_images")
          .insert(allImagesToInsert);

        if (error) {
          console.error("Error inserting template images:", error);
          imagesError = error.message;
        } else {
          imagesInserted = allImagesToInsert.length;
        }
      }

      return { saleId, count: newSelections.length, skipped, imagesInserted, imagesError };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.saleId] });
      
      let message = `${result.count} templates toegepast`;
      if (result.skipped > 0) {
        message += `, ${result.skipped} overgeslagen (bestonden al)`;
      }
      
      if (result.imagesError) {
        toast.warning(message + " (let op: sommige afbeeldingen konden niet worden toegevoegd)");
      } else {
        toast.success(message);
      }
    },
    onError: (error) => {
      toast.error("Fout bij toepassen templates: " + error.message);
    },
  });
}

// Copy materials from another sale - OPTIMIZED with batch inserts
export function useCopyMaterialsFromSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      sourceSaleId, 
      targetSaleId,
      includeChoices = false,
    }: { 
      sourceSaleId: string; 
      targetSaleId: string;
      includeChoices?: boolean;
    }) => {
      // Fetch all selections with options AND images from source sale (1 query)
      const { data: sourceSelections, error: selectionsError } = await supabase
        .from("material_selections")
        .select(`
          *,
          options:material_options(
            *,
            images:material_option_images(*)
          )
        `)
        .eq("sale_id", sourceSaleId)
        .order("order_index", { ascending: true });

      if (selectionsError) throw selectionsError;
      if (!sourceSelections || sourceSelections.length === 0) {
        throw new Error("Geen materialen gevonden in de bronverkoop");
      }

      // Cast to proper type
      const typedSelections = sourceSelections as unknown as SelectionWithOptions[];

      // BATCH 1: Insert all selections at once
      const selectionsToInsert = typedSelections.map(s => ({
        sale_id: targetSaleId,
        category: s.category,
        room: s.room,
        title: s.title,
        description: s.description,
        order_index: s.order_index,
        customer_visible: s.customer_visible,
        notes: s.notes,
        chosen_option_id: null,
        decided_at: null,
        decided_by_name: null,
      }));

      const { data: newSelections, error: newSelectionsError } = await supabase
        .from("material_selections")
        .insert(selectionsToInsert)
        .select();

      if (newSelectionsError) throw newSelectionsError;
      if (!newSelections) throw new Error("Kon selecties niet aanmaken");

      // Build mapping: source selection index -> new selection id (order preserved)
      const selectionIdMap = new Map<string, string>();
      typedSelections.forEach((source, idx) => {
        selectionIdMap.set(source.id, newSelections[idx].id);
      });

      // BATCH 2: Collect all options and insert at once
      // Use the module-level OptionInsertTracker interface
      const optionIndexMap: OptionInsertTracker[] = [];
      const allOptionsToInsert: Array<{
        selection_id: string;
        name: string;
        description: string | null;
        color_code: string | null;
        brand: string | null;
        product_code: string | null;
        price: number | null;
        is_default: boolean;
        is_chosen: boolean;
        order_index: number;
      }> = [];

      typedSelections.forEach(source => {
        const newSelectionId = selectionIdMap.get(source.id);
        if (!newSelectionId) return;

        source.options?.forEach(opt => {
          optionIndexMap.push({
            sourceOptId: opt.id,
            insertIndex: allOptionsToInsert.length,
          });
          allOptionsToInsert.push({
            selection_id: newSelectionId,
            name: opt.name,
            description: opt.description,
            color_code: opt.color_code,
            brand: opt.brand,
            product_code: opt.product_code,
            price: opt.price,
            is_default: opt.is_default,
            is_chosen: includeChoices ? opt.is_chosen : false,
            order_index: opt.order_index,
          });
        });
      });

      let newOptions: Array<{ id: string; name: string }> | null = null;
      if (allOptionsToInsert.length > 0) {
        const { data: optionsResult, error: optionsError } = await supabase
          .from("material_options")
          .insert(allOptionsToInsert)
          .select("id, name");

        if (optionsError) throw optionsError;
        newOptions = optionsResult;
      }

      // Build mapping: source option id -> new option id (via insertIndex)
      const optionIdMap = new Map<string, string>();
      if (newOptions) {
        optionIndexMap.forEach(({ sourceOptId, insertIndex }) => {
          if (newOptions![insertIndex]) {
            optionIdMap.set(sourceOptId, newOptions![insertIndex].id);
          }
        });
      }

      // BATCH 3: Collect all images and insert at once
      const allImagesToInsert: Array<{
        option_id: string;
        image_url: string;
        title: string | null;
        is_primary: boolean;
        order_index: number;
      }> = [];

      typedSelections.forEach(source => {
        source.options?.forEach(opt => {
          const newOptId = optionIdMap.get(opt.id);
          if (!newOptId) return;

          opt.images?.forEach(img => {
            allImagesToInsert.push({
              option_id: newOptId,
              image_url: img.image_url,
              title: img.title,           // FIX: now included
              is_primary: img.is_primary || false,
              order_index: img.order_index, // FIX: now included
            });
          });
        });
      });

      // Track image insert result for better user feedback
      let imagesInserted = 0;
      let imagesErrorMessage: string | null = null;

      if (allImagesToInsert.length > 0) {
        const { error: imagesError } = await supabase
          .from("material_option_images")
          .insert(allImagesToInsert);

        if (imagesError) {
          console.error("Error copying images:", imagesError);
          imagesErrorMessage = imagesError.message;
          // Don't throw - selections and options are created successfully
        } else {
          imagesInserted = allImagesToInsert.length;
        }
      }

      // Handle chosen options if includeChoices is true
      if (includeChoices) {
        const chosenUpdates: Array<{
          selectionId: string;
          chosenOptId: string;
          decided_at: string | null;
          decided_by_name: string | null;
        }> = [];

        typedSelections.forEach(source => {
          if (!source.chosen_option_id) return;
          
          const newSelectionId = selectionIdMap.get(source.id);
          const newChosenOptId = optionIdMap.get(source.chosen_option_id);
          
          if (newSelectionId && newChosenOptId) {
            chosenUpdates.push({
              selectionId: newSelectionId,
              chosenOptId: newChosenOptId,
              decided_at: source.decided_at,
              decided_by_name: source.decided_by_name,
            });
          }
        });

        // Update chosen options in parallel
        if (chosenUpdates.length > 0) {
          await Promise.all(
            chosenUpdates.map(update =>
              supabase
                .from("material_selections")
                .update({
                  chosen_option_id: update.chosenOptId,
                  decided_at: update.decided_at,
                  decided_by_name: update.decided_by_name,
                })
                .eq("id", update.selectionId)
            )
          );
        }
      }

      return { 
        targetSaleId, 
        count: typedSelections.length,
        imagesInserted,
        imagesError: imagesErrorMessage,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-selections", result.targetSaleId] });
      
      const message = `${result.count} materiaalkeuzes gekopieerd`;
      
      if (result.imagesError) {
        toast.warning(message + " (let op: sommige afbeeldingen konden niet worden toegevoegd)");
      } else {
        toast.success(message);
      }
    },
    onError: (error) => {
      toast.error("Fout bij kopiëren: " + error.message);
    },
  });
}

// Fetch available sales for copying (same project)
export function useAvailableSalesForCopy(saleId: string, projectId: string | undefined) {
  return useQuery({
    queryKey: ["available-sales-for-copy", projectId, saleId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          property_description,
          customers:sale_customers(
            customer:crm_leads(first_name, last_name)
          )
        `)
        .eq("project_id", projectId)
        .neq("id", saleId)
        .order("property_description", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!saleId,
  });
}

// Export selections to templates (with upsert - updates existing templates) - OPTIMIZED
export function useExportSelectionsToTemplates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      projectId 
    }: { 
      saleId: string; 
      projectId: string;
    }) => {
      // PARALLEL FETCHES: Execute both queries simultaneously
      const [existingTemplatesResult, selectionsResult] = await Promise.all([
        supabase
          .from("material_templates")
          .select("id, title, room")
          .eq("project_id", projectId),
        supabase
          .from("material_selections")
          .select(`
            *,
            options:material_options!material_options_selection_id_fkey(
              *,
              images:material_option_images(*)
            )
          `)
          .eq("sale_id", saleId)
          .order("order_index", { ascending: true }),
      ]);

      if (selectionsResult.error) throw selectionsResult.error;
      if (!selectionsResult.data || selectionsResult.data.length === 0) {
        throw new Error("Geen materiaalselecties gevonden");
      }
      
      const existingTemplates = existingTemplatesResult.data;
      const selections = selectionsResult.data;
      
      const existingTemplateMap = new Map(
        existingTemplates?.map(t => [`${t.title}||${t.room || ''}`, t.id]) || []
      );

      // Separate into inserts and updates
      const inserts: Array<{
        project_id: string;
        category: string;
        room: string | null;
        title: string;
        description: string | null;
        default_options: Json | null;
        order_index: number;
        is_active: boolean;
      }> = [];
      
      const updates: Array<{
        id: string;
        data: {
          category: string;
          description: string | null;
          default_options: Json | null;
          order_index: number;
          is_active: boolean;
        };
      }> = [];

      for (const selection of selections) {
        // Build default_options with images using the helper function
        const sourceOptions = (selection as unknown as SelectionWithOptions).options || [];
        const defaultOptions = buildTemplateOptionsFromSource(sourceOptions);

        const key = `${selection.title}||${selection.room || ''}`;
        const existingId = existingTemplateMap.get(key);

        if (existingId) {
          // Queue for update
          updates.push({
            id: existingId,
            data: {
              category: selection.category,
              description: selection.description,
              default_options: optionsToJson(defaultOptions),
              order_index: selection.order_index,
              is_active: true,
            },
          });
        } else {
          // Queue for insert
          inserts.push({
            project_id: projectId,
            category: selection.category,
            room: selection.room,
            title: selection.title,
            description: selection.description,
            default_options: optionsToJson(defaultOptions),
            order_index: selection.order_index,
            is_active: true,
          });
        }
      }

      // BATCH INSERT new templates in one query
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from("material_templates")
          .insert(inserts);
        if (insertError) throw insertError;
      }

      // PARALLEL UPDATES via Promise.all
      if (updates.length > 0) {
        await Promise.all(
          updates.map(u =>
            supabase
              .from("material_templates")
              .update(u.data)
              .eq("id", u.id)
          )
        );
      }

      return { projectId, created: inserts.length, updated: updates.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-templates", result.projectId] });
      const parts: string[] = [];
      if (result.created > 0) parts.push(`${result.created} templates aangemaakt`);
      if (result.updated > 0) parts.push(`${result.updated} templates bijgewerkt`);
      toast.success(parts.join(", ") || "Templates gesynchroniseerd");
    },
    onError: (error) => {
      toast.error("Fout bij exporteren: " + error.message);
    },
  });
}

/**
 * Sync templates from the most recent selections across all sales in the project.
 * This updates existing templates with the latest options and images.
 * Uses hash-comparison to avoid unnecessary database writes.
 */
export function useSyncTemplatesFromSelections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      // PARALLEL FETCHES: Get templates (with current default_options) AND selections
      const [templatesResult, selectionsResult] = await Promise.all([
        supabase
          .from("material_templates")
          .select("id, title, room, category, default_options")
          .eq("project_id", projectId),
        supabase
          .from("material_selections")
          .select(`
            id, sale_id, title, room, category, updated_at,
            sale:sales!inner(project_id),
            options:material_options!material_options_selection_id_fkey(
              id, name, description, color_code, brand, product_code, price, is_default, order_index,
              images:material_option_images(*)
            )
          `)
          .eq("sale.project_id", projectId),
      ]);

      if (templatesResult.error) throw templatesResult.error;
      if (selectionsResult.error) throw selectionsResult.error;

      const templates = templatesResult.data;
      const allSelections = selectionsResult.data;

      if (!templates || templates.length === 0) {
        throw new Error("Geen templates gevonden om te synchroniseren");
      }

      let updated = 0;
      let skipped = 0;

      // Collect all updates first, then execute in parallel
      const updatePromises: Array<{
        id: string;
        defaultOptions: TemplateOption[];
        category: string;
      }> = [];

      for (const template of templates) {
        // Find the most recent selection matching this template
        const matchingSelections = allSelections?.filter(
          s => s.title === template.title && (s.room || null) === (template.room || null)
        ) || [];

        if (matchingSelections.length === 0) {
          skipped++;
          continue;
        }

        // Sort by updated_at descending to get the most recent
        const mostRecent = matchingSelections.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0];

        const sourceOptions = (mostRecent as unknown as SelectionWithOptions).options || [];

        if (sourceOptions.length === 0) {
          skipped++;
          continue;
        }

        // Build clean default_options using the helper function
        const defaultOptions = buildTemplateOptionsFromSource(sourceOptions);

        // Hash comparison: only update if data actually changed
        const currentHash = JSON.stringify(template.default_options || []);
        const newHash = JSON.stringify(defaultOptions);

        if (currentHash === newHash && template.category === mostRecent.category) {
          // No changes detected, skip this update
          skipped++;
          continue;
        }

        updatePromises.push({
          id: template.id,
          defaultOptions,
          category: mostRecent.category,
        });
      }

      // Execute all updates in parallel
      if (updatePromises.length > 0) {
        await Promise.all(
          updatePromises.map(u =>
            supabase
              .from("material_templates")
              .update({
                default_options: optionsToJson(u.defaultOptions),
                category: u.category,
              })
              .eq("id", u.id)
          )
        );
        updated = updatePromises.length;
      }

      return { projectId, updated, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-templates", result.projectId] });
      if (result.updated === 0) {
        toast.info(`Geen templates bijgewerkt. ${result.skipped} templates hadden geen matching selecties.`);
      } else {
        toast.success(`${result.updated} templates gesynchroniseerd met laatste selecties`);
      }
    },
    onError: (error) => {
      toast.error("Fout bij synchroniseren: " + error.message);
    },
  });
}
