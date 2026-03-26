import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, Pencil } from "lucide-react";
import { PartnerKlant } from "@/hooks/usePartnerKlant";
import { EditPartnerKlantContactDialog } from "./EditPartnerKlantContactDialog";

interface PartnerKlantContactCardProps {
  klant: PartnerKlant;
}

export function PartnerKlantContactCard({ klant }: PartnerKlantContactCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Contactgegevens
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {klant.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a href={`mailto:${klant.email}`} className="hover:underline truncate">
                {klant.email}
              </a>
            </div>
          )}
          {klant.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <a href={`tel:${klant.phone}`} className="hover:underline">
                {klant.phone}
              </a>
            </div>
          )}
          {!klant.email && !klant.phone && (
            <p className="text-sm text-muted-foreground">Geen contactgegevens beschikbaar</p>
          )}
        </CardContent>
      </Card>

      <EditPartnerKlantContactDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        klant={klant}
      />
    </>
  );
}
