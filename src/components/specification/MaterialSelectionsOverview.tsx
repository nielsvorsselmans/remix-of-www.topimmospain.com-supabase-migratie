import { useMaterialSelections, MATERIAL_CATEGORIES } from "@/hooks/useMaterialSelections";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Palette, CheckCircle2 } from "lucide-react";
import { MaterialCard } from "./MaterialCard";

interface MaterialSelectionsOverviewProps {
  saleId: string;
}

export function MaterialSelectionsOverview({ saleId }: MaterialSelectionsOverviewProps) {
  const { data: selections, isLoading } = useMaterialSelections(saleId);

  // Filter only customer-visible selections with chosen options
  const visibleSelections = selections?.filter(
    s => s.customer_visible && s.chosen_option_id
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!visibleSelections || visibleSelections.length === 0) {
    return null; // Don't show section if no material selections
  }

  // Group by category
  const groupedByCategory = visibleSelections.reduce((acc, selection) => {
    const category = selection.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(selection);
    return acc;
  }, {} as Record<string, typeof visibleSelections>);

  const totalSelections = visibleSelections.length;
  const decidedSelections = visibleSelections.filter(s => s.chosen_option_id).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Materiaalkeuzes
              {decidedSelections === totalSelections && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
            </CardTitle>
            <CardDescription>
              Overzicht van alle gekozen materialen voor jouw woning
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {Object.entries(groupedByCategory).map(([category, categorySelections]) => {
          const categoryLabel = MATERIAL_CATEGORIES.find(c => c.value === category)?.label || category;
          
          // Check if any selection in this category has notes
          const categoryNotes = categorySelections?.filter(s => s.notes).map(s => ({
            title: s.title,
            room: s.room,
            notes: s.notes
          }));
          
          return (
            <div key={category} className="space-y-4">
              <h4 className="font-medium text-sm uppercase tracking-wider text-muted-foreground border-b pb-2">
                {categoryLabel}
              </h4>
              
              {/* Show notes for this category if any exist */}
              {categoryNotes && categoryNotes.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  {categoryNotes.map((item, idx) => (
                    <div key={idx} className="text-sm">
                      {categoryNotes.length > 1 && (
                        <span className="font-medium text-muted-foreground">{item.title}: </span>
                      )}
                      <span>{item.notes}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categorySelections?.map((selection) => {
                  const chosenOption = selection.options?.find(
                    opt => opt.id === selection.chosen_option_id
                  );
                  
                  if (!chosenOption) return null;
                  
                  return (
                    <MaterialCard
                      key={selection.id}
                      selection={selection}
                      option={chosenOption}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
