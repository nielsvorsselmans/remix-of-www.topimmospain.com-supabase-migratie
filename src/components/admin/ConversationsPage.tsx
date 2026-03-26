import { ConversationsTable } from "./ConversationsTable";

export function ConversationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Gesprekken analyseren</h2>
        <p className="text-sm text-muted-foreground">
          Upload en verwerk klantgesprekken om inzichten te extraheren.
        </p>
      </div>
      
      <ConversationsTable />
    </div>
  );
}
