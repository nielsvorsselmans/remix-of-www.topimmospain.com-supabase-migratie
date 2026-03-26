import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GeneratedSummary {
  headline: string;
  summaryShort: string;
  summaryFull: string;
  category: string;
  clientPseudonym: string;
  keyTopics: string[];
}

interface GenerateSummaryInput {
  notes: string;
  appointmentTitle: string;
}

export function useGenerateSummary() {
  return useMutation({
    mutationFn: async (input: GenerateSummaryInput): Promise<GeneratedSummary> => {
      const { data, error } = await supabase.functions.invoke('generate-summary', {
        body: {
          notes: input.notes,
          appointmentTitle: input.appointmentTitle,
        },
      });

      if (error) {
        console.error('Error generating summary:', error);
        throw new Error(error.message || 'Failed to generate summary');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as GeneratedSummary;
    },
  });
}
