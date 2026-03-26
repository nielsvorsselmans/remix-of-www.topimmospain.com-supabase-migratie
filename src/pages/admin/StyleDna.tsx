import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Dna, Plus, FileText, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { nl } from "date-fns/locale";
import {
  useStyleExamples,
  useAddStyleExample,
  useToggleStyleExample,
  useDeleteStyleExample,
} from "@/hooks/useStyleExamples";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ARCHETYPES = [
  { value: "lead_magnet", label: "Lead Magnet" },
  { value: "hot_take", label: "Hot Take" },
  { value: "authority", label: "Authority & Lesson" },
];

export default function StyleDna() {
  const [contentText, setContentText] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);

  const { data: examples, isLoading } = useStyleExamples();
  const addExample = useAddStyleExample();
  const toggleExample = useToggleStyleExample();
  const deleteExample = useDeleteStyleExample();

  const handleAdd = () => {
    if (!contentText.trim()) return;
    addExample.mutate(
      { content_text: contentText.trim(), archetype: selectedArchetype },
      {
        onSuccess: () => {
          setContentText("");
          setSelectedArchetype(null);
        },
      }
    );
  };

  const activeCount = examples?.filter((e) => e.is_active).length || 0;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Dna className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Style DNA</h1>
            <p className="text-muted-foreground">
              Train de AI met jouw beste posts om je unieke schrijfstijl te imiteren
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Totaal Voorbeelden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{examples?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Actieve Voorbeelden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold text-green-600">{activeCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={activeCount >= 3 ? "default" : "secondary"}>
                {activeCount >= 3 ? "Klaar voor gebruik" : "Voeg meer voorbeelden toe"}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nieuw Voorbeeld Toevoegen
            </CardTitle>
            <CardDescription>
              Plak een succesvolle LinkedIn post om de AI jouw stijl te leren
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Plak hier een succesvolle LinkedIn post die je stijl goed representeert...

Tip: Kies posts met:
• Sterke opening (hook)
• Jouw typische zinsbouw en ritme
• Karakteristieke witregels en opmaak
• Je kenmerkende tone of voice"
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <Select
                value={selectedArchetype || "all"}
                onValueChange={(v) => setSelectedArchetype(v === "all" ? null : v)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Archetype (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle types</SelectItem>
                  {ARCHETYPES.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAdd}
                disabled={!contentText.trim() || addExample.isPending}
                className="w-full sm:w-auto"
              >
                {addExample.isPending ? "Toevoegen..." : "Voeg toe aan DNA"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Examples List */}
        <Card>
          <CardHeader>
            <CardTitle>Opgeslagen Voorbeelden</CardTitle>
            <CardDescription>
              Deze voorbeelden worden random gekozen bij het genereren van content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : !examples?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Dna className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nog geen voorbeelden toegevoegd.</p>
                <p className="text-sm">Voeg minimaal 3 voorbeelden toe voor beste resultaten.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {examples.map((example) => (
                  <div
                    key={example.id}
                    className={`p-4 border rounded-lg transition-opacity ${
                      example.is_active ? "" : "opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {example.archetype && (
                            <Badge variant="outline" className="text-xs">
                              {ARCHETYPES.find((a) => a.value === example.archetype)?.label ||
                                example.archetype}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(example.created_at), "d MMM yyyy", { locale: nl })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap line-clamp-4">
                          {example.content_text}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Actief</span>
                          <Switch
                            checked={example.is_active}
                            onCheckedChange={(checked) =>
                              toggleExample.mutate({ id: example.id, is_active: checked })
                            }
                          />
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Voorbeeld verwijderen?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Dit kan niet ongedaan worden gemaakt.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuleren</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteExample.mutate(example.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Verwijderen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
