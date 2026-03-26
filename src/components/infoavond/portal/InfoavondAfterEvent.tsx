import { Gift, Plane, Check, Lock, FileText, Video, Building } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface InfoavondAfterEventProps {
  eventDate: string;
}

const tripIncludes = [
  "Retourvlucht vanaf België/Nederland",
  "3 nachten verblijf in de regio",
  "Begeleide bezichtigingen van projecten",
];

const upcomingExtras = [
  { icon: FileText, title: "Exclusieve Checklist" },
  { icon: Video, title: "Video Opname" },
  { icon: Building, title: "Projecttoegang" },
];

export function InfoavondAfterEvent({ eventDate }: InfoavondAfterEventProps) {
  const date = parseISO(eventDate);
  const formattedDate = format(date, "d MMMM", { locale: nl });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Na de avond
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Winactie - Compact */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Win een Oriëntatiereis</h3>
                <p className="text-xs text-muted-foreground">
                  Je doet automatisch mee!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Plane className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                Volledig verzorgde reis voor 2 naar Spanje t.w.v. €1.500
              </div>
            </div>

            <ul className="space-y-1.5">
              {tripIncludes.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Extras Locked - Compact */}
        <Card className="border-dashed border-2 bg-muted/10">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-muted-foreground">Binnenkort beschikbaar</h3>
                <p className="text-xs text-muted-foreground">
                  Na {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {upcomingExtras.map((extra, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full opacity-60"
                >
                  <extra.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{extra.title}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Je ontvangt een email zodra de extra's beschikbaar zijn
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
