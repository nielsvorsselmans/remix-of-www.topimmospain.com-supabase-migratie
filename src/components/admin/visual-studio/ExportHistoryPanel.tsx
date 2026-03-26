import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Clock, FileDown, Image as ImageIcon, Archive } from "lucide-react";
import { useVisualExports } from "./hooks/useVisualExports";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export function ExportHistoryPanel() {
  const { data: exports, isLoading } = useVisualExports(20);

  const getExportIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileDown className="h-4 w-4" />;
      case "zip":
        return <Archive className="h-4 w-4" />;
      default:
        return <ImageIcon className="h-4 w-4" />;
    }
  };

  const getExportBadgeVariant = (type: string) => {
    switch (type) {
      case "pdf":
        return "default";
      case "zip":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!exports || exports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Export Geschiedenis
          </CardTitle>
          <CardDescription>
            Je geëxporteerde visuals verschijnen hier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nog geen exports gemaakt</p>
            <p className="text-sm">Maak je eerste carrousel, story of ad om te beginnen</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Export Geschiedenis
        </CardTitle>
        <CardDescription>
          Recente exports ({exports.length} items)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {exports.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  {getExportIcon(exp.export_type)}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {exp.file_name || `Export ${exp.id.slice(0, 8)}`}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={getExportBadgeVariant(exp.export_type) as "default" | "secondary" | "outline"}>
                      {exp.export_type.toUpperCase()}
                    </Badge>
                    {exp.project && (
                      <span>• {exp.project.name}</span>
                    )}
                    {exp.metadata?.slideCount && (
                      <span>• {exp.metadata.slideCount} slides</span>
                    )}
                    {exp.metadata?.formats && Array.isArray(exp.metadata.formats) && (
                      <span>• {exp.metadata.formats.length} formaten</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(exp.created_at), {
                    addSuffix: true,
                    locale: nl,
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a href={exp.file_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a href={exp.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
