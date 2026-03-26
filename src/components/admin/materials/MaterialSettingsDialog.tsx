import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategorySettingsTab } from "./CategorySettingsTab";
import { RoomSettingsTab } from "./RoomSettingsTab";
import { TemplateSettingsTab } from "./TemplateSettingsTab";

interface MaterialSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function MaterialSettingsDialog({
  open,
  onOpenChange,
  projectId,
}: MaterialSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Materiaal Instellingen
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="categories" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="categories">Categorieën</TabsTrigger>
            <TabsTrigger value="rooms">Ruimtes</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="categories" className="m-0">
              <CategorySettingsTab projectId={projectId} />
            </TabsContent>

            <TabsContent value="rooms" className="m-0">
              <RoomSettingsTab projectId={projectId} />
            </TabsContent>

            <TabsContent value="templates" className="m-0">
              <TemplateSettingsTab projectId={projectId} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
