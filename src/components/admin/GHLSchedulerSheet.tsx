import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GHLScheduler, type GHLSchedulerProps } from "./GHLScheduler";
import { CalendarIcon } from "lucide-react";

interface GHLSchedulerSheetProps extends Omit<GHLSchedulerProps, "enabled"> {
  isOpen: boolean;
  title?: string;
  description?: string;
}

export function GHLSchedulerSheet({
  isOpen,
  title = "Post Inplannen",
  description,
  onClose,
  ...schedulerProps
}: GHLSchedulerSheetProps) {
  const handleClose = () => onClose?.();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {title}
          </SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-6">
          <GHLScheduler
            {...schedulerProps}
            enabled={isOpen}
            onClose={handleClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
