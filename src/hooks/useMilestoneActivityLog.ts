import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ActivityLogEntry {
  id: string;
  milestone_id: string;
  actor_id: string | null;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  created_at: string;
  actor?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export function useMilestoneActivityLog(milestoneId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["milestone-activity-log", milestoneId],
    enabled: !!milestoneId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_milestone_activity_log")
        .select(`
          id,
          milestone_id,
          actor_id,
          action_type,
          old_value,
          new_value,
          note,
          created_at,
          profiles:actor_id (first_name, last_name, email)
        `)
        .eq("milestone_id", milestoneId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((entry: any) => ({
        ...entry,
        actor: entry.profiles,
      })) as ActivityLogEntry[];
    },
  });

  const addNote = useMutation({
    mutationFn: async ({ milestoneId, note }: { milestoneId: string; note: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      const { error } = await supabase
        .from("sale_milestone_activity_log")
        .insert({
          milestone_id: milestoneId,
          actor_id: user.id,
          action_type: "note_added",
          note,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["milestone-activity-log", variables.milestoneId] });
      queryClient.invalidateQueries({ queryKey: ["milestone-activity-counts"] });
      toast.success("Notitie toegevoegd");
    },
    onError: () => {
      toast.error("Fout bij toevoegen notitie");
    },
  });

  return { ...query, addNote };
}

/** Fetches activity counts for multiple milestones (for badge indicators) */
export function useMilestoneActivityCounts(milestoneIds: string[]) {
  return useQuery({
    queryKey: ["milestone-activity-counts", milestoneIds],
    enabled: milestoneIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get counts of notes and recent activity per milestone
      const { data, error } = await supabase
        .from("sale_milestone_activity_log")
        .select("milestone_id, action_type, created_at")
        .in("milestone_id", milestoneIds);

      if (error) throw error;

      const counts: Record<string, { hasNotes: boolean; recentCount: number }> = {};
      for (const entry of data || []) {
        if (!counts[entry.milestone_id]) {
          counts[entry.milestone_id] = { hasNotes: false, recentCount: 0 };
        }
        if (entry.action_type === "note_added") {
          counts[entry.milestone_id].hasNotes = true;
        }
        if (entry.created_at >= oneDayAgo) {
          counts[entry.milestone_id].recentCount++;
        }
      }
      return counts;
    },
  });
}
