import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, StickyNote, RefreshCw, Send } from "lucide-react";
import { Klant } from "@/hooks/useKlant";
import { useGHLNotes, useCreateGHLNote, GHLNote } from "@/hooks/useGHLNotes";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface KlantNotitiesCardProps {
  klant: Klant;
}

function NoteItem({ note }: { note: GHLNote }) {
  const displayDate = note.ghl_date_added || note.created_at;
  
  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <p className="text-sm whitespace-pre-wrap">{note.body}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span>{format(new Date(displayDate), "d MMM yyyy · HH:mm", { locale: nl })}</span>
        <span>·</span>
        <Badge variant="outline" className="text-xs h-5">
          {note.source === 'ghl' ? 'GoHighLevel' : 'Admin Portal'}
        </Badge>
      </div>
    </div>
  );
}

export function KlantNotitiesCard({ klant }: KlantNotitiesCardProps) {
  const [newNote, setNewNote] = useState("");
  const { data: notes, isLoading, refetch, isRefetching } = useGHLNotes(
    klant.ghl_contact_id || null,
    klant.id
  );
  const createNote = useCreateGHLNote();

  const handleSubmit = async () => {
    if (!newNote.trim()) return;

    try {
      const result = await createNote.mutateAsync({
        ghlContactId: klant.ghl_contact_id || null,
        crmLeadId: klant.id,
        body: newNote.trim(),
      });
      
      setNewNote("");
      
      if (result.synced_to_ghl) {
        toast.success("Notitie opgeslagen en gesynchroniseerd met GHL");
      } else {
        toast.success("Notitie lokaal opgeslagen");
      }
    } catch (error) {
      toast.error("Kon notitie niet opslaan");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notities
            {klant.ghl_contact_id && (
              <Badge variant="outline" className="text-xs">GHL Sync</Badge>
            )}
          </CardTitle>
          {klant.ghl_contact_id && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Synchroniseren met GHL"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New note input */}
        <div className="space-y-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Nieuwe notitie toevoegen..."
            className="min-h-[80px] resize-none"
          />
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={!newNote.trim() || createNote.isPending}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {createNote.isPending ? 'Opslaan...' : 'Notitie toevoegen'}
          </Button>
        </div>

        {/* Notes list */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !notes?.length ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nog geen notities
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {notes.map(note => (
              <NoteItem key={note.id} note={note} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
