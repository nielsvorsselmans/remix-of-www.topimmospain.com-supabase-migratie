import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectsList } from "@/hooks/useProjectsList";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Loader2, Sparkles, Building2, MapPin, Euro, Check, ChevronsUpDown } from "lucide-react";
import { BrainstormEditor } from "@/components/admin/briefing/BrainstormEditor";
import { StrategicBriefingEditor } from "@/components/admin/briefing/StrategicBriefingEditor";
import { BriefingPromptDialog } from "@/components/admin/briefing/BriefingPromptDialog";
import { PostPreview } from "@/components/admin/briefing/PostPreview";
import { HookSelector, type HookOptions, type SelectedHooksState } from "@/components/admin/briefing/HookSelector";
import { type PolishedPost } from "@/components/admin/briefing/PostPreview";
import { BriefingPipelineStepper, type PipelineStep } from "@/components/admin/briefing/BriefingPipelineStepper";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { StrategicAngle } from "@/components/admin/briefing/StrategicAngleCard";
import type { SpecItem } from "@/components/admin/briefing/SpecsAccordion";

// New strategic analysis result interface
export interface StrategicAnalysisResult {
  projectNameInternal?: string;
  strategicAngles: StrategicAngle[];
  analystContextDraft: string;
  specsChecklist: SpecItem[];
  locationMysteryHint: string;
  suggestedCTAs: string[];
  _brainstormInsights?: string;
}

// New briefing state for strategic editor
export interface StrategicBriefingState {
  projectId: string | null;
  analysisResult: StrategicAnalysisResult | null;
  
  // Layer 1: Selected strategy
  selectedAngle: StrategicAngle | null;
  
  // Layer 2: Editable context
  editedContextNotes: string;
  
  // Layer 3: Selected specs
  selectedSpecs: string[];
  
  // Additional fields
  locationHint: string;
  ctaKeyword: string;
}

// Brainstorm state for the review step
interface BrainstormState {
  analysisId: string | null;
  originalInsights: string;
  editedInsights: string;
  projectName: string;
}

interface GeneratedPosts {
  variation1: {
    hook: string;
    body: string;
    cta: string;
    triggerWord: string;
  };
  variation2: {
    hook: string;
    body: string;
    cta: string;
    triggerWord: string;
  };
  project: {
    name: string;
    city: string;
    featuredImage: string;
  };
}

interface HookOptionsState {
  variation1: HookOptions;
  variation2: HookOptions;
}

const initialBriefingState: StrategicBriefingState = {
  projectId: null,
  analysisResult: null,
  selectedAngle: null,
  editedContextNotes: "",
  selectedSpecs: [],
  locationHint: "",
  ctaKeyword: "",
};

const initialBrainstormState: BrainstormState = {
  analysisId: null,
  originalInsights: "",
  editedInsights: "",
  projectName: "",
};

type ViewState = "editor" | "brainstormReview" | "hookSelector" | "polishing" | "preview";

export default function ProjectBriefing() {
  const [briefingState, setBriefingState] = useState<StrategicBriefingState>(initialBriefingState);
  const [brainstormState, setBrainstormState] = useState<BrainstormState>(initialBrainstormState);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormalizing, setIsFormalizing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizingHooks, setIsOptimizingHooks] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPosts | null>(null);
  const [hookOptions, setHookOptions] = useState<HookOptionsState | null>(null);
  const [selectedHooks, setSelectedHooks] = useState<SelectedHooksState>({
    variation1: [],
    variation2: [],
    skipVariation1: false,
    skipVariation2: false,
  });
  const [polishedPosts, setPolishedPosts] = useState<PolishedPost[]>([]);
  const [viewState, setViewState] = useState<ViewState>("editor");
  const [isHydrating, setIsHydrating] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProjectCardExpanded, setIsProjectCardExpanded] = useState(true);

  // Compute current pipeline step and completed steps based on state
  const pipelineState = useMemo(() => {
    let currentStep: PipelineStep = 1;
    const completedSteps: PipelineStep[] = [];

    // Step 1 is complete if we have brainstorm insights
    if (brainstormState.originalInsights) {
      completedSteps.push(1);
    }

    // Step 2 is complete if we have formalized results
    if (briefingState.analysisResult) {
      completedSteps.push(2);
    }

    // Step 3 is complete if we generated posts
    if (generatedPosts) {
      completedSteps.push(3);
    }

    // Step 4 is complete if we have polished posts
    if (polishedPosts.length > 0) {
      completedSteps.push(4);
    }

    // Determine current step based on viewState
    switch (viewState) {
      case "brainstormReview":
        currentStep = 2;
        break;
      case "editor":
        currentStep = briefingState.analysisResult ? 3 : 1;
        break;
      case "hookSelector":
        currentStep = 4;
        break;
      case "polishing":
      case "preview":
        currentStep = 5;
        break;
      default:
        currentStep = 1;
    }

    return { currentStep, completedSteps };
  }, [viewState, brainstormState.originalInsights, briefingState.analysisResult, generatedPosts, selectedHooks, polishedPosts]);

  // Fetch active projects - shared cached hook
  const { data: projects, isLoading: projectsLoading } = useProjectsList();

  // Fetch existing analysis for selected project - both formalized and brainstorm_ready
  const { data: existingAnalysis, isLoading: existingAnalysisLoading } = useQuery({
    queryKey: ["project-existing-analysis", briefingState.projectId],
    queryFn: async () => {
      if (!briefingState.projectId) return null;
      
      // Fetch both formalized and brainstorm_ready analyses
      const [formalizedRes, brainstormReadyRes] = await Promise.all([
        supabase
          .from("project_briefing_analyses")
          .select("*")
          .eq("project_id", briefingState.projectId)
          .eq("status", "formalized")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("project_briefing_analyses")
          .select("*")
          .eq("project_id", briefingState.projectId)
          .eq("status", "brainstorm_ready")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      
      if (formalizedRes.error) throw formalizedRes.error;
      if (brainstormReadyRes.error) throw brainstormReadyRes.error;
      
      return {
        formalized: formalizedRes.data,
        brainstormReady: brainstormReadyRes.data,
      };
    },
    enabled: !!briefingState.projectId,
  });

  // Get selected project details
  const selectedProject = projects?.find(p => p.id === briefingState.projectId);

  // Hydrate state from existing analysis - smart logic for formalized vs brainstorm_ready
  useEffect(() => {
    if (!isHydrating) return;
    if (existingAnalysisLoading) return; // Wait for query to complete
    if (!selectedProject) {
      setIsHydrating(false);
      return;
    }
    
    // No existing analysis found - just show empty editor
    if (!existingAnalysis) {
      console.log("[Briefing] Geen bestaande analyse gevonden, start nieuw");
      setViewState("editor");
      setIsHydrating(false);
      return;
    }
    
    const { formalized, brainstormReady } = existingAnalysis;
    
    // No analyses at all
    if (!formalized && !brainstormReady) {
      console.log("[Briefing] Geen analyses beschikbaar");
      setViewState("editor");
      setIsHydrating(false);
      return;
    }
    
    // Scenario 1: Newer brainstorm_ready exists than latest formalized
    if (brainstormReady && formalized) {
      const brainstormDate = new Date(brainstormReady.created_at);
      const formalizedDate = new Date(formalized.created_at);
      
      if (brainstormDate > formalizedDate) {
        // Newer brainstorm found - load for review
        console.log("[Briefing] Nieuwere brainstorm gevonden, laden voor review...");
        setBrainstormState({
          analysisId: brainstormReady.id,
          originalInsights: brainstormReady.brainstorm_insights || "",
          editedInsights: brainstormReady.brainstorm_edited || brainstormReady.brainstorm_insights || "",
          projectName: selectedProject.name,
        });
        setViewState("brainstormReview");
        setIsHydrating(false);
        toast.info("Nieuwere brainstorm geladen - formaliseer om verder te gaan");
        return;
      }
    }
    
    // Scenario 2: Only brainstorm_ready exists (no formalized yet)
    if (brainstormReady && !formalized) {
      console.log("[Briefing] Brainstorm klaar, nog niet geformaliseerd...");
      setBrainstormState({
        analysisId: brainstormReady.id,
        originalInsights: brainstormReady.brainstorm_insights || "",
        editedInsights: brainstormReady.brainstorm_edited || brainstormReady.brainstorm_insights || "",
        projectName: selectedProject.name,
      });
      setViewState("brainstormReview");
      setIsHydrating(false);
      toast.info("Brainstorm hervat - formaliseer om verder te gaan");
      return;
    }
    
    // Scenario 3: Formalized exists (standard hydration)
    if (formalized?.formalized_result) {
      const result = formalized.formalized_result as unknown as StrategicAnalysisResult;
      
      // Hydrate briefingState
      setBriefingState(prev => ({
        ...prev,
        analysisResult: result,
        selectedAngle: result.strategicAngles[0] || null,
        editedContextNotes: result.analystContextDraft,
        selectedSpecs: result.specsChecklist.filter(s => s.selected).map(s => s.text),
        locationHint: result.locationMysteryHint,
        ctaKeyword: result.suggestedCTAs[0] || "",
      }));

      // Hydrate brainstormState for potential return to review
      setBrainstormState({
        analysisId: formalized.id,
        originalInsights: formalized.brainstorm_insights || "",
        editedInsights: formalized.brainstorm_edited || formalized.brainstorm_insights || "",
        projectName: selectedProject.name,
      });

      setViewState("editor");
      setIsHydrating(false);
      toast.info("Bestaande analyse geladen");
      return;
    }
    
    // Fallback
    setViewState("editor");
    setIsHydrating(false);
  }, [isHydrating, existingAnalysis, existingAnalysisLoading, selectedProject]);

  // Filter projects based on search query
  const filteredProjects = projects?.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectSelect = (projectId: string) => {
    // Reset all state and trigger hydration
    setBriefingState({
      ...initialBriefingState,
      projectId,
    });
    setBrainstormState(initialBrainstormState);
    setGeneratedPosts(null);
    setHookOptions(null);
    setSelectedHooks({
      variation1: [],
      variation2: [],
      skipVariation1: false,
      skipVariation2: false,
    });
    setPolishedPosts([]);
    // Don't set viewState here - let hydration determine the correct view
    setIsHydrating(true);
  };

  // Step 1: Run brainstormer only
  const handleBrainstorm = async () => {
    if (!briefingState.projectId) return;

    setIsAnalyzing(true);
    try {
      console.log("[Briefing] Starting brainstorm for project:", briefingState.projectId);
      const { data, error } = await supabase.functions.invoke("brainstorm-project", {
        body: { projectId: briefingState.projectId },
      });

      // Check for function invocation error
      if (error) {
        console.error("[Briefing] Brainstorm invoke error:", error);
        throw new Error(error.message || "Functie kon niet worden aangeroepen");
      }

      // Check for error in response data
      if (data?.error) {
        console.error("[Briefing] Brainstorm response error:", data.error);
        toast.error(data.error);
        return;
      }

      // Validate response has expected data
      if (!data?.brainstormInsights) {
        console.error("[Briefing] Brainstorm empty response:", data);
        toast.error("Lege response van AI, probeer opnieuw");
        return;
      }

      // Store brainstorm result and go to review screen
      setBrainstormState({
        analysisId: data.analysisId,
        originalInsights: data.brainstormInsights,
        editedInsights: data.brainstormInsights,
        projectName: data.projectName,
      });
      setViewState("brainstormReview");
      toast.success("Brainstorm analyse voltooid! Review de output.");
    } catch (error) {
      console.error("[Briefing] Brainstorm error:", error);
      const message = error instanceof Error ? error.message : "Onbekende fout";
      toast.error(`Brainstorm mislukt: ${message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Formalize the (potentially edited) brainstorm
  const handleFormalize = async () => {
    if (!briefingState.projectId || !brainstormState.editedInsights) return;

    setIsFormalizing(true);
    try {
      console.log("[Briefing] Starting formalize for project:", briefingState.projectId);
      const { data, error } = await supabase.functions.invoke("formalize-briefing", {
        body: {
          projectId: briefingState.projectId,
          analysisId: brainstormState.analysisId,
          brainstormInsights: brainstormState.editedInsights,
        },
      });

      // Check for function invocation error
      if (error) {
        console.error("[Briefing] Formalize invoke error:", error);
        throw new Error(error.message || "Functie kon niet worden aangeroepen");
      }

      // Check for error in response data
      if (data?.error) {
        console.error("[Briefing] Formalize response error:", data.error);
        toast.error(data.error);
        return;
      }

      // Validate response has expected structure
      if (!data?.strategicAngles || !Array.isArray(data.strategicAngles)) {
        console.error("[Briefing] Formalize invalid response:", data);
        toast.error("Ongeldige AI response, probeer opnieuw");
        return;
      }

      const result = data as StrategicAnalysisResult;
      
      // Pre-fill with analysis results
      setBriefingState(prev => ({
        ...prev,
        analysisResult: result,
        selectedAngle: result.strategicAngles[0] || null,
        editedContextNotes: result.analystContextDraft,
        selectedSpecs: result.specsChecklist.filter(s => s.selected).map(s => s.text),
        locationHint: result.locationMysteryHint,
        ctaKeyword: result.suggestedCTAs[0] || "",
      }));

      setViewState("editor");
      toast.success("Briefing geformaliseerd!");
    } catch (error) {
      console.error("[Briefing] Formalize error:", error);
      const message = error instanceof Error ? error.message : "Onbekende fout";
      toast.error(`Formalisatie mislukt: ${message}`);
    } finally {
      setIsFormalizing(false);
    }
  };

  const handleBrainstormEdit = (value: string) => {
    setBrainstormState(prev => ({ ...prev, editedInsights: value }));
  };

  const handleBrainstormReset = () => {
    setBrainstormState(prev => ({ ...prev, editedInsights: prev.originalInsights }));
  };
  const handleGeneratePost = async () => {
    if (!briefingState.projectId || !briefingState.selectedAngle) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-project-post", {
        body: {
          projectId: briefingState.projectId,
          briefing: {
            selectedAngle: briefingState.selectedAngle,
            userContextNotes: briefingState.editedContextNotes,
            selectedSpecs: briefingState.selectedSpecs,
            locationHint: briefingState.locationHint,
            ctaKeyword: briefingState.ctaKeyword,
          },
          brainstormInsights: briefingState.analysisResult?._brainstormInsights,
          platform: "linkedin",
        },
      });

      if (error) throw error;

      const posts = data as GeneratedPosts;
      setGeneratedPosts(posts);
      toast.success("Posts gegenereerd! Hooks worden geoptimaliseerd...");
      
      // Automatically trigger hook optimization
      await optimizeHooks(posts);
    } catch (error) {
      console.error("Post generation error:", error);
      toast.error("Er ging iets mis bij het genereren van de post");
    } finally {
      setIsGenerating(false);
    }
  };

  const optimizeHooks = async (posts: GeneratedPosts) => {
    setIsOptimizingHooks(true);
    try {
      // Get target audience from selected angle
      const targetAudience = briefingState.selectedAngle?.targetAudienceFit || "BOTH";

      // Optimize hooks for both variations in parallel
      const [response1, response2] = await Promise.all([
        supabase.functions.invoke("optimize-post-hooks", {
          body: {
            draftPost: `${posts.variation1.hook}\n\n${posts.variation1.body}\n\n${posts.variation1.cta}`,
            targetAudience,
            projectName: posts.project.name,
          },
        }),
        supabase.functions.invoke("optimize-post-hooks", {
          body: {
            draftPost: `${posts.variation2.hook}\n\n${posts.variation2.body}\n\n${posts.variation2.cta}`,
            targetAudience,
            projectName: posts.project.name,
          },
        }),
      ]);

      if (response1.error) throw response1.error;
      if (response2.error) throw response2.error;

      setHookOptions({
        variation1: response1.data as HookOptions,
        variation2: response2.data as HookOptions,
      });
      setViewState("hookSelector");
      toast.success("5 hook varianten gegenereerd per post!");
    } catch (error) {
      console.error("Hook optimization error:", error);
      toast.error("Er ging iets mis bij het optimaliseren van de hooks. Je kunt de originele hooks gebruiken.");
      setViewState("preview");
    } finally {
      setIsOptimizingHooks(false);
    }
  };

  const handleSelectHook = (variation: "variation1" | "variation2", hookKey: string) => {
    setSelectedHooks(prev => {
      const current = prev[variation];
      const isSelected = current.includes(hookKey);
      return {
        ...prev,
        [variation]: isSelected
          ? current.filter(k => k !== hookKey)
          : [...current, hookKey],
      };
    });
  };

  const handleToggleSkip = (variation: "variation1" | "variation2") => {
    setSelectedHooks(prev => ({
      ...prev,
      [`skip${variation.charAt(0).toUpperCase() + variation.slice(1)}` as "skipVariation1" | "skipVariation2"]: 
        !prev[`skip${variation.charAt(0).toUpperCase() + variation.slice(1)}` as "skipVariation1" | "skipVariation2"],
    }));
  };

  const handleConfirmHooks = async () => {
    if (!generatedPosts || !hookOptions) {
      setViewState("preview");
      return;
    }

    // Collect all hooks to polish
    const hooksToPolish: Array<{
      variation: "variation1" | "variation2";
      hookKey: string;
      hookText: string;
      triggerWord: string;
    }> = [];

    if (!selectedHooks.skipVariation1) {
      selectedHooks.variation1.forEach(hookKey => {
        hooksToPolish.push({
          variation: "variation1",
          hookKey,
          hookText: hookOptions.variation1[hookKey as keyof HookOptions] as string,
          triggerWord: generatedPosts.variation1.triggerWord,
        });
      });
    }

    if (!selectedHooks.skipVariation2) {
      selectedHooks.variation2.forEach(hookKey => {
        hooksToPolish.push({
          variation: "variation2",
          hookKey,
          hookText: hookOptions.variation2[hookKey as keyof HookOptions] as string,
          triggerWord: generatedPosts.variation2.triggerWord,
        });
      });
    }

    if (hooksToPolish.length === 0) {
      toast.error("Selecteer minimaal 1 hook");
      return;
    }

    setIsPolishing(true);
    setViewState("polishing");
    
    try {
      const targetAudience = briefingState.selectedAngle?.targetAudienceFit || "BOTH";

      // Polish all selected hooks in parallel
      const polishResponses = await Promise.all(
        hooksToPolish.map(item => 
          supabase.functions.invoke("polish-post", {
            body: {
              selectedHook: item.hookText,
              draftBody: generatedPosts[item.variation].body,
              draftCta: generatedPosts[item.variation].cta,
              targetAudience
            }
          })
        )
      );

      // Check for errors
      const errors = polishResponses.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      // Map results to PolishedPost structure
      const polished: PolishedPost[] = polishResponses.map((response, i) => ({
        id: `${hooksToPolish[i].variation}-${hooksToPolish[i].hookKey}-${Date.now()}`,
        variation: hooksToPolish[i].variation,
        hookKey: hooksToPolish[i].hookKey,
        hookText: hooksToPolish[i].hookText,
        polishedText: response.data.polishedPost,
        triggerWord: hooksToPolish[i].triggerWord,
      }));

      setPolishedPosts(polished);
      toast.success(`${polished.length} post${polished.length !== 1 ? "s" : ""} gepolijst door de Senior Editor!`);
      setViewState("preview");
    } catch (error) {
      console.error("Polish error:", error);
      toast.error("Polishing mislukt, probeer opnieuw.");
      setViewState("hookSelector");
    } finally {
      setIsPolishing(false);
    }
  };

  const handleBackToBriefing = () => {
    setGeneratedPosts(null);
    setHookOptions(null);
    setSelectedHooks({
      variation1: [],
      variation2: [],
      skipVariation1: false,
      skipVariation2: false,
    });
    setPolishedPosts([]);
    setViewState("editor");
  };

  const handleBackToReview = () => {
    setViewState("brainstormReview");
  };

  const handleBackToHooks = () => {
    if (hookOptions) {
      setViewState("hookSelector");
    }
  };

  // Navigate to a specific pipeline step
  const handleNavigateToStep = (step: PipelineStep) => {
    switch (step) {
      case 1:
        // Step 1 = no action, just shows project selector
        break;
      case 2:
        if (brainstormState.originalInsights) {
          setViewState("brainstormReview");
        }
        break;
      case 3:
        if (briefingState.analysisResult) {
          setGeneratedPosts(null);
          setHookOptions(null);
          setSelectedHooks({
            variation1: [],
            variation2: [],
            skipVariation1: false,
            skipVariation2: false,
          });
          setPolishedPosts([]);
          setViewState("editor");
        }
        break;
      case 4:
        if (generatedPosts && hookOptions) {
          setPolishedPosts([]);
          setViewState("hookSelector");
        }
        break;
      case 5:
        if (generatedPosts) {
          setViewState("preview");
        }
        break;
    }
  };

  // Restart a specific step
  const handleRestartStep = (step: PipelineStep) => {
    switch (step) {
      case 1:
        // Restart brainstorm
        handleBrainstorm();
        break;
      case 2:
        // Just go back to review - user can edit
        if (brainstormState.originalInsights) {
          setViewState("brainstormReview");
        }
        break;
      case 3:
        // Regenerate post
        if (briefingState.analysisResult) {
          handleGeneratePost();
        }
        break;
      case 4:
        // Re-optimize hooks
        if (generatedPosts) {
          optimizeHooks(generatedPosts);
        }
        break;
    }
  };

  // Handle post update from PostPreview
  const handleUpdatePost = (postId: string, updates: Partial<PolishedPost>) => {
    setPolishedPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, ...updates } : p
    ));
  };

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Check if any processing is happening
  const isProcessing = isAnalyzing || isFormalizing || isGenerating || isOptimizingHooks || isPolishing;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Strategic Briefing Editor</h1>
            <p className="text-muted-foreground">
              Selecteer een project, kies je strategie, en genereer content die jouw visie volgt.
            </p>
          </div>
          <BriefingPromptDialog />
        </div>

        {/* Pipeline Stepper - Only show when project is selected */}
        {selectedProject && (
          <BriefingPipelineStepper
            currentStep={pipelineState.currentStep}
            completedSteps={pipelineState.completedSteps}
            onNavigateToStep={handleNavigateToStep}
            onRestartStep={handleRestartStep}
            isProcessing={isProcessing}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Project Selector */}
          <div className="space-y-4">
            {/* Project Selector - Collapsible when analysis is active */}
            <Collapsible 
              open={isProjectCardExpanded || !selectedProject} 
              onOpenChange={setIsProjectCardExpanded}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedProject && !isProjectCardExpanded && "pb-4"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedProject?.featured_image && !isProjectCardExpanded ? (
                          <img 
                            src={selectedProject.featured_image} 
                            alt={selectedProject.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {selectedProject && !isProjectCardExpanded 
                              ? selectedProject.name 
                              : "Selecteer Project"
                            }
                          </CardTitle>
                          {selectedProject && !isProjectCardExpanded && selectedProject.city && (
                            <p className="text-xs text-muted-foreground">{selectedProject.city}</p>
                          )}
                        </div>
                      </div>
                      {selectedProject && (
                        <Badge variant="outline" className="text-xs">
                          {isProjectCardExpanded ? "Inklappen" : "Uitklappen"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          disabled={projectsLoading}
                          className="w-full justify-between h-auto py-2"
                        >
                          {selectedProject ? (
                            <div className="flex items-center gap-3">
                              {selectedProject.featured_image ? (
                                <img 
                                  src={selectedProject.featured_image} 
                                  alt={selectedProject.name}
                                  className="w-8 h-8 rounded object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="text-left">
                                <span className="font-medium">{selectedProject.name}</span>
                                {selectedProject.city && (
                                  <span className="text-muted-foreground text-xs ml-2">
                                    ({selectedProject.city})
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Kies een project...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      
                      <PopoverContent className="w-[350px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Zoek op projectnaam of stad..." 
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>Geen projecten gevonden.</CommandEmpty>
                            <CommandGroup>
                              {filteredProjects?.map((project) => (
                                <CommandItem
                                  key={project.id}
                                  value={project.id}
                                  onSelect={() => {
                                    handleProjectSelect(project.id);
                                    setOpen(false);
                                    setSearchQuery("");
                                    setIsProjectCardExpanded(false);
                                  }}
                                  className="flex items-center gap-3 py-2 cursor-pointer"
                                >
                                  {project.featured_image ? (
                                    <img 
                                      src={project.featured_image} 
                                      alt={project.name}
                                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                      <Building2 className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{project.name}</p>
                                    {project.city && (
                                      <p className="text-xs text-muted-foreground">{project.city}</p>
                                    )}
                                  </div>
                                  <Check
                                    className={cn(
                                      "h-4 w-4 flex-shrink-0",
                                      briefingState.projectId === project.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected Project Preview */}
                    {selectedProject && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                        {selectedProject.featured_image && (
                          <img
                            src={selectedProject.featured_image}
                            alt={selectedProject.name}
                            className="w-full h-32 object-cover rounded-md"
                          />
                        )}
                        <div className="space-y-1">
                          <h3 className="font-semibold text-sm">{selectedProject.name}</h3>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {selectedProject.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {selectedProject.city}
                              </span>
                            )}
                            {selectedProject.price_from && (
                              <span className="flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                {formatPrice(selectedProject.price_from)}
                              </span>
                            )}
                          </div>
                          {selectedProject.status && (
                            <Badge variant="outline" className="text-xs">
                              {selectedProject.status}
                            </Badge>
                          )}
                        </div>

                        <Button
                          onClick={handleBrainstorm}
                          disabled={isAnalyzing || existingAnalysisLoading}
                          size="sm"
                          className="w-full"
                        >
                          {isAnalyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyseren...
                            </>
                          ) : existingAnalysis ? (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Nieuwe Brainstorm
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Start Brainstorm
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>

          {/* Right Column: Strategic Briefing Editor, Hook Selector, Polishing, or Generated Posts */}
          <div className="lg:col-span-2 space-y-6">
              {viewState === "preview" && polishedPosts.length > 0 ? (
                <PostPreview
                  polishedPosts={polishedPosts}
                  project={{
                    id: generatedPosts?.project.name ? briefingState.projectId || undefined : undefined,
                    name: generatedPosts?.project.name || selectedProject?.name || "",
                    city: generatedPosts?.project.city || selectedProject?.city || "",
                    featuredImage: generatedPosts?.project.featuredImage || selectedProject?.featured_image || "",
                    images: selectedProject?.images as string[] | undefined,
                  }}
                  onRegenerate={handleGeneratePost}
                  onBackToHooks={hookOptions ? handleBackToHooks : undefined}
                  onBackToStrategy={handleBackToBriefing}
                  isRegenerating={isGenerating}
                  onUpdatePost={handleUpdatePost}
                />
              ) : viewState === "polishing" || isPolishing ? (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="font-medium mb-2">Senior Editor aan het werk...</p>
                    <p className="text-sm text-muted-foreground">Ritme, witruimte en opmaak worden geoptimaliseerd</p>
                  </CardContent>
                </Card>
              ) : viewState === "hookSelector" && generatedPosts && hookOptions ? (
                <HookSelector
                  hookOptionsVariation1={hookOptions.variation1}
                  hookOptionsVariation2={hookOptions.variation2}
                  selectedHooks={selectedHooks}
                  onSelectHook={handleSelectHook}
                  onToggleSkip={handleToggleSkip}
                  onConfirm={handleConfirmHooks}
                  onBack={handleBackToBriefing}
                  projectName={generatedPosts.project.name}
                />
              ) : isOptimizingHooks ? (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Hook varianten worden gegenereerd...</p>
                  </CardContent>
                </Card>
              ) : isHydrating || existingAnalysisLoading ? (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center">
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-muted-foreground">Bestaande analyse laden...</p>
                  </CardContent>
                </Card>
              ) : viewState === "brainstormReview" && brainstormState.originalInsights ? (
                <BrainstormEditor
                  originalInsights={brainstormState.originalInsights}
                  editedInsights={brainstormState.editedInsights}
                  onEdit={handleBrainstormEdit}
                  onReset={handleBrainstormReset}
                  onApprove={handleFormalize}
                  onRestartBrainstorm={handleBrainstorm}
                  isLoading={isFormalizing}
                  isBrainstorming={isAnalyzing}
                  projectName={brainstormState.projectName}
                />
              ) : briefingState.analysisResult ? (
                <StrategicBriefingEditor
                  briefingState={briefingState}
                  onStateChange={setBriefingState}
                  projectName={selectedProject?.name || ""}
                  onSubmit={handleGeneratePost}
                  onBackToReview={brainstormState.originalInsights ? handleBackToReview : undefined}
                  isGenerating={isGenerating}
                />
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Selecteer een project en klik op "Start Brainstorm Analyse" om te beginnen</p>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
