import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { Shield, Users, MapPin, ArrowRight } from "lucide-react";

const trustItems = [
  { icon: Shield, label: "5+ jaar ervaring" },
  { icon: Users, label: "250+ klanten begeleid" },
  { icon: MapPin, label: "Costa Cálida specialist" },
];

export function LarsIntroduction() {
  const isMobile = useIsMobile();

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardContent className={isMobile ? "p-4" : "p-6"}>
        <div className="space-y-4">
          <div>
            <h3 className={`${isMobile ? "text-base" : "text-xl"} font-semibold text-foreground`}>
              Hallo, ik ben Lars 👋
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Oprichter Viva Vastgoed
            </p>
          </div>

          <p className={`text-muted-foreground leading-relaxed ${isMobile ? "text-sm" : ""}`}>
            Al meer dan 5 jaar help ik Nederlandse investeerders bij hun eerste
            stappen in Spanje. Geen verkooppraatjes, wel eerlijk advies — zodat
            jij met vertrouwen de juiste keuze maakt.
          </p>

          <div className="flex flex-wrap gap-2">
            {trustItems.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                <Icon className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>

          <Link
            to="/over-ons"
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Lees meer over onze aanpak
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
