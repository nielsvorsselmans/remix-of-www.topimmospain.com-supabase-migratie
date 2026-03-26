import { useState } from "react";
import { PenLine, Camera } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkedInTestBench } from "@/components/admin/LinkedInTestBench";
import { LinkedInPhotoLibrary } from "@/components/admin/LinkedInPhotoLibrary";

export default function ContentEngineLinkedIn() {
  const [activeTab, setActiveTab] = useState("writer");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">LinkedIn</h1>
        <p className="text-sm text-muted-foreground">Schrijf, plan en publiceer LinkedIn posts.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-auto">
          <TabsTrigger value="writer" className="flex items-center gap-2 py-2.5">
            <PenLine className="h-4 w-4" />
            <span>Writer</span>
          </TabsTrigger>
          <TabsTrigger value="fotos" className="flex items-center gap-2 py-2.5">
            <Camera className="h-4 w-4" />
            <span>Foto's</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="writer" className="space-y-4">
          <LinkedInTestBench />
        </TabsContent>

        <TabsContent value="fotos" className="space-y-4">
          <LinkedInPhotoLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
