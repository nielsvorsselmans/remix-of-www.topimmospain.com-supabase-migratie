import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowRight, LogIn, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ROICallToActionProps {
  totalROI: number;
  investmentYears: number;
}

export function ROICallToAction({ totalROI, investmentYears }: ROICallToActionProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      {/* Main CTA Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary flex-shrink-0">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg">
                Wil je deze berekening bespreken?
              </h3>
              <p className="text-sm text-muted-foreground">
                Onze adviseurs helpen je graag met het interpreteren van deze cijfers 
                en het toetsen van je aannames aan de realiteit.
              </p>
            </div>
            <Button asChild className="gap-2 flex-shrink-0">
              <a href="https://calendly.com/topimmospain/orientatie" target="_blank" rel="noopener noreferrer">
                Plan een gesprek
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Login prompt for non-authenticated users */}
      {!user && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">Tip:</span>{" "}
                  <span className="text-muted-foreground">
                    Wist je dat je scenario's kunt opslaan en vergelijken? 
                    Log in om meerdere berekeningen naast elkaar te zetten.
                  </span>
                </p>
              </div>
              <Button variant="outline" size="sm" asChild className="gap-2 flex-shrink-0">
                <Link to="/auth">
                  <LogIn className="h-4 w-4" />
                  Inloggen
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
