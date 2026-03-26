import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, Users, MapPin } from "lucide-react";
import { InfoavondOrientationTab } from "./InfoavondOrientationTab";
import { InfoavondProgrammaTab } from "./InfoavondProgrammaTab";
import { InfoavondTeamTab } from "./InfoavondTeamTab";
import { InfoavondPraktischTab } from "./InfoavondPraktischTab";

interface InfoavondPreparationTabsProps {
  event: {
    location_name: string;
    location_address: string;
    doors_open_time?: string | null;
    presentation_start_time?: string | null;
    presentation_end_time?: string | null;
  };
}

const tabs = [
  { value: "orientatie", label: "Oriëntatie", icon: BookOpen },
  { value: "programma", label: "Programma", icon: Clock },
  { value: "team", label: "Het team", icon: Users },
  { value: "praktisch", label: "Praktisch", icon: MapPin },
];

export const InfoavondPreparationTabs = ({ event }: InfoavondPreparationTabsProps) => {
  const [activeTab, setActiveTab] = useState("orientatie");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Bereid je voor
        </h2>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-auto p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <CardContent className="pt-6">
            <TabsContent value="orientatie" className="mt-0">
              <InfoavondOrientationTab />
            </TabsContent>
            
            <TabsContent value="programma" className="mt-0">
              <InfoavondProgrammaTab 
                doorsOpenTime={event.doors_open_time || undefined}
                presentationStartTime={event.presentation_start_time || undefined}
                presentationEndTime={event.presentation_end_time || undefined}
              />
            </TabsContent>
            
            <TabsContent value="team" className="mt-0">
              <InfoavondTeamTab />
            </TabsContent>
            
            <TabsContent value="praktisch" className="mt-0">
              <InfoavondPraktischTab 
                eventLocation={event.location_name}
                eventAddress={event.location_address}
                doorsOpenTime={event.doors_open_time || undefined}
                presentationStartTime={event.presentation_start_time || undefined}
                presentationEndTime={event.presentation_end_time || undefined}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};
