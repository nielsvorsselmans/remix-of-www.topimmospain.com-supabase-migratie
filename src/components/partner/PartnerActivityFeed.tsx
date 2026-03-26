import { usePartnerActivity, PartnerActivityItem } from "@/hooks/usePartnerActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Eye, 
  Heart, 
  Plane, 
  Calendar, 
  ArrowRight, 
  ShoppingBag,
  Loader2,
  Activity,
  MessageCircle,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface PartnerActivityFeedProps {
  partnerId: string;
}

const activityConfig: Record<PartnerActivityItem['type'], { 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  bgColor: string;
}> = {
  account_created: { icon: UserPlus, color: 'text-green-600', bgColor: 'bg-green-100' },
  referral_converted: { icon: UserPlus, color: 'text-green-600', bgColor: 'bg-green-100' },
  project_viewed: { icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  favorite_added: { icon: Heart, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  trip_booked: { icon: Plane, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  event_registered: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  phase_changed: { icon: ArrowRight, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  sale_created: { icon: ShoppingBag, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  chat_started: { icon: MessageCircle, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  chat_converted: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
};

export function PartnerActivityFeed({ partnerId }: PartnerActivityFeedProps) {
  const { data: activities, isLoading } = usePartnerActivity(partnerId);
  const navigate = useNavigate();

  const handleActivityClick = (activity: PartnerActivityItem) => {
    if (activity.clientId) {
      navigate(`/partner/klanten/${activity.clientId}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recente Activiteit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recente Activiteit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nog geen recente activiteit</p>
            <p className="text-sm mt-1">Activiteiten van je klanten verschijnen hier</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Recente Activiteit
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {activities.map((activity) => {
              const config = activityConfig[activity.type];
              const IconComponent = config.icon;
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleActivityClick(activity)}
                >
                  <div className={`p-2 rounded-full ${config.bgColor} shrink-0`}>
                    <IconComponent className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{activity.clientName}</span>
                      {activity.type === 'sale_created' && (
                        <Badge variant="default" className="bg-emerald-500 text-xs">
                          Verkoop
                        </Badge>
                      )}
                      {activity.type === 'trip_booked' && (
                        <Badge variant="secondary" className="text-xs">
                          Trip
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.title}
                      {activity.description && ` · ${activity.description}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { 
                        addSuffix: true, 
                        locale: nl 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
