import { InsightsTable } from "./InsightsTable";
import { IcpPromptDialog } from "./IcpPromptDialog";

export function InsightsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inzichten beheren</h2>
          <p className="text-sm text-muted-foreground">
            Valideer inzichten tegen de ICP voordat ze naar content generatie gaan.
          </p>
        </div>
        <IcpPromptDialog />
      </div>
      
      <InsightsTable />
    </div>
  );
}
