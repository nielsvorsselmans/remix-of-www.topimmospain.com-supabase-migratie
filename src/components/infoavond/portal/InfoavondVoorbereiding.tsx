import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Lightbulb, CheckCircle2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
}

const checklistItems: ChecklistItem[] = [
  {
    id: "budget",
    label: "Budget bepaald",
    description: "Hoeveel wil je investeren in Spaans vastgoed?"
  },
  {
    id: "goal",
    label: "Doel helder",
    description: "Investering, eigen gebruik, of een combinatie?"
  },
  {
    id: "region",
    label: "Regio's verkend",
    description: "Welke regio's in Spanje spreken je aan?"
  },
  {
    id: "questions",
    label: "Vragen genoteerd",
    description: "Schrijf je vragen op om ze tijdens de avond te stellen"
  }
];

const STORAGE_KEY = "infoavond-checklist";

export const InfoavondVoorbereiding = () => {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCheckedItems(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const newItems = prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    });
  };

  const completedCount = checkedItems.length;
  const totalCount = checklistItems.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Bereid je voor
          </CardTitle>
          {completedCount === totalCount && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Klaar!
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div 
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {completedCount} van {totalCount} afgerond
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {checklistItems.map((item) => (
          <div 
            key={item.id}
            className={`flex items-start gap-3 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
              checkedItems.includes(item.id) ? 'bg-muted/30' : ''
            }`}
            onClick={() => toggleItem(item.id)}
          >
            <Checkbox 
              id={item.id}
              checked={checkedItems.includes(item.id)}
              onCheckedChange={() => toggleItem(item.id)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <label 
                htmlFor={item.id}
                className={`text-sm font-medium cursor-pointer ${
                  checkedItems.includes(item.id) 
                    ? 'text-muted-foreground line-through' 
                    : 'text-foreground'
                }`}
              >
                {item.label}
              </label>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
