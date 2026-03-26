import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Grid3X3, Smartphone, Layers, FileText } from "lucide-react";
import { useVisualTemplates } from "./hooks/useVisualTemplates";
import { VisualTemplate } from "./types";

interface TemplateLibraryProps {
  onSelectTemplate?: (template: VisualTemplate) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const { data: allTemplates, isLoading } = useVisualTemplates();

  const carouselTemplates = allTemplates?.filter((t) => t.category === "carousel") || [];
  const storyTemplates = allTemplates?.filter((t) => t.category === "story") || [];
  const adTemplates = allTemplates?.filter((t) => t.category === "ad") || [];
  const newsCardTemplates = allTemplates?.filter((t) => t.category === "newscard") || [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "carousel":
        return <Grid3X3 className="h-4 w-4" />;
      case "story":
        return <Smartphone className="h-4 w-4" />;
      case "ad":
        return <Layers className="h-4 w-4" />;
      case "newscard":
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderTemplateGrid = (templates: VisualTemplate[]) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {templates.map((template) => (
        <Card
          key={template.id}
          className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
          onClick={() => onSelectTemplate?.(template)}
        >
          <div className="aspect-[4/5] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            {template.thumbnail_url ? (
              <img
                src={template.thumbnail_url}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-4xl opacity-20">{getCategoryIcon(template.category)}</div>
            )}
          </div>
          <CardContent className="p-3">
            <div className="font-medium text-sm mb-1">{template.name}</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {template.width}x{template.height}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {template.format_type.replace(/_/g, " ")}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
          <CardDescription>
            Kies een template om te starten. Klik op een template om deze te openen in de editor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="carousel">
            <TabsList className="mb-6">
              <TabsTrigger value="carousel" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                Carrousels ({carouselTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="story" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Stories ({storyTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="ad" className="gap-2">
                <Layers className="h-4 w-4" />
                Ads ({adTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="newscard" className="gap-2">
                <FileText className="h-4 w-4" />
                News Cards ({newsCardTemplates.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="carousel">
              {carouselTemplates.length > 0 ? (
                renderTemplateGrid(carouselTemplates)
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Geen carrousel templates beschikbaar
                </p>
              )}
            </TabsContent>

            <TabsContent value="story">
              {storyTemplates.length > 0 ? (
                renderTemplateGrid(storyTemplates)
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Geen story templates beschikbaar
                </p>
              )}
            </TabsContent>

            <TabsContent value="ad">
              {adTemplates.length > 0 ? (
                renderTemplateGrid(adTemplates)
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Geen ad templates beschikbaar
                </p>
              )}
            </TabsContent>

            <TabsContent value="newscard">
              {newsCardTemplates.length > 0 ? (
                renderTemplateGrid(newsCardTemplates)
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Geen news card templates beschikbaar
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
