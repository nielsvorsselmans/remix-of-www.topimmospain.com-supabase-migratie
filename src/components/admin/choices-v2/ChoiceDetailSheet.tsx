import { useState, useEffect } from "react";
import {
  SaleChoice,
  useUpdateChoice,
  useDeleteChoice,
  useCreateChoiceOption,
  useUpdateChoiceOption,
  useDeleteChoiceOption,
  useUploadChoiceAttachment,
  useDeleteChoiceAttachment,
} from "@/hooks/useSaleChoices";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";
import { ChoiceQuoteFlow } from "./ChoiceQuoteFlow";
import { ChoiceAttachments } from "./ChoiceAttachments";
import { Lightbulb, ClipboardList, Palette, Trash2, Save } from "lucide-react";

interface Props {
  choice: SaleChoice | null;
  saleId: string;
  onClose: () => void;
}

const typeConfig = {
  extra: { icon: Lightbulb, label: 'Extra' },
  request: { icon: ClipboardList, label: 'Aanvraag' },
  material: { icon: Palette, label: 'Materiaal' },
};

export function ChoiceDetailSheet({ choice, saleId, onClose }: Props) {
  const updateChoice = useUpdateChoice();
  const deleteChoice = useDeleteChoice();
  const createOption = useCreateChoiceOption();
  const updateOption = useUpdateChoiceOption();
  const deleteOption = useDeleteChoiceOption();
  const uploadAttachment = useUploadChoiceAttachment();
  const deleteAttachment = useDeleteChoiceAttachment();

  // Local form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [giftedByTis, setGiftedByTis] = useState(false);
  const [viaDeveloper, setViaDeveloper] = useState(false);
  const [isIncluded, setIsIncluded] = useState(false);
  const [customerVisible, setCustomerVisible] = useState(true);
  const [customerQuestion, setCustomerQuestion] = useState('');
  const [adminAnswer, setAdminAnswer] = useState('');

  // Sync form state when choice changes
  useEffect(() => {
    if (choice) {
      setTitle(choice.title);
      setDescription(choice.description || '');
      setCategory(choice.category || '');
      setRoom(choice.room || '');
      setNotes(choice.notes || '');
      setGiftedByTis(choice.gifted_by_tis);
      setViaDeveloper(choice.via_developer);
      setIsIncluded(choice.is_included);
      setCustomerVisible(choice.customer_visible);
      setCustomerQuestion(choice.customer_question || '');
      setAdminAnswer(choice.admin_answer || '');
    }
  }, [choice]);

  if (!choice) return null;

  const cfg = typeConfig[choice.type];
  const Icon = cfg.icon;

  const handleSave = () => {
    updateChoice.mutate({
      id: choice.id,
      saleId,
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      room: room.trim() || null,
      notes: notes.trim() || null,
      gifted_by_tis: giftedByTis,
      via_developer: viaDeveloper,
      is_included: isIncluded,
      customer_visible: customerVisible,
      customer_question: customerQuestion.trim() || null,
      admin_answer: adminAnswer.trim() || null,
    });
  };

  const handleDelete = () => {
    deleteChoice.mutate({ id: choice.id, saleId }, { onSuccess: onClose });
  };

  return (
    <Sheet open={!!choice} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <SheetTitle className="flex-1">{choice.title}</SheetTitle>
            <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic fields */}
          <div className="space-y-3">
            <div>
              <Label>Titel</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Beschrijving</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categorie</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} />
              </div>
              {choice.type === 'material' && (
                <div>
                  <Label>Ruimte</Label>
                  <Input value={room} onChange={e => setRoom(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Instellingen</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-xs">Inbegrepen in prijs</Label>
                <Switch checked={isIncluded} onCheckedChange={setIsIncluded} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-xs">Cadeau TIS 🎁</Label>
                <Switch checked={giftedByTis} onCheckedChange={setGiftedByTis} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-xs">Via ontwikkelaar</Label>
                <Switch checked={viaDeveloper} onCheckedChange={setViaDeveloper} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="text-xs">Zichtbaar voor klant</Label>
                <Switch checked={customerVisible} onCheckedChange={setCustomerVisible} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Type-specific section */}
          {choice.type === 'request' ? (
            <ChoiceQuoteFlow
              choice={choice}
              saleId={saleId}
              onUpdate={(updates) => updateChoice.mutate({ id: choice.id, saleId, ...updates })}
              onUpload={(file) => uploadAttachment.mutate({
                choiceId: choice.id,
                saleId,
                file,
                fileType: 'quote',
              })}
            />
          ) : (
            <ChoiceOptionsEditor
              choice={choice}
              saleId={saleId}
              showImages={choice.type === 'material'}
              onCreateOption={(data) => createOption.mutate({ ...data, choice_id: choice.id, saleId })}
              onUpdateOption={(id, data) => updateOption.mutate({ id, saleId, ...data })}
              onDeleteOption={(id) => deleteOption.mutate({ id, saleId })}
              onUploadImage={(optionId, file) => uploadAttachment.mutate({
                choiceId: choice.id,
                optionId,
                saleId,
                file,
                fileType: 'image',
              })}
              onDeleteImage={(id, filePath) => deleteAttachment.mutate({ id, filePath, saleId })}
            />
          )}

          <Separator />

          {/* Customer communication */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Klantcommunicatie</h4>
            <div>
              <Label className="text-xs">Vraag van klant</Label>
              <Textarea value={customerQuestion} onChange={e => setCustomerQuestion(e.target.value)} rows={2} placeholder="Nog geen vraag..." />
            </div>
            <div>
              <Label className="text-xs">Antwoord admin</Label>
              <Textarea value={adminAnswer} onChange={e => setAdminAnswer(e.target.value)} rows={2} placeholder="Nog geen antwoord..." />
            </div>
          </div>

          <Separator />

          {/* Attachments */}
          <ChoiceAttachments
            attachments={choice.attachments}
            onUpload={(file) => uploadAttachment.mutate({ choiceId: choice.id, saleId, file })}
            onDelete={(id, filePath) => deleteAttachment.mutate({ id, filePath, saleId })}
          />

          {/* Notes */}
          <div>
            <Label>Notities</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Interne notities..." />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={updateChoice.isPending} className="flex-1">
              <Save className="h-4 w-4 mr-1" /> Opslaan
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Keuze verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dit verwijdert "{choice.title}" inclusief alle opties en bijlagen. Dit kan niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuleren</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Verwijderen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
