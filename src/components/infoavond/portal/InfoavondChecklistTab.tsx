import { useState, useEffect } from "react";
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

export const InfoavondChecklistTab = () => {
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
    <div className="space-y-6">
      {/* Intro text */}
      <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Haal het meeste uit de infoavond</p>
            <p className="text-xs text-muted-foreground mt-1">
              Doorloop onderstaande punten om goed voorbereid te komen. Zo kun je gerichte vragen stellen 
              en krijg je het meeste uit de avond.
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Voorbereiding</span>
          <div className="flex items-center gap-2">
            {completedCount === totalCount && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Klaar!
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checklistItems.map((item) => (
          <div 
            key={item.id}
            className={`flex items-start gap-3 p-4 rounded-lg transition-colors cursor-pointer border ${
              checkedItems.includes(item.id) 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-muted/30 border-transparent hover:bg-muted/50'
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
                className={`text-sm font-medium cursor-pointer block ${
                  checkedItems.includes(item.id) 
                    ? 'text-muted-foreground line-through' 
                    : 'text-foreground'
                }`}
              >
                {item.label}
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
