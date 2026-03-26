import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BatchGeneratorProps {
  onComplete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface BatchStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors?: Array<{ postId: string; title: string; error: string }>;
}

export function BatchBlogImageGenerator({ onComplete, open, onOpenChange }: BatchGeneratorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<BatchStats | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [maxPosts, setMaxPosts] = useState(5);

  // Support both controlled and uncontrolled modes
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setStats(null);
    
    try {
      // Start with 10% to show immediate feedback
      setProgress(10);

      const { data, error } = await supabase.functions.invoke('batch-generate-blog-images', {
        body: { onlyMissing, batchSize: 1, maxPosts }
      });

      if (error) throw error;

      if (data?.success) {
        setProgress(100);
        setStats(data.stats);
        
        const message = `Batch generatie voltooid! ${data.stats.successful} afbeeldingen gegenereerd${data.stats.failed > 0 ? `, ${data.stats.failed} mislukt` : ''}`;
        toast.success(message);
        
        onComplete?.();
      } else {
        throw new Error(data?.error || 'Batch generation failed');
      }
    } catch (error) {
      console.error('Error in batch generation:', error);
      toast.error('Kon batch niet voltooien. Probeer het opnieuw.');
      setStats({
        total: 0,
        successful: 0,
        failed: 1,
        skipped: 0,
        errors: [{ postId: '', title: 'System Error', error: error instanceof Error ? error.message : 'Unknown error' }]
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStats(null);
    setProgress(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Batch Blog Afbeeldingen Genereren
          </DialogTitle>
          <DialogDescription>
            Genereer automatisch featured images voor meerdere blog posts tegelijk met AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Settings */}
          {!isGenerating && !stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Instellingen</CardTitle>
                <CardDescription>Configureer de batch generatie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="only-missing">Alleen posts zonder afbeelding</Label>
                    <p className="text-sm text-muted-foreground">
                      Sla posts over die al een featured image hebben
                    </p>
                  </div>
                  <Switch
                    id="only-missing"
                    checked={onlyMissing}
                    onCheckedChange={setOnlyMissing}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max-posts">Maximum posts per batch</Label>
                  <p className="text-sm text-muted-foreground">
                    Aantal posts om in één keer te verwerken (aanbevolen: 3-5)
                  </p>
                  <input
                    id="max-posts"
                    type="number"
                    min="1"
                    max="10"
                    value={maxPosts}
                    onChange={(e) => setMaxPosts(Math.max(1, Math.min(10, parseInt(e.target.value) || 5)))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Bezig met genereren...
                </CardTitle>
                <CardDescription>Dit kan enkele minuten duren</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground mt-2">
                  {progress}% voltooid
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {stats && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resultaten</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Totaal</p>
                        <p className="text-2xl font-bold">{stats.total}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Succesvol</p>
                        <p className="text-2xl font-bold text-green-600">{stats.successful}</p>
                      </div>
                    </div>

                    {stats.failed > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Mislukt</p>
                          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                        </div>
                      </div>
                    )}

                    {stats.skipped > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Overgeslagen</p>
                          <p className="text-2xl font-bold">{stats.skipped}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Errors */}
              {stats.errors && stats.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base text-destructive">Errors</CardTitle>
                    <CardDescription>Posts die niet succesvol verwerkt konden worden</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {stats.errors.map((error, index) => (
                          <div key={index} className="p-3 border rounded-lg bg-destructive/5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{error.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{error.error}</p>
                              </div>
                              <Badge variant="destructive" className="text-xs">Error</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!isGenerating && !stats && (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Annuleer
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Batch Generatie
              </Button>
            </>
          )}
          
          {stats && (
            <Button onClick={handleClose}>
              Sluiten
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
