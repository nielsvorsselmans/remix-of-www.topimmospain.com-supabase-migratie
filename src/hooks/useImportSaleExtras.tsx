import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaleExtraCategory } from "./useSaleExtras";

interface OtherSaleExtras {
  saleId: string;
  propertyDescription: string;
  categories: SaleExtraCategory[];
}

// Fetch extras from other sales in the same project
export function useOtherSaleExtras(projectId: string | undefined, currentSaleId: string | undefined) {
  return useQuery({
    queryKey: ['other-sale-extras-for-import', projectId, currentSaleId],
    queryFn: async (): Promise<OtherSaleExtras[]> => {
      if (!projectId || !currentSaleId) return [];

      // First get all sales for this project except current sale
      const { data: otherSales, error: salesError } = await supabase
        .from('sales')
        .select('id, property_description')
        .eq('project_id', projectId)
        .neq('id', currentSaleId);

      if (salesError) throw salesError;
      if (!otherSales?.length) return [];

      const saleIds = otherSales.map(s => s.id);

      // Fetch categories from these sales
      const { data: categories, error: catError } = await supabase
        .from('sale_extra_categories')
        .select('*')
        .in('sale_id', saleIds)
        .order('order_index', { ascending: true });

      if (catError) throw catError;
      if (!categories?.length) return [];

      // Fetch options for all categories
      const categoryIds = categories.map(c => c.id);
      const { data: options, error: optError } = await supabase
        .from('sale_extra_options')
        .select('*')
        .in('category_id', categoryIds)
        .order('order_index', { ascending: true });

      if (optError) throw optError;

      // Fetch attachments for all options
      let attachments: any[] = [];
      if (options && options.length > 0) {
        const optionIds = options.map(o => o.id);
        const { data: attachData, error: attError } = await supabase
          .from('sale_extra_attachments')
          .select('*')
          .in('option_id', optionIds);

        if (attError) throw attError;
        attachments = attachData || [];
      }

      // Map attachments to options
      const optionsWithAttachments = (options || []).map(opt => ({
        ...opt,
        attachments: attachments.filter(a => a.option_id === opt.id)
      }));

      // Map options to categories
      const categoriesWithOptions = categories.map(cat => ({
        ...cat,
        status: cat.status as 'pending' | 'decided',
        options: optionsWithAttachments.filter(o => o.category_id === cat.id)
      })) as SaleExtraCategory[];

      // Group by sale
      return otherSales.map(sale => ({
        saleId: sale.id,
        propertyDescription: sale.property_description || 'Andere verkoop',
        categories: categoriesWithOptions.filter(c => c.sale_id === sale.id)
      })).filter(s => s.categories.length > 0);
    },
    enabled: !!projectId && !!currentSaleId,
  });
}

// Import extras from other sales
export function useImportSaleExtras() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetSaleId,
      categories,
      existingCategoryNames,
    }: {
      targetSaleId: string;
      categories: SaleExtraCategory[];
      existingCategoryNames: string[];
    }) => {
      let importedCount = 0;
      let skippedCount = 0;

      for (const category of categories) {
        // Skip if category with same name already exists
        if (existingCategoryNames.includes(category.name.toLowerCase())) {
          skippedCount++;
          continue;
        }

        // Create new category
        const { data: newCategory, error: catError } = await supabase
          .from('sale_extra_categories')
          .insert({
            sale_id: targetSaleId,
            name: category.name,
            description: category.description,
            is_included: false, // Reset status for new sale
            gifted_by_tis: false,
            is_optional_category: category.is_optional_category,
            via_developer: category.via_developer,
            status: 'pending',
            chosen_option_id: null,
            decided_at: null,
            notes: null,
            order_index: category.order_index,
            customer_visible: category.customer_visible,
          })
          .select()
          .single();

        if (catError) throw catError;

        // Import options
        if (category.options && category.options.length > 0) {
          for (const option of category.options) {
            const { data: newOption, error: optError } = await supabase
              .from('sale_extra_options')
              .insert({
                category_id: newCategory.id,
                name: option.name,
                price: option.price,
                description: option.description,
                order_index: option.order_index,
                highlights: option.highlights,
                image_url: option.image_url,
                is_recommended: option.is_recommended,
                detailed_specs: option.detailed_specs,
              })
              .select()
              .single();

            if (optError) throw optError;

            // Import attachments (reuse file_url)
            if (option.attachments && option.attachments.length > 0) {
              const attachmentsToInsert = option.attachments.map(att => ({
                option_id: newOption.id,
                file_name: att.file_name,
                file_path: att.file_path,
                file_url: att.file_url, // Reuse existing file URL
                title: att.title,
                file_size: att.file_size,
              }));

              const { error: attError } = await supabase
                .from('sale_extra_attachments')
                .insert(attachmentsToInsert);

              if (attError) throw attError;
            }
          }
        }

        importedCount++;
      }

      return { targetSaleId, importedCount, skippedCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sale-extras', data.targetSaleId] });
      
      let message = `${data.importedCount} categorie${data.importedCount !== 1 ? 'ën' : ''} geïmporteerd`;
      if (data.skippedCount > 0) {
        message += ` (${data.skippedCount} overgeslagen wegens duplicaat)`;
      }
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(`Fout bij importeren: ${error.message}`);
    },
  });
}
