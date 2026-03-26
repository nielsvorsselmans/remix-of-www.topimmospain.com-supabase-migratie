import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WeeklyPlanItem {
  suggested_day: string;
  title: string;
  keyword: string;
  category: string;
  search_volume?: number;
  priority_reason: string;
  source_question?: string;
  linkedin_archetype?: "engagement" | "authority" | "educational";
}

export interface ContentGap {
  category: string;
  description: string;
  missing_count?: number;
  opportunity_score: number;
}

export interface RefreshCandidate {
  blog_id?: string;
  title: string;
  reasons: string[];
  suggested_action: string;
}

export interface WeeklyReportData {
  weekly_plan: WeeklyPlanItem[];
  content_gaps: ContentGap[];
  refresh_candidates: RefreshCandidate[];
  cmo_feedback: string;
  articles_created?: number;
  errors?: string[];
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  report_data: WeeklyReportData;
  status: string;
  created_at: string;
  updated_at: string;
  is_stale?: boolean;
}

export function useWeeklyReports() {
  return useQuery({
    queryKey: ["weekly-reports"],
    queryFn: async (): Promise<WeeklyReport[]> => {
      const { data, error } = await (supabase as any)
        .from("weekly_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      
      // Mark stale reports (generating > 15 min)
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      return (data || []).map((r: WeeklyReport) => ({
        ...r,
        is_stale: r.status === "generating" && r.updated_at < fifteenMinAgo,
      }));
    },
    refetchInterval: (query) => {
      const reports = query.state.data as WeeklyReport[] | undefined;
      const hasGenerating = reports?.some((r) => r.status === "generating");
      return hasGenerating ? 10_000 : false;
    },
  });
}

export function useAllWeeklyReports() {
  return useQuery({
    queryKey: ["weekly-reports-all"],
    queryFn: async (): Promise<WeeklyReport[]> => {
      const { data, error } = await (supabase as any)
        .from("weekly_reports")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useGenerateWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-cmo-weekly-report", {
        body: { action: "generate" },
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data as WeeklyReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
      toast.success("Weekrapport gegenereerd!");
    },
    onError: (error: Error) => {
      if (error.message.includes("Rate limit")) {
        toast.error("Rate limit bereikt, probeer het later opnieuw.");
      } else if (error.message.includes("credits")) {
        toast.error("AI credits op. Voeg credits toe in Settings.");
      } else {
        toast.error(`Fout bij genereren: ${error.message}`);
      }
    },
  });
}

export function useApproveWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.functions.invoke("ai-cmo-weekly-report", {
        body: { action: "approve", report_id: reportId },
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data as WeeklyReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
      toast.success("Plan goedgekeurd! Artikelen worden op de achtergrond geschreven.");
    },
    onError: (error: Error) => {
      toast.error(`Fout bij goedkeuren: ${error.message}`);
    },
  });
}

export function useResetWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data: current, error: fetchError } = await (supabase as any)
        .from("weekly_reports")
        .select("report_data")
        .eq("id", reportId)
        .single();
      if (fetchError) throw new Error(fetchError.message);

      const updatedData = {
        ...current.report_data,
        articles_created: 0,
        errors: [],
        completed_indices: [],
      };

      const { error } = await (supabase as any)
        .from("weekly_reports")
        .update({ status: "draft", report_data: updatedData, updated_at: new Date().toISOString() })
        .eq("id", reportId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
      toast.success("Rapport teruggezet naar concept. Je kunt nu opnieuw goedkeuren.");
    },
    onError: (error: Error) => {
      toast.error(`Fout bij resetten: ${error.message}`);
    },
  });
}

export function useRetryWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.functions.invoke("ai-cmo-weekly-report", {
        body: { action: "retry", report_id: reportId },
      });
      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data as WeeklyReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
      toast.success("Generatie herstart! Resterende artikelen worden geschreven.");
    },
    onError: (error: Error) => {
      toast.error(`Fout bij herstarten: ${error.message}`);
    },
  });
}
