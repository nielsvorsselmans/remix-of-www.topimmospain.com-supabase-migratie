import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid3X3, Smartphone, Layers, BookOpen, History, Palette } from "lucide-react";
import { CarouselBuilder } from "@/components/admin/visual-studio/CarouselBuilder";
import { StoryGenerator } from "@/components/admin/visual-studio/StoryGenerator";
import { AdFormatGenerator } from "@/components/admin/visual-studio/AdFormatGenerator";
import { TemplateLibrary } from "@/components/admin/visual-studio/TemplateLibrary";
import { ExportHistoryPanel } from "@/components/admin/visual-studio/ExportHistoryPanel";

export default function VisualStudio() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          Visual Content Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          Maak professionele visuals voor social media, ads en meer
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="carousel" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="carousel" className="gap-2">
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">Carrousel</span>
          </TabsTrigger>
          <TabsTrigger value="story" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Story</span>
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Ads</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Exports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="carousel">
          <CarouselBuilder />
        </TabsContent>

        <TabsContent value="story">
          <StoryGenerator />
        </TabsContent>

        <TabsContent value="ads">
          <AdFormatGenerator />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateLibrary />
        </TabsContent>

        <TabsContent value="history">
          <ExportHistoryPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
