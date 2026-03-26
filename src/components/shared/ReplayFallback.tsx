import { Video, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ReplayFallbackProps {
  type: 'webinar' | 'infoavond';
  onRequestReplay?: () => void;
}

export function ReplayFallback({ type, onRequestReplay }: ReplayFallbackProps) {
  const isWebinar = type === 'webinar';
  
  return (
    <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardContent className="py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          {isWebinar ? (
            <PlayCircle className="h-6 w-6 text-primary" />
          ) : (
            <Video className="h-6 w-6 text-primary" />
          )}
        </div>
        <h3 className="font-semibold mb-2">
          {isWebinar 
            ? "Past geen van deze datums?" 
            : "Kun je niet fysiek aanwezig zijn?"
          }
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          {isWebinar 
            ? "Ontvang de opname van het vorige webinar + presentatieslides direct in je inbox."
            : "Schrijf je in voor ons gratis online webinar en ontdek alles vanuit huis."
          }
        </p>
        <Button variant="outline" onClick={onRequestReplay} className="gap-2">
          <PlayCircle className="h-4 w-4" />
          {isWebinar ? "Ontvang de replay" : "Bekijk het webinar"}
        </Button>
      </CardContent>
    </Card>
  );
}
