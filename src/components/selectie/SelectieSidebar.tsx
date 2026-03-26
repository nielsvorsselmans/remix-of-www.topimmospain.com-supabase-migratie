import { MapPin } from "lucide-react";
import { SelectieHowItWorks } from "./SelectieHowItWorks";

interface SelectieSidebarProps {
  interestedCount: number;
}

export function SelectieSidebar({ interestedCount }: SelectieSidebarProps) {
  return (
    <div className="space-y-4">
      {/* How it works - vertical */}
      <SelectieHowItWorks interestedCount={interestedCount} variant="vertical" />

      {/* Lars contact block - compact */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Jouw adviseur</p>
        <h3 className="text-sm font-semibold text-foreground">
          Persoonlijk geselecteerd 🎯
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Deze projecten zijn speciaal voor jou uitgekozen op basis van jouw wensen en budget.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Oprichter Viva Vastgoed</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">250+ klanten</span>
        </div>
        <div className="flex gap-2 pt-1">
          <a
            href="https://wa.me/32468122903?text=Hallo%20Lars%2C%20ik%20heb%20een%20vraag%20over%20mijn%20projectselectie"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366]/10 px-2.5 py-1.5 text-xs font-medium text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
          >
            WhatsApp
          </a>
          <a
            href="tel:+32468122903"
            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Bel Lars
          </a>
        </div>
      </div>

      {/* Social proof */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs italic text-foreground leading-relaxed">
          "De meeste investeerders kiezen 2 tot 5 projecten om ter plaatse te bezichtigen."
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">— Op basis van klantdata 2024</p>
      </div>

      {/* Bezichtiging CTA */}
      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-foreground">Kom het zelf ervaren</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We plannen alles voor je — van de route tot de afspraken.
        </p>
        <a
          href="/dashboard/bezichtiging"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <MapPin className="h-3.5 w-3.5" />
          Bespreek je bezichtiging
        </a>
      </div>
    </div>
  );
}
