import { PublishedBlogsTable } from "./PublishedBlogsTable";
import { ContentCoverageBar } from "./ContentCoverageBar";
import { ScheduledBlogsTable } from "./ScheduledBlogsTable";

export function PublishPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Gepubliceerd</h2>
        <p className="text-sm text-muted-foreground">
          Overzicht van alle gepubliceerde blog artikelen en contentdekking.
        </p>
      </div>

      <ContentCoverageBar />

      <ScheduledBlogsTable />

      <PublishedBlogsTable />
    </div>
  );
}
