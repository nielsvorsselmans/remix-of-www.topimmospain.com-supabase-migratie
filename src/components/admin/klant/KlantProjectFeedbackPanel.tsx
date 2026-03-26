import { useState, useEffect } from "react";
import { MessageSquare, Save, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface KlantProjectFeedbackPanelProps {
  customerNotes: string | null;
  adminNotes: string | null;
  updatedAt: string | null;
  onSaveAdminNotes: (notes: string) => Promise<void>;
  isUpdating: boolean;
}

export function KlantProjectFeedbackPanel({
  customerNotes,
  adminNotes,
  updatedAt,
  onSaveAdminNotes,
  isUpdating,
}: KlantProjectFeedbackPanelProps) {
  const [localAdminNotes, setLocalAdminNotes] = useState(adminNotes || "");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalAdminNotes(adminNotes || "");
    setHasChanges(false);
  }, [adminNotes]);

  const handleAdminNotesChange = (value: string) => {
    setLocalAdminNotes(value);
    setHasChanges(value !== (adminNotes || ""));
  };

  const handleSave = async () => {
    await onSaveAdminNotes(localAdminNotes);
    setHasChanges(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: nl });
    } catch {
      return null;
    }
  };

  return (
    <div className="border-t mt-3 pt-3 space-y-3">
      {/* Customer Feedback Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Klant Feedback
          </span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3 border border-blue-100 dark:border-blue-900">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {customerNotes}
          </p>
          {updatedAt && (
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {formatDate(updatedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Admin Response Section */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Save className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Admin Notitie
          </span>
        </div>
        <Textarea
          value={localAdminNotes}
          onChange={(e) => handleAdminNotesChange(e.target.value)}
          placeholder="Voeg een interne notitie toe over dit project..."
          className="min-h-[80px] text-sm resize-none"
          disabled={isUpdating}
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
            className="h-8"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="h-3 w-3 mr-1" />
                Opslaan
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
