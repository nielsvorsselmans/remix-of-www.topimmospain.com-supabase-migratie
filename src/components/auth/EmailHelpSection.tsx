import { HelpCircle, RefreshCw, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface EmailHelpSectionProps {
  email: string;
  resendCooldown: number;
  onResend: () => void;
  isLoading: boolean;
  variant?: "light" | "dark";
}

export function EmailHelpSection({
  email,
  resendCooldown,
  onResend,
  isLoading,
  variant = "dark"
}: EmailHelpSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLight = variant === "light";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger 
        className={cn(
          "flex items-center justify-center gap-1.5 text-sm w-full py-2 transition-colors",
          isLight 
            ? "text-muted-foreground hover:text-foreground" 
            : "text-white/60 hover:text-white"
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span>Geen e-mail ontvangen?</span>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3">
        <div 
          className={cn(
            "rounded-lg p-4 space-y-3 text-sm",
            isLight ? "bg-muted/50" : "bg-white/5"
          )}
        >
          <p className={cn(
            "font-medium",
            isLight ? "text-foreground" : "text-white"
          )}>
            Controleer het volgende:
          </p>
          
          <ul className={cn(
            "space-y-2 list-disc list-inside",
            isLight ? "text-muted-foreground" : "text-white/70"
          )}>
            <li>Check je <strong>spam of ongewenste mail</strong> map</li>
            <li>Controleer of <strong>{email}</strong> correct is</li>
            <li>Wacht een paar minuten - soms duurt het even</li>
          </ul>
          
          <div className="pt-2 flex flex-col gap-2">
            {resendCooldown > 0 ? (
              <p className={cn(
                "text-center py-2",
                isLight ? "text-muted-foreground" : "text-white/50"
              )}>
                <RefreshCw className="inline h-3.5 w-3.5 mr-1.5" />
                Opnieuw versturen in {resendCooldown}s
              </p>
            ) : (
              <button
                type="button"
                onClick={onResend}
                disabled={isLoading}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-colors",
                  isLight 
                    ? "bg-primary/10 text-primary hover:bg-primary/20" 
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <Mail className="h-4 w-4" />
                Verstuur nieuwe code
              </button>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
