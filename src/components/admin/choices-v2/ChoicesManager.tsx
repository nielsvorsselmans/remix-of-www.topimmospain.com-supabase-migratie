import { useState } from "react";
import { SaleChoice, ChoiceType, useSaleChoices, CHOICE_STATUS_CONFIG, CLOSED_STATUSES } from "@/hooks/useSaleChoices";
import { useAutoSeedDefaultChoices, DEFAULT_EXTRAS } from "@/hooks/useSeedDefaultChoices";
import { ChoiceSummaryBar } from "./ChoiceSummaryBar";
import { ChoiceRow } from "./ChoiceRow";
import { ChoiceDetailSheet } from "./ChoiceDetailSheet";
import { AddChoiceDialog } from "./AddChoiceDialog";
import { Plus, Loader2, Zap, ClipboardList, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  saleId: string;
}

export function ChoicesManager({ saleId }: Props) {
  const { data: choices = [], isLoading } = useSaleChoices(saleId);

  // Auto-seed standard extras silently
  useAutoSeedDefaultChoices(saleId);

  const [selectedChoice, setSelectedChoice] = useState<SaleChoice | null>(null);
  const [addType, setAddType] = useState<ChoiceType | null>(null);

  const handleChoiceCreated = (choice: SaleChoice) => {
    setSelectedChoice(choice);
  };

  // Split items into three sections
  const standardTitles = DEFAULT_EXTRAS.map(d => d.title.toLowerCase());
  const standardExtras = choices.filter(
    c => c.type === 'extra' && standardTitles.some(t => c.title.toLowerCase().includes(t) || t.includes(c.title.toLowerCase()))
  );
  const adjustments = choices.filter(c => c.type === 'request');
  const materials = choices.filter(c => c.type === 'material');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {choices.length > 0 && <ChoiceSummaryBar choices={choices} />}

      {/* Section 1: Standard Extras */}
      <Section
        icon={<Zap className="h-4 w-4" />}
        title="Standaard extra's"
        count={standardExtras.length}
      >
        {standardExtras.length > 0 ? (
          <div className="space-y-0.5">
            {standardExtras.map(item => (
              <ChoiceRow
                key={item.id}
                choice={item}
                onClick={() => setSelectedChoice(item)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Standaardkeuzes worden geladen...</p>
        )}
      </Section>

      {/* Section 2: Adjustments (Offertes) */}
      <Section
        icon={<ClipboardList className="h-4 w-4" />}
        title="Aanpassingen"
        count={adjustments.length}
        action={
          <Button variant="ghost" size="sm" onClick={() => setAddType('request')}>
            <Plus className="h-4 w-4 mr-1" /> Toevoegen
          </Button>
        }
      >
        {adjustments.length > 0 ? (
          <div className="space-y-0.5">
            {adjustments.map(item => (
              <ChoiceRow
                key={item.id}
                choice={item}
                onClick={() => setSelectedChoice(item)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Nog geen aanpassingen.</p>
        )}
      </Section>

      {/* Section 3: Material Choices */}
      <Section
        icon={<Palette className="h-4 w-4" />}
        title="Materiaalkeuzes"
        count={materials.length}
        action={
          <Button variant="ghost" size="sm" onClick={() => setAddType('material')}>
            <Plus className="h-4 w-4 mr-1" /> Toevoegen
          </Button>
        }
      >
        {materials.length > 0 ? (
          <div className="space-y-0.5">
            {materials.map(item => (
              <ChoiceRow
                key={item.id}
                choice={item}
                onClick={() => setSelectedChoice(item)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">Nog geen materiaalkeuzes.</p>
        )}
      </Section>

      {/* Detail sheet */}
      <ChoiceDetailSheet
        choice={selectedChoice}
        saleId={saleId}
        onClose={() => setSelectedChoice(null)}
      />

      {/* Add dialog */}
      {addType && (
        <AddChoiceDialog
          saleId={saleId}
          open={!!addType}
          onOpenChange={(open) => { if (!open) setAddType(null); }}
          onCreated={handleChoiceCreated}
          type={addType}
        />
      )}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({
  icon,
  title,
  count,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon} {title}
          {count > 0 && (
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </h4>
        {action}
      </div>
      {children}
    </div>
  );
}
