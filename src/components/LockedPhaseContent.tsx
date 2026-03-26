import { Lock, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LockedPhaseContentProps {
  phaseName: string;
  phaseNumber: number;
  title: string;
  description: string;
  comingSoonFeatures: string[];
  ctaText?: string;
  ctaLink?: string;
}

export function LockedPhaseContent({
  phaseName,
  phaseNumber,
  title,
  description,
  comingSoonFeatures,
  ctaText = "Plan een oriëntatiegesprek",
  ctaLink = "/afspraak"
}: LockedPhaseContentProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-muted/50 rounded-full p-4 mb-6">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <Badge variant="outline" className="mb-4">
        Fase {phaseNumber}: {phaseName}
      </Badge>
      
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      
      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Hier vind je straks:</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-left">
            {comingSoonFeatures.map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      
      <Link to={ctaLink} className="mt-6">
        <Button>
          {ctaText}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
