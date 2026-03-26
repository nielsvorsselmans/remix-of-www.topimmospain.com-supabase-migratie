import { Link } from "react-router-dom";
import { TrendingUp, Sun, Compass, MessageCircle } from "lucide-react";
import { useClarity } from "@/hooks/useClarity";

const journeyPaths = [
  {
    id: "rendement",
    icon: TrendingUp,
    label: "Ik zoek rendement",
    description: "Ontdek huurinkomsten en waardestijging in de Spaanse vastgoedmarkt.",
    link: "/rendement",
  },
  {
    id: "genieten",
    icon: Sun,
    label: "Ik wil ook zelf genieten",
    description: "Combineer een slimme investering met je eigen vakantiewoning.",
    link: "/eigengebruik",
  },
  {
    id: "orienteren",
    icon: Compass,
    label: "Ik wil eerst oriënteren",
    description: "Leer stap voor stap hoe investeren in Spanje werkt.",
    link: "/portaal",
  },
  {
    id: "gezien",
    icon: MessageCircle,
    label: "Ik heb al een pand gezien",
    description: "Plan een gesprek om de volgende stappen te bespreken.",
    link: "/contact",
  },
];

export const JourneyPathsSection = () => {
  const { trackEvent } = useClarity();

  const handleClick = (pathId: string, pathLabel: string) => {
    trackEvent("journey_path_selected", {
      path_id: pathId,
      path_label: pathLabel,
    });
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Waar sta jij in je oriëntatie?
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Iedereen begint ergens anders. Kies wat het best bij jou past — wij helpen je verder.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {journeyPaths.map((path) => (
            <Link
              key={path.id}
              to={path.link}
              onClick={() => handleClick(path.id, path.label)}
              className="group rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <path.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  {path.label}
                </h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {path.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
