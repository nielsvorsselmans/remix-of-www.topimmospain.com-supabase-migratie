import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentQuestion {
  id: string;
  question: string;
  search_intent: string;
  frequency: number | null;
  buyer_phases: string[] | null;
  source_insight_ids: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  search_volume_hint: string | null;
  answer_count: number;
  source_count: number;
  best_answer: string | null;
  best_confidence: number | null;
  all_answers: string[];
  has_blog: boolean;
  insight_theme: string | null;
}

export function useContentQuestions() {
  return useQuery({
    queryKey: ["content-questions-board"],
    queryFn: async () => {
      // Fetch all content questions
      const { data: questions, error } = await supabase
        .from("content_questions")
        .select("*")
        .order("frequency", { ascending: false });

      if (error) throw error;

      // Fetch all question_answers
      const { data: answers } = await (supabase as any)
        .from("question_answers")
        .select("content_question_id, answer_fragment, confidence, conversation_id")
        .order("confidence", { ascending: false });

      // Fetch blog posts with source_question_id to check coverage via direct relation
      const { data: blogPosts } = await supabase
        .from("blog_posts")
        .select("source_question_id")
        .not("source_question_id", "is", null);

      // Fetch insights to get themes for linked questions
      const { data: allInsights } = await supabase
        .from("insights")
        .select("id, theme");

      const insightThemeMap = new Map<string, string>();
      for (const ins of (allInsights || [])) {
        if (ins.theme) insightThemeMap.set(ins.id, ins.theme);
      }

      // Build set of question IDs that have a blog
      const questionIdsWithBlog = new Set(
        (blogPosts || []).map((b: any) => b.source_question_id).filter(Boolean)
      );

      // Build answer map
      const answerMap = new Map<string, { count: number; best: string; bestConf: number; sources: Set<string>; allFragments: string[] }>();
      for (const a of (answers || [])) {
        const qid = a.content_question_id;
        if (!answerMap.has(qid)) {
          answerMap.set(qid, { count: 0, best: a.answer_fragment, bestConf: a.confidence, sources: new Set(), allFragments: [] });
        }
        const entry = answerMap.get(qid)!;
        entry.count++;
        entry.allFragments.push(a.answer_fragment);
        if (a.conversation_id) entry.sources.add(a.conversation_id);
        if (a.confidence > entry.bestConf) {
          entry.best = a.answer_fragment;
          entry.bestConf = a.confidence;
        }
      }

      return (questions || []).map((q: any): ContentQuestion => {
        const answerData = answerMap.get(q.id);

        // Get theme from first linked insight that has one
        let insightTheme: string | null = null;
        for (const id of (q.source_insight_ids || [])) {
          const theme = insightThemeMap.get(id);
          if (theme) { insightTheme = theme; break; }
        }

        return {
          id: q.id,
          question: q.question,
          search_intent: q.search_intent || "INFORMATIONAL",
          frequency: q.frequency,
          buyer_phases: q.buyer_phases,
          source_insight_ids: q.source_insight_ids,
          created_at: q.created_at,
          updated_at: q.updated_at,
          search_volume_hint: q.search_volume_hint || null,
          answer_count: answerData?.count || 0,
          source_count: answerData?.sources.size || 0,
          best_answer: answerData?.best || null,
          best_confidence: answerData?.bestConf || null,
          all_answers: answerData?.allFragments || [],
          has_blog: questionIdsWithBlog.has(q.id),
          insight_theme: insightTheme,
        };
      });
    },
  });
}
