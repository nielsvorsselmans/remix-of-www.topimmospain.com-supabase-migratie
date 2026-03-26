import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, BookOpen, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function BlogSoftCTA() {
  const { user } = useAuth();

  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/10">
      <div className="container max-w-4xl mx-auto px-4 text-center space-y-6">
        <div className="space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Wil je alles in je eigen tempo ontdekken?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            In het Portaal vind je alles wat je nodig hebt om een weloverwogen keuze te maken — 
            van regio-informatie tot financieringsopties. Gratis en vrijblijvend.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={user ? "/dashboard" : "/portaal"}>
            <Button
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium group"
            >
              <Compass className="mr-2 h-5 w-5" />
              {user ? "Naar mijn Dashboard" : "Open het Portaal"}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/orientatiegids">
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-2"
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Bekijk de oriëntatiegids
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          Liever eerst persoonlijk advies?{" "}
          <Link to="/afspraak" className="text-primary hover:underline font-medium">
            Plan een vrijblijvend gesprek
          </Link>
        </p>
      </div>
    </section>
  );
}
