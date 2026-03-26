import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, GripVertical, Star, MapPin, MessageSquare, Check, X } from "lucide-react";
import { useRemovePOIFromGuide, useUpdateGuidePOI, type CustomerTravelGuidePOI } from "@/hooks/useCustomerTravelGuides";

interface SelectedPOIsListProps {
  guideId: string;
  pois: CustomerTravelGuidePOI[];
}

export function SelectedPOIsList({ guideId, pois }: SelectedPOIsListProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  
  const removePOI = useRemovePOIFromGuide();
  const updatePOI = useUpdateGuidePOI();

  const sortedPois = [...pois].sort((a, b) => a.order_index - b.order_index);

  const handleStartEditNote = (poi: CustomerTravelGuidePOI) => {
    setEditingNoteId(poi.id);
    setNoteText(poi.custom_note || "");
  };

  const handleSaveNote = (poi: CustomerTravelGuidePOI) => {
    updatePOI.mutate({
      id: poi.id,
      guideId,
      customNote: noteText || null,
    });
    setEditingNoteId(null);
    setNoteText("");
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setNoteText("");
  };

  if (pois.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nog geen locaties toegevoegd</p>
        <p className="text-xs mt-1">Selecteer locaties aan de rechterkant</p>
      </div>
    );
  }

  return (
    <div className="divide-y -mx-6">
      {sortedPois.map((poi, index) => {
        const poiData = poi.travel_guide_pois;
        if (!poiData) return null;

        const isEditingNote = editingNoteId === poi.id;

        return (
          <div key={poi.id} className="px-6 py-3 hover:bg-muted/30">
            <div className="flex items-start gap-3">
              {/* Drag Handle & Index */}
              <div className="flex items-center gap-1 text-muted-foreground pt-0.5">
                <GripVertical className="h-4 w-4 cursor-grab" />
                <span className="text-xs font-medium w-4">{index + 1}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{poiData.name}</span>
                  {poiData.is_recommended && (
                    <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      ⭐
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" />
                  <span>{poiData.municipality}</span>
                  {poiData.rating && (
                    <>
                      <span>•</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{poiData.rating.toFixed(1)}</span>
                    </>
                  )}
                  {poiData.travel_guide_categories && (
                    <>
                      <span>•</span>
                      <span>{poiData.travel_guide_categories.name}</span>
                    </>
                  )}
                </div>

                {/* Custom Note */}
                {isEditingNote ? (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Persoonlijke tip voor de klant..."
                      className="text-sm h-8"
                      autoFocus
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleSaveNote(poi)}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 shrink-0"
                      onClick={handleCancelEditNote}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : poi.custom_note ? (
                  <div 
                    className="mt-2 text-sm text-green-700 bg-green-50 px-2 py-1 rounded cursor-pointer hover:bg-green-100"
                    onClick={() => handleStartEditNote(poi)}
                  >
                    💡 {poi.custom_note}
                  </div>
                ) : (
                  <button
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => handleStartEditNote(poi)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Persoonlijke tip toevoegen
                  </button>
                )}
              </div>

              {/* Actions */}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removePOI.mutate({ guideId, poiId: poi.poi_id })}
                disabled={removePOI.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
