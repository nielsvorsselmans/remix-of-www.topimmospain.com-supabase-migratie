import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Save } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { PartnerKlant, useAddPartnerNote } from "@/hooks/usePartnerKlant";

interface PartnerKlantNotitiesCardProps {
  klant: PartnerKlant;
  partnerId: string;
}

export function PartnerKlantNotitiesCard({ klant, partnerId }: PartnerKlantNotitiesCardProps) {
  const [note, setNote] = useState("");
  const addNote = useAddPartnerNote();

  const handleAddNote = async () => {
    if (!note.trim()) return;
    try {
      await addNote.mutateAsync({
        crmLeadId: klant.id,
        partnerId,
        note: note.trim(),
      });
      setNote("");
      toast.success("Notitie toegevoegd");
    } catch (error) {
      toast.error("Kon notitie niet toevoegen");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Notities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add note form */}
        <div className="space-y-2">
          <Textarea
            placeholder="Voeg een notitie toe..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <Button
            onClick={handleAddNote}
            disabled={!note.trim() || addNote.isPending}
            size="sm"
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            Opslaan
          </Button>
        </div>

        {/* Existing notes */}
        {klant.notes.length > 0 ? (
          <div className="space-y-3 pt-2 border-t">
            {klant.notes.map((n) => (
              <div key={n.id} className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{n.note}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(n.created_at), "d MMM yyyy HH:mm", { locale: nl })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nog geen notities
          </p>
        )}
      </CardContent>
    </Card>
  );
}
