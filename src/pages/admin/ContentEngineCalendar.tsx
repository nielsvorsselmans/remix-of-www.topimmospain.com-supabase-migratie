import { ContentCalendar } from "@/components/admin/ContentCalendar";

export default function ContentEngineCalendar() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Content Kalender</h1>
        <p className="text-sm text-muted-foreground">Overzicht van alle geplande en gepubliceerde content.</p>
      </div>
      <ContentCalendar />
    </div>
  );
}
