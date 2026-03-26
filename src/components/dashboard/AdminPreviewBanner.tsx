import { useState } from "react";
import { Eye, X, ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerPreview } from "@/contexts/CustomerPreviewContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";
import { PhasePreviewSelector } from "@/components/admin/PhasePreviewSelector";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AdminPreviewBanner() {
  const { isPreviewMode, previewCustomer, isLoadingPreview, exitPreview } = useCustomerPreview();
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [showPhaseSelector, setShowPhaseSelector] = useState(false);

  const isDashboard = location.pathname.startsWith("/dashboard");
  const showMobilePhaseSelector = isMobile && isAdmin && isDashboard;

  if (!isPreviewMode && !showMobilePhaseSelector) {
    return null;
  }

  const customerName = previewCustomer
    ? [previewCustomer.first_name, previewCustomer.last_name].filter(Boolean).join(" ") || "Onbekend"
    : "Laden...";

  const customerEmail = previewCustomer?.email;

  return (
    <div className="sticky top-0 z-50">
      {isPreviewMode && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium min-w-0 break-words">
              Admin Preview: Je bekijkt het portaal als{" "}
              <strong>{isLoadingPreview ? "..." : customerName}</strong>
              {customerEmail && (
                <span className="ml-1 opacity-75">({customerEmail})</span>
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitPreview}
            className="h-7 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Terug naar admin
          </Button>
        </div>
      )}

      {showMobilePhaseSelector && (
        <Collapsible open={showPhaseSelector} onOpenChange={setShowPhaseSelector}>
          <div className="bg-amber-100 border-b border-amber-200 px-4 py-1.5">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-800 hover:bg-amber-200 w-full justify-center gap-1.5"
              >
                <Wrench className="h-3 w-3" />
                Fase Preview
                <span className="text-[10px] opacity-60">{showPhaseSelector ? "▲" : "▼"}</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="bg-amber-50 border-b border-amber-200 px-2 py-2">
              <PhasePreviewSelector />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
