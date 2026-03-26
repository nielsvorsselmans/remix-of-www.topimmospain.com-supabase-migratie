import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Lightbulb, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  link?: string;
}

interface TripPreparationChecklistProps {
  tripId: string;
  projectCount: number;
}

const getChecklistItems = (projectCount: number): ChecklistItem[] => [
  {
    id: "review_projects",
    label: "Bekijk alle projectpagina's",
    description: projectCount > 0 ? `${projectCount} projecten om te bekijken` : "Je geselecteerde projecten",
    link: "/dashboard/projecten"
  },
  {
    id: "download_floorplans",
    label: "Download grondplannen",
    description: "Handig om te printen of op je telefoon te hebben",
    link: "/dashboard/projecten"
  },
  {
    id: "check_availability",
    label: "Controleer beschikbaarheid",
    description: "Bekijk welke woningen nog beschikbaar zijn",
    link: "/dashboard/projecten"
  },
  {
    id: "prepare_questions",
    label: "Noteer je vragen",
    description: "Per project: wat wil je weten?"
  },
  {
    id: "check_travel",
    label: "Controleer reisgegevens",
    description: "Vluchttijden, accommodatie, vervoer"
  }
];

export function TripPreparationChecklist({ tripId, projectCount }: TripPreparationChecklistProps) {
  const storageKey = `trip-checklist-${tripId}`;
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const items = getChecklistItems(projectCount);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCheckedItems(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error("Failed to parse checklist state");
      }
    }
  }, [storageKey]);

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const completedCount = checkedItems.size;
  const totalCount = items.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Voorbereiding Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} van {totalCount} afgerond
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="space-y-2">
          {items.map(item => {
            const isChecked = checkedItems.has(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center rounded-lg border transition-colors ${
                  isChecked 
                    ? "bg-primary/5 border-primary/20" 
                    : "hover:bg-accent"
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="flex-1 flex items-start gap-3 p-3 text-left"
                >
                  {isChecked ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${isChecked ? "text-muted-foreground" : ""}`}>
                      {item.label}
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </button>
                {item.link && (
                  <Link
                    to={item.link}
                    className="shrink-0 p-3 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={`Ga naar ${item.label}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
