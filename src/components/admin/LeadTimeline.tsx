import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Eye,
  MessageSquare,
  CheckCircle,
  UserPlus,
  Phone,
  FileText,
  Building2,
  Filter,
  BookOpen,
  ScrollText,
  Heart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TimelineEvent } from "@/hooks/useLeadTimeline";

interface LeadTimelineProps {
  events: TimelineEvent[];
}

export function LeadTimeline({ events }: LeadTimelineProps) {
  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "page_view":
        return <Eye className="h-4 w-4" />;
      case "project_view":
        return <Building2 className="h-4 w-4" />;
      case "chat_started":
        return <MessageSquare className="h-4 w-4" />;
      case "chat_completed":
        return <CheckCircle className="h-4 w-4" />;
      case "account_created":
        return <UserPlus className="h-4 w-4" />;
      case "follow_up":
        return <Phone className="h-4 w-4" />;
      case "project_favorited":
        return <Heart className="h-4 w-4" />;
      case "filter_applied":
        return <Filter className="h-4 w-4" />;
      case "blog_finished_reading":
        return <BookOpen className="h-4 w-4" />;
      case "filter" as any:
        return <Filter className="h-4 w-4" />;
      case "blog_read" as any:
        return <BookOpen className="h-4 w-4" />;
      case "blog_scroll" as any:
        return <ScrollText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "page_view":
        return "text-muted-foreground bg-muted";
      case "project_view":
        return "text-primary bg-primary/10";
      case "chat_started":
        return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950";
      case "chat_completed":
        return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950";
      case "account_created":
        return "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950";
      case "follow_up":
        return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950";
      case "project_favorited":
        return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";
      case "filter_applied":
        return "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950";
      case "blog_finished_reading":
        return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950";
      case "filter" as any:
        return "text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950";
      case "blog_read" as any:
        return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950";
      case "blog_scroll" as any:
        return "text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-950";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const groupEventsByDate = (events: TimelineEvent[]) => {
    const grouped = new Map<string, TimelineEvent[]>();
    
    events.forEach((event) => {
      const dateKey = format(new Date(event.timestamp), "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    });

    return Array.from(grouped.entries()).map(([date, events]) => ({
      date,
      events,
    }));
  };

  const groupedEvents = groupEventsByDate(events);

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nog geen activiteit geregistreerd
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedEvents.map(({ date, events }) => (
        <div key={date} className="space-y-4">
          {/* Date Header */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {format(new Date(date), "EEEE d MMMM yyyy", { locale: nl })}
            </Badge>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Events for this date */}
          <div className="space-y-3 pl-2">
            {events.map((event) => (
              <div key={event.id} className="relative pl-8 pb-4">
                {/* Timeline line */}
                <div className="absolute left-3 top-8 bottom-0 w-px bg-border" />

                {/* Event Icon */}
                <div
                  className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center ${getEventColor(
                    event.type
                  )}`}
                >
                  {getEventIcon(event.type)}
                </div>

                {/* Event Content */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), "HH:mm", { locale: nl })}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}

                  {/* Metadata badges */}
                  {event.type === "project_view" && event.metadata?.project_id && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Project ID: {event.metadata.project_id}
                    </Badge>
                  )}

                  {event.type === "chat_completed" && event.metadata?.converted && (
                    <Badge variant="default" className="text-xs mt-1">
                      ✓ Geconverteerd
                    </Badge>
                  )}

                  {event.type === "follow_up" && event.metadata?.status && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Status: {event.metadata.status}
                    </Badge>
                  )}

                  {event.type === "project_favorited" && event.metadata?.project_id && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      Project ID: {event.metadata.project_id}
                    </Badge>
                  )}

                  {event.type === "filter_applied" && event.metadata?.filters && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.metadata.filters.regions && event.metadata.filters.regions.length > 0 && (
                        event.metadata.filters.regions.map((region: string) => (
                          <Badge key={region} variant="outline" className="text-xs">
                            {region}
                          </Badge>
                        ))
                      )}
                      {event.metadata.filters.cities && event.metadata.filters.cities.length > 0 && (
                        event.metadata.filters.cities.map((city: string) => (
                          <Badge key={city} variant="outline" className="text-xs">
                            {city}
                          </Badge>
                        ))
                      )}
                      {event.metadata.filters.bedrooms && event.metadata.filters.bedrooms.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {event.metadata.filters.bedrooms.join('/')} slaapkamers
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
