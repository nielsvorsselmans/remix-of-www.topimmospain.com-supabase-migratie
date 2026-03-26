import { Check, X } from "lucide-react";

const welVoorJou = [
  {
    title: "Je zit in de oriëntatiefase",
    description: "Je wilt eerst begrijpen hoe het werkt, zonder druk om te beslissen.",
  },
  {
    title: "Je wilt helderheid over kosten en risico's",
    description: "We bespreken eerlijk wat de valkuilen zijn — niet alleen de mooie verhalen.",
  },
  {
    title: "Je hebt vragen die je liever anoniem stelt",
    description: "Via de chat kun je vragen stellen zonder dat iedereen weet wie je bent.",
  },
];

const nietVoorJou = [
  {
    title: "Je wilt direct een pand kopen",
    description: "Dit webinar is oriënterend, niet transactiegericht. We verkopen hier niets.",
  },
  {
    title: "Je zoekt specifiek financieel advies",
    description: "Voor persoonlijke situaties is een oriënterend gesprek geschikter.",
  },
];

export function WebinarVoordelen() {
  return (
    <section className="py-12 md:py-16 lg:py-24">
      <div className="container px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Voor wie is dit webinar — en voor wie niet
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg px-2">
              Een webinar is niet voor iedereen de juiste stap. Kijk of het bij jou past.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-8">
            {/* Wel voor jou */}
            <div className="bg-card border border-primary/20 rounded-xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Wel voor jou</h3>
              </div>
              <div className="space-y-3 md:space-y-4">
                {welVoorJou.map((item, index) => (
                  <div key={index} className="flex gap-2 md:gap-3">
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-foreground text-xs md:text-sm mb-0.5 md:mb-1">{item.title}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Niet voor jou */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-sm md:text-base text-foreground">Niet voor jou</h3>
              </div>
              <div className="space-y-3 md:space-y-4">
                {nietVoorJou.map((item, index) => (
                  <div key={index} className="flex gap-2 md:gap-3">
                    <X className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-foreground text-xs md:text-sm mb-0.5 md:mb-1">{item.title}</h4>
                      <p className="text-xs md:text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}