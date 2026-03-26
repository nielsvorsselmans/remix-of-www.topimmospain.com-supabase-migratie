import { useState } from "react";
import { Compass, PenLine, Send, Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DiscoverPage } from "@/components/admin/DiscoverPage";
import { CreatePage, type CreatePagePrefill } from "@/components/admin/CreatePage";
import { PublishPage } from "@/components/admin/PublishPage";
import { WeeklyReportPanel } from "@/components/admin/WeeklyReportPanel";
import { useWorkflowCounts } from "@/hooks/useContentWorkflow";
import { useNavigate } from "react-router-dom";

export default function ContentEngineBlog() {
  const { data: counts } = useWorkflowCounts();
  const [activeTab, setActiveTab] = useState("ontdekken");
  const [createPrefill, setCreatePrefill] = useState<CreatePagePrefill | null>(null);
  const [openBriefingId, setOpenBriefingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const navigateToCreate = (prefill: CreatePagePrefill) => {
    setCreatePrefill(prefill);
    setActiveTab("creeren");
  };

  const navigateToBriefing = (briefingId: string) => {
    setOpenBriefingId(briefingId);
    setActiveTab("creeren");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
        <p className="text-sm text-muted-foreground">Ontdek, creëer en publiceer blogartikelen.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 h-auto">
          <TabsTrigger value="ontdekken" className="flex items-center gap-2 py-2.5">
            <Compass className="h-4 w-4" />
            <span className="hidden sm:inline">Ontdekken</span>
          </TabsTrigger>
          <TabsTrigger value="creeren" className="flex items-center gap-2 py-2.5">
            <PenLine className="h-4 w-4" />
            <span className="hidden sm:inline">Creëren</span>
          </TabsTrigger>
          <TabsTrigger value="publiceren" className="flex items-center gap-2 py-2.5">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Publiceren</span>
            {(counts?.blogDrafts ?? 0) > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {counts?.blogDrafts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="cmo" className="flex items-center gap-2 py-2.5">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">AI CMO</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ontdekken" className="space-y-4">
          <DiscoverPage
            onNavigateToCreate={navigateToCreate}
            onNavigateToBriefing={navigateToBriefing}
          />
        </TabsContent>

        <TabsContent value="creeren" className="space-y-4">
          <CreatePage
            prefill={createPrefill}
            onPrefillConsumed={() => setCreatePrefill(null)}
            openBriefingId={openBriefingId}
            onBriefingIdConsumed={() => setOpenBriefingId(null)}
          />
        </TabsContent>

        <TabsContent value="publiceren" className="space-y-4">
          <PublishPage />
        </TabsContent>

        <TabsContent value="cmo" className="space-y-4">
          <WeeklyReportPanel onNavigateToPublish={() => setActiveTab("publiceren")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
