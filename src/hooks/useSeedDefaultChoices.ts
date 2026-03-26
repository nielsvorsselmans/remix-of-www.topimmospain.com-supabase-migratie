import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSaleChoices } from "./useSaleChoices";

export const DEFAULT_EXTRAS = [
  { title: "Airconditioning", category: "Klimaat" },
  { title: "Lichtspots", category: "Verlichting" },
  { title: "Witgoed (koelkast, vaatwasser, oven)", category: "Apparatuur" },
  { title: "Meubelpackage", category: "Inrichting" },
];

export function useAutoSeedDefaultChoices(saleId: string | undefined) {
  const queryClient = useQueryClient();
  const seededRef = useRef(false);
  const { data: existingChoices, isLoading: choicesLoading } = useSaleChoices(saleId);

  useEffect(() => {
    if (!saleId || choicesLoading || seededRef.current) return;
    if (!existingChoices) return;

    // If any V2 extras already exist, skip
    const hasV2Extras = existingChoices.some(c => c.type === "extra");
    if (hasV2Extras) {
      seededRef.current = true;
      return;
    }

    seededRef.current = true;

    const rows = DEFAULT_EXTRAS.map((def, i) => ({
      sale_id: saleId,
      type: "extra" as const,
      title: def.title,
      category: def.category,
      status: "open" as const,
      is_included: false,
      price: null,
      via_developer: true,
      gifted_by_tis: false,
      customer_visible: true,
      order_index: i,
    }));

    supabase.from("sale_choices").insert(rows).then(({ error }) => {
      if (error) {
        console.error("[auto-seed]", error);
        seededRef.current = false;
      } else {
        queryClient.invalidateQueries({ queryKey: ["sale-choices-v2", saleId] });
      }
    });
  }, [saleId, choicesLoading, existingChoices]);
}
