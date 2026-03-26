import { Lock, FileText, Video, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface InfoavondExtrasLockedProps {
  eventDate: string;
}

const upcomingExtras = [
  {
    icon: FileText,
    title: "Exclusieve Checklist",
    description: "Complete checklist voor investeren in Spanje",
  },
  {
    icon: Video,
    title: "Video Opname",
    description: "Bekijk de infoavond terug wanneer je wilt",
  },
  {
    icon: Building,
    title: "Projecttoegang",
    description: "Directe toegang tot exclusieve projecten",
  },
];

export function InfoavondExtrasLocked({ eventDate }: InfoavondExtrasLockedProps) {
  const date = parseISO(eventDate);
  const formattedDate = format(date, "d MMMM", { locale: nl });

  return (
    <Card className="border-dashed border-2 bg-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          <Lock className="w-5 h-5" />
          Binnenkort beschikbaar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Na de infoavond op {formattedDate} ontvang je hier:
        </p>

        <div className="grid gap-3">
          {upcomingExtras.map((extra, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-3 bg-background/50 rounded-lg opacity-60"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <extra.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">{extra.title}</p>
                <p className="text-xs text-muted-foreground">{extra.description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Je ontvangt een email zodra de extra's beschikbaar zijn
        </p>
      </CardContent>
    </Card>
  );
}
