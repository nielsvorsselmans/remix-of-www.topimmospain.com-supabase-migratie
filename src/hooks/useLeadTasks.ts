import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadTask {
  id: string;
  crm_lead_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadTasks(crmLeadId?: string) {
  return useQuery({
    queryKey: ["lead-tasks", crmLeadId],
    enabled: !!crmLeadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("*")
        .eq("crm_lead_id", crmLeadId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as LeadTask[];
    },
  });
}

export function useLeadTaskCounts(leadIds: string[]) {
  return useQuery({
    queryKey: ["lead-task-counts", leadIds],
    enabled: leadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_tasks")
        .select("crm_lead_id, completed_at")
        .in("crm_lead_id", leadIds);

      if (error) throw error;

      const counts = new Map<string, { open: number; total: number }>();
      data?.forEach((t) => {
        const existing = counts.get(t.crm_lead_id) || { open: 0, total: 0 };
        existing.total++;
        if (!t.completed_at) existing.open++;
        counts.set(t.crm_lead_id, existing);
      });
      return counts;
    },
  });
}

export function useCreateLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: { crm_lead_id: string; title: string; description?: string; due_date?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("lead_tasks")
        .insert({
          crm_lead_id: task.crm_lead_id,
          title: task.title,
          description: task.description || null,
          due_date: task.due_date || null,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lead-task-counts"] });
      toast.success("Taak aangemaakt");
    },
    onError: () => toast.error("Kon taak niet aanmaken"),
  });
}

export function useToggleLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from("lead_tasks")
        .update({
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lead-task-counts"] });
    },
    onError: () => toast.error("Kon taak niet bijwerken"),
  });
}

export function useDeleteLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("lead_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["lead-task-counts"] });
      toast.success("Taak verwijderd");
    },
    onError: () => toast.error("Kon taak niet verwijderen"),
  });
}
