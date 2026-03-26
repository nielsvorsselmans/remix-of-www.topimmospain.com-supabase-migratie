import { Gift, Plane, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tripIncludes = [
  "Retourvlucht vanaf België/Nederland",
  "3 nachten verblijf in de regio",
  "Begeleide bezichtigingen van projecten",
  "Lokale tips en kennismaking met de regio",
  "Persoonlijke begeleiding door het Viva team",
];

export function InfoavondWinactiePreview() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Exclusieve Winactie
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Je doet mee!
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Plane className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Win een Oriëntatiereis voor 2</h3>
            <p className="text-muted-foreground text-sm">
              Als deelnemer aan de infoavond maak je kans op een volledig verzorgde oriëntatiereis naar Spanje t.w.v. €1.500
            </p>
          </div>
        </div>

        <div className="bg-background/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium mb-3">De reis omvat:</p>
          <ul className="space-y-2">
            {tripIncludes.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          De trekking vindt plaats na afloop van de infoavond. De winnaar wordt persoonlijk gecontacteerd.
        </p>
      </CardContent>
    </Card>
  );
}
