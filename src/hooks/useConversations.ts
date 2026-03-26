import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  raw_notes: string;
  anonymized_notes: string | null;
  source_type: string;
  source_id: string | null;
  crm_lead_id: string | null;
  sentiment: string | null;
  processed: boolean | null;
  processing_error: string | null;
  buyer_phase: string | null;
  conversation_richness: number | null;
  created_at: string | null;
  crm_leads?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          crm_leads (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
  });
}

export function useProcessConversations() {
  const processConversations = async () => {
    const { data, error } = await supabase.functions.invoke('analyze-conversation');
    
    if (error) {
      throw error;
    }
    
    return data;
  };

  return { processConversations };
}

export function useAnalyzeSingleConversation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.functions.invoke('analyze-conversation', {
        body: { conversationId }
      });
      
      if (error) {
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  return {
    analyzeSingle: mutation.mutateAsync,
    isAnalyzing: mutation.isPending,
  };
}

export function useAnalysisPrompt() {
  return useQuery({
    queryKey: ['analysis-prompt'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('prompt_key', 'analyze_conversation')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });
}

export function useUpdateAnalysisPrompt() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (promptText: string) => {
      const { data: existing } = await supabase
        .from('ai_prompts')
        .select('id')
        .eq('prompt_key', 'analyze_conversation')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('ai_prompts')
          .update({ 
            prompt_text: promptText,
            updated_at: new Date().toISOString()
          })
          .eq('prompt_key', 'analyze_conversation');
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_prompts')
          .insert({
            prompt_key: 'analyze_conversation',
            prompt_text: promptText,
            description: 'Prompt voor het analyseren van klantgesprekken.'
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-prompt'] });
    },
  });

  return {
    updatePrompt: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
