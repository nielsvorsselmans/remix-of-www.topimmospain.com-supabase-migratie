import { UseFormReturn } from "react-hook-form";
import { ResaleDetailsFields } from "@/components/ResaleDetailsFields";
import { ResaleFeaturesFields } from "@/components/ResaleFeaturesFields";

interface ResalePropertyFieldsProps {
  form: UseFormReturn<any>;
}

export function ResalePropertyFields({ form }: ResalePropertyFieldsProps) {
  return (
    <div className="space-y-6">
      <ResaleDetailsFields form={form} />
      <ResaleFeaturesFields form={form} />
    </div>
  );
}
