import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface InfoavondEditRegistrationProps {
  registrationId: string;
  currentPersons: number;
  eventTitle: string;
}

export const InfoavondEditRegistration = ({ 
  registrationId, 
  currentPersons,
  eventTitle 
}: InfoavondEditRegistrationProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [numberOfPersons, setNumberOfPersons] = useState(currentPersons.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);
  const queryClient = useQueryClient();

  const handleUpdatePersons = async () => {
    if (parseInt(numberOfPersons) === currentPersons) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("info_evening_registrations")
        .update({ number_of_persons: parseInt(numberOfPersons) })
        .eq("id", registrationId);

      if (error) throw error;

      toast.success("Registratie bijgewerkt", {
        description: `Je komt nu met ${numberOfPersons} ${parseInt(numberOfPersons) === 1 ? 'persoon' : 'personen'}.`
      });
      
      queryClient.invalidateQueries({ queryKey: ["info-evening-registration"] });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating registration:", error);
      toast.error("Er ging iets mis bij het bijwerken");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnregister = async () => {
    setIsUnregistering(true);
    try {
      const { error } = await supabase
        .from("info_evening_registrations")
        .delete()
        .eq("id", registrationId);

      if (error) throw error;

      toast.success("Afmelding bevestigd", {
        description: "Je bent afgemeld voor de infoavond."
      });
      
      queryClient.invalidateQueries({ queryKey: ["info-evening-registration"] });
    } catch (error) {
      console.error("Error unregistering:", error);
      toast.error("Er ging iets mis bij het afmelden");
    } finally {
      setIsUnregistering(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Wijzig registratie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Aantal personen
              </label>
              <Select value={numberOfPersons} onValueChange={setNumberOfPersons}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 persoon</SelectItem>
                  <SelectItem value="2">2 personen</SelectItem>
                  <SelectItem value="3">3 personen</SelectItem>
                  <SelectItem value="4">4 personen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleUpdatePersons}
                disabled={isUpdating}
              >
                {isUpdating ? "Opslaan..." : "Opslaan"}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setNumberOfPersons(currentPersons.toString());
                  setIsEditing(false);
                }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Je komt momenteel met <span className="font-medium text-foreground">{currentPersons} {currentPersons === 1 ? 'persoon' : 'personen'}</span>.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Aantal wijzigen
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Afmelden
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Je staat op het punt om je af te melden voor "{eventTitle}". 
                      Je kunt je later opnieuw aanmelden als er nog plaatsen beschikbaar zijn.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Behouden</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleUnregister}
                      disabled={isUnregistering}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isUnregistering ? "Afmelden..." : "Ja, afmelden"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
