import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lightbulb, Star, Filter, Compass } from "lucide-react";

interface NoMatchFoundProps {
  rejectedCount: number;
}

export function NoMatchFoundCard({ rejectedCount }: NoMatchFoundProps) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
              <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Geen match gevonden?
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Je hebt {rejectedCount} project{rejectedCount !== 1 ? 'en' : ''} bekeken maar nog geen match. 
                Laat ons weten wat je zoekt, dan vinden we nieuwe opties.
              </p>
            </div>
          </div>
          
          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="bg-amber-600 hover:bg-amber-700 flex-1">
              <Link to="/afspraak">
                <MessageSquare className="mr-2 h-4 w-4" />
                Plan een gesprek
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-amber-300 dark:border-amber-700">
              <Link to="/dashboard/ontdekken">
                <Compass className="mr-2 h-4 w-4" />
                Zelf verder zoeken
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TooManyPendingProps {
  pendingCount: number;
  hasAdminProjects: boolean;
}

export function TooManyPendingCard({ pendingCount, hasAdminProjects }: TooManyPendingProps) {
  return (
    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Veel projecten om te beoordelen?
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Je hebt {pendingCount} projecten te beoordelen. Enkele tips om sneller te kiezen:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-0.5 mt-2">
              {hasAdminProjects && (
                <li className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-primary inline" />
                  Begin met projecten van je adviseur - deze zijn speciaal voor jou geselecteerd
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-blue-500 inline" />
                Sorteer op prijs om snel te filteren op budget
              </li>
              <li>Gebruik de compacte weergave voor een sneller overzicht</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
