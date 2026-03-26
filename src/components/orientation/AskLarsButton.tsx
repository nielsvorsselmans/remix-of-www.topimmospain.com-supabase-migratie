import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion } from "lucide-react";
import { AskLarsModal } from "./AskLarsModal";

interface AskLarsButtonProps {
  variant?: "floating" | "inline";
}

export function AskLarsButton({ variant = "floating" }: AskLarsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === "inline") {
    return (
      <>
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="gap-2"
        >
          <MessageCircleQuestion className="h-4 w-4" />
          Vraag het Lars
        </Button>
        <AskLarsModal open={isOpen} onOpenChange={setIsOpen} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-24 right-6 md:bottom-6 z-50 rounded-full h-14 w-14 p-0 shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Vraag het Lars"
      >
        <MessageCircleQuestion className="h-6 w-6" />
      </Button>
      <AskLarsModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
