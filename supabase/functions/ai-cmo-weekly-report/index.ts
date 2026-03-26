import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const reqBody = await req.json();
    const { action } = reqBody;

    // Internal call from fire-and-forget: skip user auth, validate service key
    const token = authHeader.replace("Bearer ", "");
    const isInternalCall = (action === "process-articles" || action === "process-single-article") && token === serviceKey;

    if (!isInternalCall) {
      // Admin auth check for all other actions
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error("Unauthorized");

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      if (!roleData) throw new Error("Admin only");
    }

    if (action === "generate") {
      // Step 1: Collect all data in parallel
      const [
        questionsResult,
        blogsResult,
        briefingsResult,
        seoResult,
        socialResult,
        feedbackResult,
        insightsResult,
      ] = await Promise.all([
        supabase.from("content_questions").select("id, question, search_intent, frequency, buyer_phases, search_volume_hint").order("frequency", { ascending: false }).limit(50),
        supabase.from("blog_posts").select("id, title, slug, category, published, published_at, meta_description, meta_keywords, seo_bullets, created_at, updated_at, source_question_id").order("created_at", { ascending: false }),
        supabase.from("content_briefings").select("id, status, source_text, category, source_question_id, source_insight_id, created_at"),
        supabase.from("seo_keyword_cache").select("keyword, search_volume, competition_level"),
        supabase.from("social_posts").select("id, content, platform, status, likes, comments, impressions").eq("status", "published").order("created_at", { ascending: false }).limit(30),
        supabase.from("blog_feedback").select("blog_post_id, was_helpful, missing_info, suggested_topics, rating"),
        supabase.from("insights").select("id, theme, icp_score, icp_validated").eq("icp_validated", true).order("icp_score", { ascending: false }).limit(30),
      ]);

      const questions = questionsResult.data || [];
      const blogs = blogsResult.data || [];
      const briefings = briefingsResult.data || [];
      const seoCache = seoResult.data || [];
      const socialPosts = socialResult.data || [];
      const feedback = feedbackResult.data || [];
      const insights = insightsResult.data || [];

      // Step 2: Analyse gaps
      const publishedBlogs = blogs.filter((b: any) => b.published);
      const blogCategories = new Map<string, number>();
      for (const b of publishedBlogs) {
        blogCategories.set(b.category, (blogCategories.get(b.category) || 0) + 1);
      }

      const questionIdsWithBlog = new Set(
        publishedBlogs.map((b: any) => b.source_question_id).filter(Boolean)
      );
      const uncoveredQuestions = questions.filter((q: any) => !questionIdsWithBlog.has(q.id));

      // SEO map
      const seoMap = new Map<string, any>();
      for (const s of seoCache) {
        seoMap.set(s.keyword.toLowerCase(), s);
      }

      // Step 2b: Bulk SEO lookup for uncovered questions not in cache
      const uncoveredKeywords = uncoveredQuestions
        .slice(0, 20)
        .map((q: any) => q.question.toLowerCase().split(" ").slice(0, 4).join(" "))
        .filter((kw: string) => !seoMap.has(kw));

      if (uncoveredKeywords.length > 0) {
        const batchSize = 5;
        for (let i = 0; i < uncoveredKeywords.length; i += batchSize) {
          const batch = uncoveredKeywords.slice(i, i + batchSize);
          const results = await Promise.allSettled(
            batch.map((keyword: string) =>
              fetch(`${supabaseUrl}/functions/v1/seo-keyword-research`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${serviceKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ keyword, language_code: "nl", location_code: 2528, include_serp: false }),
              }).then((r) => r.json())
            )
          );
          for (const result of results) {
            if (result.status === "fulfilled" && result.value?.keyword_data) {
              const kd = result.value.keyword_data;
              seoMap.set(kd.keyword.toLowerCase(), {
                keyword: kd.keyword,
                search_volume: kd.search_volume,
                competition_level: kd.competition_level,
              });
            }
          }
        }
        console.log(`SEO bulk lookup: ${uncoveredKeywords.length} keywords checked, ${seoMap.size} total in cache`);
      }

      // Feedback map
      const feedbackMap = new Map<string, any[]>();
      for (const f of feedback) {
        if (!feedbackMap.has(f.blog_post_id)) feedbackMap.set(f.blog_post_id, []);
        feedbackMap.get(f.blog_post_id)!.push(f);
      }

      // Ready briefings (not yet article)
      const readyBriefings = briefings.filter((b: any) => b.status === "briefing_done" || b.status === "article_done");

      // Old posts (>6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const oldPosts = publishedBlogs.filter((b: any) => new Date(b.published_at || b.created_at) < sixMonthsAgo);

      // Posts without meta
      const postsWithoutMeta = publishedBlogs.filter((b: any) => !b.meta_description || b.meta_description.length < 50);

      // Step 3: Build context for AI
      const contextData = {
        uncovered_questions: uncoveredQuestions.slice(0, 20).map((q: any) => ({
          question: q.question,
          frequency: q.frequency,
          intent: q.search_intent,
          volume_hint: q.search_volume_hint,
          seo: seoMap.get(q.question.toLowerCase().split(" ").slice(0, 4).join(" ")) || null,
        })),
        blog_category_counts: Object.fromEntries(blogCategories),
        total_published: publishedBlogs.length,
        total_questions: questions.length,
        ready_briefings: readyBriefings.slice(0, 10).map((b: any) => ({
          source_text: b.source_text.slice(0, 100),
          category: b.category,
          status: b.status,
        })),
        old_posts: oldPosts.slice(0, 10).map((b: any) => ({
          id: b.id,
          title: b.title,
          category: b.category,
          published_at: b.published_at,
          has_meta: !!b.meta_description && b.meta_description.length > 50,
          feedback_count: feedbackMap.get(b.id)?.length || 0,
          negative_feedback: feedbackMap.get(b.id)?.filter((f: any) => f.was_helpful === false).length || 0,
        })),
        posts_without_meta: postsWithoutMeta.slice(0, 5).map((b: any) => ({
          id: b.id,
          title: b.title,
          category: b.category,
        })),
        top_social_engagement: socialPosts.slice(0, 10).map((p: any) => ({
          content: (p.content || "").slice(0, 80),
          platform: p.platform,
          likes: p.likes,
          comments: p.comments,
          impressions: p.impressions,
        })),
        insight_themes: insights.slice(0, 10).map((i: any) => ({
          theme: i.theme,
          icp_score: i.icp_score,
        })),
        seo_keywords: seoCache.slice(0, 20).map((s: any) => ({
          keyword: s.keyword,
          volume: s.search_volume,
          competition: s.competition_level,
        })),
      };

      // Step 4: Call Gemini Pro via Lovable AI Gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `Je bent een AI CMO voor Top Immo Spain, een bedrijf dat Nederlandse investeerders begeleidt bij het kopen van vastgoed in Spanje. Je taak is een wekelijks content rapport te maken.

Context:
- Doelgroep: Nederlandse investeerders (35-65 jaar) die overwegen in Spanje te investeren
- Categorieën: financiering, juridisch, regio, rendement, proces, lifestyle, duurzaamheid, belasting
- Tone of voice: adviserend, warm, betrouwbaar — geen harde sales
- Doel: vertrouwen opbouwen, educeren, mensen naar het Portaal leiden

Geef je antwoord als gestructureerde data via de tool.`,
            },
            {
              role: "user",
              content: `Analyseer de volgende content data en maak een wekelijks rapport:

${JSON.stringify(contextData, null, 2)}

Maak een weekplan van 5-7 artikelen voor de komende week, identificeer content gaps, refresh-kandidaten en geef strategische feedback.

BELANGRIJK — LinkedIn archetype-verdeling:
Per artikel moet je een linkedin_archetype kiezen (engagement, authority of educational).
Verdeling per week: minimaal 2x engagement, minimaal 1x educational, minimaal 1x authority.
Bij twijfel tussen archetypes → kies engagement.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_weekly_report",
                description: "Generate a structured weekly content report",
                parameters: {
                  type: "object",
                  properties: {
                    weekly_plan: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          suggested_day: { type: "string", enum: ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"] },
                          title: { type: "string" },
                          keyword: { type: "string" },
                          category: { type: "string" },
                          search_volume: { type: "number" },
                          priority_reason: { type: "string" },
                          source_question: { type: "string" },
                          linkedin_archetype: { type: "string", enum: ["engagement", "authority", "educational"], description: "LinkedIn post archetype. Verdeling per week: minimaal 2x engagement, minimaal 1x educational, minimaal 1x authority. Bij twijfel → engagement." },
                        },
                        required: ["suggested_day", "title", "keyword", "category", "priority_reason", "linkedin_archetype"],
                      },
                    },
                    content_gaps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string" },
                          description: { type: "string" },
                          missing_count: { type: "number" },
                          opportunity_score: { type: "number", description: "Score van 1 tot 10 (geheel getal), waarbij 10 de hoogste prioriteit is" },
                        },
                        required: ["category", "description", "opportunity_score"],
                      },
                    },
                    refresh_candidates: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          blog_id: { type: "string" },
                          title: { type: "string" },
                          reasons: { type: "array", items: { type: "string" } },
                          suggested_action: { type: "string" },
                        },
                        required: ["title", "reasons", "suggested_action"],
                      },
                    },
                    cmo_feedback: { type: "string" },
                  },
                  required: ["weekly_plan", "content_gaps", "refresh_candidates", "cmo_feedback"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_weekly_report" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit bereikt, probeer het later opnieuw." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits op, voeg credits toe in Settings." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No structured response from AI");

      const reportData = JSON.parse(toolCall.function.arguments);

      // Validate archetype distribution: min 2 engagement, 1 educational, 1 authority
      if (reportData.weekly_plan?.length) {
        const items = reportData.weekly_plan;
        const counts: Record<string, number> = { engagement: 0, educational: 0, authority: 0 };
        for (const item of items) {
          if (item.linkedin_archetype && counts[item.linkedin_archetype] !== undefined) {
            counts[item.linkedin_archetype]++;
          }
        }

        const requirements: Record<string, number> = { engagement: 2, educational: 1, authority: 1 };
        for (const [archetype, min] of Object.entries(requirements)) {
          while (counts[archetype] < min) {
            // Find an archetype that has surplus (more than its minimum)
            const donor = Object.keys(requirements).find(
              (a) => a !== archetype && counts[a] > requirements[a]
            );
            if (!donor) break;
            // Find the first item with the donor archetype and reassign
            const itemToReassign = items.find((i: any) => i.linkedin_archetype === donor);
            if (itemToReassign) {
              console.log(`Archetype rebalance: "${itemToReassign.title}" ${donor} → ${archetype}`);
              itemToReassign.linkedin_archetype = archetype;
              counts[donor]--;
              counts[archetype]++;
            } else {
              break;
            }
          }
        }
      }

      // Step 5: Save to database
      const weekStart = getWeekStart();
      const { data: saved, error: saveError } = await supabase
        .from("weekly_reports")
        .insert({
          week_start: weekStart,
          report_data: reportData,
          status: "draft",
        })
        .select()
        .single();

      if (saveError) throw saveError;

      return new Response(JSON.stringify(saved), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const reportId = reqBody.report_id;
      
      const { data: report, error: fetchError } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("id", reportId)
        .single();
      if (fetchError || !report) throw new Error("Report not found");
      
      // Guard: only approve drafts
      if (report.status !== "draft") {
        return new Response(JSON.stringify({ error: `Rapport kan niet goedgekeurd worden (status: ${report.status})` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Immediately mark as generating and return
      await supabase
        .from("weekly_reports")
        .update({ 
          status: "generating", 
          report_data: { ...report.report_data, articles_created: 0, errors: [], completed_indices: [] },
          updated_at: new Date().toISOString() 
        })
        .eq("id", reportId);
      
      // Fire-and-forget: trigger background processing
      const functionUrl = `${supabaseUrl}/functions/v1/ai-cmo-weekly-report`;
      fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "process-articles", report_id: reportId }),
      }).catch((e) => console.error("Fire-and-forget failed:", e));
      
      return new Response(JSON.stringify({ ...report, status: "generating" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "retry") {
      const reportId = reqBody.report_id;
      
      const { data: report, error: fetchError } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("id", reportId)
        .single();
      if (fetchError || !report) throw new Error("Report not found");
      
      // Only allow retry on stale generating, partial, or failed reports
      const allowedStatuses = ["generating", "partial", "failed"];
      if (!allowedStatuses.includes(report.status)) {
        return new Response(JSON.stringify({ error: `Rapport kan niet opnieuw worden gestart (status: ${report.status})` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Reset to generating, keep articles_created and completed_indices, clear errors
      const currentData = report.report_data as any;
      await supabase
        .from("weekly_reports")
        .update({ 
          status: "generating", 
          report_data: { ...currentData, errors: [] },
          updated_at: new Date().toISOString() 
        })
        .eq("id", reportId);
      
      // Fire-and-forget: trigger background processing (orchestrator will skip already-created articles)
      const functionUrl = `${supabaseUrl}/functions/v1/ai-cmo-weekly-report`;
      fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "process-articles", report_id: reportId, is_retry: true }),
      }).catch((e) => console.error("Fire-and-forget retry failed:", e));
      
      return new Response(JSON.stringify({ ...report, status: "generating" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "process-articles") {
      // ORCHESTRATOR: fire-and-forget one call per article, staggered by 2s
      const reportId = reqBody.report_id;
      const isRetry = reqBody.is_retry || false;
      
      const { data: report, error: fetchError } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("id", reportId)
        .single();
      if (fetchError || !report) throw new Error("Report not found");
      
      const reportData = report.report_data as any;
      const weeklyPlan = reportData?.weekly_plan || [];
      const completedIndices: number[] = reportData?.completed_indices || [];
      const totalItems = weeklyPlan.length;
      
      // Build list of items to process: on retry, skip completed indices
      const itemsWithIndex = weeklyPlan
        .map((item: any, idx: number) => ({ item, idx }))
        .filter(({ idx }: { idx: number }) => !isRetry || !completedIndices.includes(idx));
      
      console.log(`Orchestrator: firing ${itemsWithIndex.length} single-article calls for report ${reportId} (retry=${isRetry}, completed=${completedIndices.length})`);
      
      const functionUrl = `${supabaseUrl}/functions/v1/ai-cmo-weekly-report`;
      
      // Stagger calls with 2s delay between each to avoid rate limits
      for (let i = 0; i < itemsWithIndex.length; i++) {
        const { item, idx: actualIndex } = itemsWithIndex[i];
        
        // Wait 2s between calls (not before the first one)
        if (i > 0) {
          await new Promise(r => setTimeout(r, 2000));
        }
        
        fetch(functionUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "process-single-article",
            report_id: reportId,
            item,
            item_index: actualIndex,
            total_items: totalItems,
            week_start: report.week_start,
          }),
        }).catch((e) => console.error(`Fire-and-forget article ${actualIndex} failed:`, e));
      }
      
      return new Response(JSON.stringify({ status: "dispatched", total_items: totalItems, items_fired: itemsWithIndex.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "process-single-article") {
      const { report_id: reportId, item, item_index: itemIndex, total_items: totalItems, week_start: weekStart } = reqBody;
      
      if (!reportId || !item) throw new Error("Missing report_id or item");
      
      console.log(`Processing article ${itemIndex + 1}/${totalItems}: "${item.title}"`);
      
      let success = false;
      let errorMsg = "";
      
      // --- Enrich context: lookup question_id, answer_fragments, existing titles, missing topics ---
      let questionId: string | null = null;
      let answerFragments: string[] = [];
      let existingTitles: string[] = [];
      let missingTopics: string[] = [];

      try {
        if (item.source_question) {
          const { data: questionRow } = await supabase
            .from("content_questions")
            .select("id")
            .eq("question", item.source_question)
            .limit(1)
            .single();
          
          if (questionRow?.id) {
            questionId = questionRow.id;
            const { data: answers } = await (supabase as any)
              .from("question_answers")
              .select("answer_fragment")
              .eq("content_question_id", questionId)
              .order("confidence", { ascending: false })
              .limit(10);
            answerFragments = (answers || []).map((a: any) => a.answer_fragment).filter(Boolean);
          }
        }

        const { data: existingPosts } = await supabase
          .from("blog_posts")
          .select("title")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(100);
        existingTitles = (existingPosts || []).map((p: any) => p.title);

        const { data: feedbackRows } = await supabase
          .from("blog_feedback")
          .select("missing_info, suggested_topics")
          .not("missing_info", "is", null)
          .order("created_at", { ascending: false })
          .limit(50);
        const topicSet = new Set<string>();
        for (const fb of feedbackRows || []) {
          if (fb.missing_info) topicSet.add(fb.missing_info);
          if (fb.suggested_topics) {
            for (const t of fb.suggested_topics) topicSet.add(t);
          }
        }
        missingTopics = Array.from(topicSet).slice(0, 10);
      } catch (contextErr) {
        console.warn("Context enrichment partially failed:", contextErr);
      }

      try {
        const dayIdx = dayOrder.indexOf(item.suggested_day?.toLowerCase());
        const now = new Date();
        const weekStartDate = new Date(weekStart);
        const scheduledDate = new Date(weekStartDate < now ? now : weekStartDate);
        if (weekStartDate < now) {
          // Herschrijf-scenario: plan verspreid over komende dagen vanaf vandaag
          scheduledDate.setDate(now.getDate() + (dayIdx >= 0 ? dayIdx : 0));
        } else {
          if (dayIdx >= 0) scheduledDate.setDate(scheduledDate.getDate() + dayIdx);
        }
        scheduledDate.setUTCHours(7, 0, 0, 0); // 9:00 CET (UTC+2)
        
        // Step 1: Brainstorm (enriched)
        const brainstormBody: Record<string, any> = {
          step: "brainstorm",
          idea: `${item.title} — Keyword: ${item.keyword}. ${item.priority_reason}`,
          category: item.category || "Algemeen",
          source_type: "question",
          custom_instructions: `Dit artikel maakt deel uit van het AI CMO weekplan. Focus keyword: "${item.keyword}". Bronvraag: "${item.source_question || ""}". Reden voor prioriteit: ${item.priority_reason}`,
          context: {
            existing_titles: existingTitles,
            missing_topics: missingTopics,
          },
        };

        if (questionId) {
          brainstormBody.source_data = {
            question_id: questionId,
            question: item.source_question,
            answer_fragments: answerFragments,
          };
        }

        const brainstormRes = await fetch(`${supabaseUrl}/functions/v1/generate-blog-content`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(brainstormBody),
        });
        
        if (!brainstormRes.ok) {
          console.error(`Brainstorm failed for "${item.title}":`, await brainstormRes.text());
          throw new Error(`Brainstorm mislukt: ${item.title}`);
        }
        
        const briefing = await brainstormRes.json();
        if (!briefing || briefing.error) throw new Error(briefing?.error || `Geen briefing voor: ${item.title}`);
        
        // Step 2: Write article
        const writeRes = await fetch(`${supabaseUrl}/functions/v1/generate-blog-content`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            step: "write",
            briefing: briefing,
            category: item.category || "Algemeen",
            custom_instructions: `Focus keyword: "${item.keyword}". Schrijf een uitgebreid, SEO-geoptimaliseerd artikel van 1500-2500 woorden.`,
            ...(questionId ? {
              source_context: {
                question_id: questionId,
                answer_fragments: answerFragments,
              },
            } : {}),
          }),
        });
        
        if (!writeRes.ok) {
          console.error(`Write failed for "${item.title}":`, await writeRes.text());
          throw new Error(`Schrijven mislukt: ${item.title}`);
        }
        
        const article = await writeRes.json();
        if (!article || article.error) throw new Error(article?.error || `Geen artikel voor: ${item.title}`);
        
        // Step 2b: SEO Polish (non-blocking, same as manual pipeline)
        try {
          const seoRes = await fetch(`${supabaseUrl}/functions/v1/polish-blog-seo`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: article.title || item.title,
              intro: article.intro || "",
              meta_description: article.meta_description || "",
              primary_keyword: item.keyword || "",
              category: item.category || "Algemeen",
            }),
          });
          
          if (seoRes.ok) {
            const seoData = await seoRes.json();
            if (seoData.success && seoData.fixes) {
              if (seoData.fixes.title) article.title = seoData.fixes.title;
              if (seoData.fixes.intro) article.intro = seoData.fixes.intro;
              if (seoData.fixes.meta_description) article.meta_description = seoData.fixes.meta_description;
              console.log(`SEO polish applied for "${item.title}":`, Object.keys(seoData.fixes));
            }
          }
        } catch (seoErr) {
          console.warn(`SEO polish failed for "${item.title}", continuing without:`, seoErr);
        }
        
        // Step 3: Save as draft with UUID slug suffix
        const slug = (article.slug || article.title || item.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80);
        const savedSlug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;
        
        // Deduplication check: skip insert if article with same title exists (within 7 days)
        const articleTitle = article.title || item.title;
        const { data: existingPost } = await supabase
          .from("blog_posts")
          .select("id")
          .eq("title", articleTitle)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingPost && existingPost.length > 0) {
          console.log(`Duplicate detected for "${articleTitle}", skipping insert`);
          success = true;
        } else {
          const { data: insertedPost, error: insertError } = await supabase
            .from("blog_posts")
            .insert({
              title: articleTitle,
              slug: savedSlug,
              intro: article.intro || "",
              summary: article.summary || null,
              category: item.category || "Algemeen",
              content: article.content || { sections: [] },
              meta_description: article.meta_description || null,
              meta_keywords: article.meta_keywords || [],
              seo_bullets: article.seo_bullets || [],
              featured_image: article.featured_image || null,
              published: false,
              scheduled_at: scheduledDate.toISOString(),
              portal_phases: article.portal_phases || [],
              author: "Top Immo Spain",
              source_question_id: questionId || null,
            })
            .select("id")
            .single();
          
          if (insertError) throw new Error(`Opslaan mislukt: ${item.title}`);
          
          // Step 4: Create content_briefings record with strategic data + article_data
          if (insertedPost?.id) {
            const sourceContext = questionId ? { question_id: questionId, answer_fragments: answerFragments } : null;
            const { error: briefingError } = await supabase
              .from("content_briefings")
              .insert({
                status: "written",
                source_type: questionId ? "question" : "idea",
                source_text: item.source_question || item.title,
                source_question_id: questionId || null,
                category: item.category || "Algemeen",
                briefing_data: briefing,
                raw_brainstorm: JSON.stringify(briefing),
                article_data: {
                  title: articleTitle,
                  slug: savedSlug,
                  intro: article.intro || "",
                  summary: article.summary || null,
                  meta_description: article.meta_description || null,
                  meta_keywords: article.meta_keywords || [],
                  seo_bullets: article.seo_bullets || [],
                },
                source_context: sourceContext,
              });
            
            if (briefingError) {
              console.warn(`Content briefing insert failed for "${item.title}":`, briefingError);
            }
            
            // Step 5: Generate featured image (fire-and-forget, non-blocking)
            fetch(`${supabaseUrl}/functions/v1/generate-blog-image`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ blogPostId: insertedPost.id }),
            }).catch((e) => console.warn(`Image generation failed for "${item.title}":`, e));

            // Step 6: LinkedIn post generation (fire-and-forget, non-blocking)
            if (item.linkedin_archetype) {
              (async () => {
                try {
                  console.log(`LinkedIn brainstorm starting for "${item.title}" (archetype: ${item.linkedin_archetype})`);
                  const linkedinBrainstormRes = await fetch(`${supabaseUrl}/functions/v1/generate-linkedin-post`, {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${serviceKey}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      step: "brainstorm",
                      blog_post_id: insertedPost.id,
                      title: articleTitle,
                      intro: article.intro || "",
                      summary: article.summary || null,
                      keywords: article.meta_keywords || [],
                      slug: savedSlug,
                    }),
                  });

                  if (linkedinBrainstormRes.ok) {
                    const brainstormData = await linkedinBrainstormRes.json();
                    if (brainstormData?.briefing) {
                      console.log(`LinkedIn write starting for "${item.title}"`);

                      const hookTypeMap: Record<string, string> = { engagement: "situatie", authority: "stelling", educational: "vraag" };
                      const preferredHookType = hookTypeMap[item.linkedin_archetype] || "situatie";
                      const hookOptions = brainstormData.briefing.hook_options || [];
                      const selectedHook = hookOptions.find((h: any) => h.type === preferredHookType) || hookOptions[0];

                      const linkedinWriteRes = await fetch(`${supabaseUrl}/functions/v1/generate-linkedin-post`, {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${serviceKey}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          step: "write",
                          blog_post_id: insertedPost.id,
                          title: articleTitle,
                          briefing: {
                            ...brainstormData.briefing,
                            archetype: item.linkedin_archetype,
                            selected_hook: selectedHook?.text || hookOptions[0]?.text || "",
                            selected_hook_type: selectedHook?.type || preferredHookType,
                          },
                        }),
                      });

                      if (linkedinWriteRes.ok) {
                        console.log(`LinkedIn post created for "${item.title}"`);
                      } else {
                        console.warn(`LinkedIn write failed for "${item.title}":`, await linkedinWriteRes.text());
                      }
                    }
                  } else {
                    console.warn(`LinkedIn brainstorm failed for "${item.title}":`, await linkedinBrainstormRes.text());
                  }
                } catch (e) {
                  console.warn(`LinkedIn pipeline failed for "${item.title}":`, e);
                }
              })();
            }
          }
          
          success = true;
          console.log(`Article "${item.title}" created successfully`);
        }
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : `Fout bij: ${item.title}`;
        console.error(`Error processing "${item.title}":`, e);
      }
      
      // Atomically update progress via database function (row-locked)
      await supabase.rpc("increment_article_progress", {
        p_report_id: reportId,
        p_success: success,
        p_error_msg: errorMsg || null,
        p_total_items: totalItems,
        p_item_index: itemIndex,
      });
      
      return new Response(JSON.stringify({ success, error: errorMsg || undefined }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI CMO error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const dayOrder = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + 7; // +7 for NEXT week
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().split("T")[0];
}
