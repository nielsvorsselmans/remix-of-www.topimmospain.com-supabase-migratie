import { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { SignupDialog } from "@/components/SignupDialog";
import { cn } from "@/lib/utils";

interface BlogToolsCTAProps {
  variant: "sidebar" | "inline";
  category?: string;
}

const categoryHeadlines: Record<string, string> = {
  "Financiering": "Bereken je hypotheek en aankoopkosten",
  "Belastingen": "Bereken de fiscale impact",
  "Verhuur": "Bereken je verwacht rendement",
  "Juridisch": "Bereken je totale aankoopkosten",
};

const tools = [
  {
    icon: Calculator,
    title: "Rekentools",
    description: "Hypotheek, aankoopkosten & rendement",
    path: "/dashboard/calculators",
  },
  {
    icon: BookOpen,
    title: "Oriëntatiegids",
    description: "Jouw stap-voor-stap plan",
    path: "/dashboard/orientatie",
  },
];

export function BlogToolsCTA({ variant, category }: BlogToolsCTAProps) {
  const { user } = useAuth();
  const [showSignup, setShowSignup] = useState(false);

  const headline = category && categoryHeadlines[category]
    ? categoryHeadlines[category]
    : "Zelf doorrekenen?";

  const isInline = variant === "inline";

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-card overflow-hidden",
          isInline
            ? "p-6 md:p-8"
            : "p-4"
        )}
      >
        <p className={cn(
          "font-semibold text-foreground",
          isInline ? "text-lg mb-1" : "text-sm mb-0.5"
        )}>
          {headline}
        </p>
        <p className={cn(
          "text-muted-foreground mb-4",
          isInline ? "text-sm" : "text-xs"
        )}>
          Gebruik onze gratis tools om het concreet te maken.
        </p>

        <div className={cn(
          "grid gap-2",
          isInline ? "sm:grid-cols-2 gap-3" : "grid-cols-1"
        )}>
          {tools.map((tool) => {
            const content = (
              <div
                key={tool.title}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border/60 p-3 group",
                  "hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
                )}
              >
                <div className="shrink-0 p-2 rounded-md bg-primary/10 text-primary">
                  <tool.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {tool.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{tool.description}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            );

            if (user) {
              return (
                <Link key={tool.title} to={tool.path}>
                  {content}
                </Link>
              );
            }

            return (
              <div key={tool.title} onClick={() => setShowSignup(true)}>
                {content}
              </div>
            );
          })}
        </div>

        {!user && (
          <Button
            size={isInline ? "default" : "sm"}
            className="w-full mt-4"
            onClick={() => setShowSignup(true)}
          >
            Maak gratis account aan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      <SignupDialog
        open={showSignup}
        onOpenChange={setShowSignup}
        redirectUrl={typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "/dashboard"}
      />
    </>
  );
}
