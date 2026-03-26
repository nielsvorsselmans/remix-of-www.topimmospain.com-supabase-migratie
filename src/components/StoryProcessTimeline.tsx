import { ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const StoryProcessTimeline = () => {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-card rounded-2xl shadow-soft border border-border/50 p-8 sm:p-12">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-7 h-7 text-primary" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Jouw reis begint hier
          </h2>
          
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto">
            Elk verhaal is anders, maar de begeleiding is altijd persoonlijk. 
            Wij luisteren naar jouw wensen en begeleiden je stap voor stap — op jouw tempo.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/orientatie">
              <Button 
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-8 py-6 text-lg shadow-elegant"
              >
                Ontdek hoe wij werken
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button 
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-8 py-6 text-lg"
              >
                Plan een gesprek
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
