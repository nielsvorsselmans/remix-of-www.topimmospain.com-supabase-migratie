import { Home, Settings, Phone, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function BeheerDashboardContent() {
  return (
    <div className="space-y-8">
      {/* Owner Welcome Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/20 p-4">
              <Home className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Welkom, Eigenaar!</h2>
              <p className="text-muted-foreground mt-1">
                Gefeliciteerd met je woning in Spanje. Hier vind je alles over het beheer van je investering.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Aankoop afgerond</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Je aankoop is succesvol afgerond. Bekijk alle documenten.
                </p>
                <Button variant="link" asChild className="px-0 mt-2">
                  <Link to="/dashboard/documenten">
                    Bekijk documenten
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Property Management</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Informatie over onderhoud en beheer van je woning.
                </p>
                <Button variant="link" asChild className="px-0 mt-2">
                  <Link to="/dashboard/beheer">
                    Meer info
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Contact</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vragen over je woning? Neem contact op met ons team.
                </p>
                <Button variant="link" asChild className="px-0 mt-2">
                  <Link to="/dashboard/contact">
                    Contact opnemen
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wat kun je hier verwachten?</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <p>
            Deze sectie wordt nog verder uitgebouwd met functies zoals:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Overzicht van je vastgoed portfolio</li>
            <li>Onderhoudsstatus en planning</li>
            <li>Huurinkomsten en financieel overzicht</li>
            <li>Direct contact met property managers</li>
            <li>Documenten en contracten beheer</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
