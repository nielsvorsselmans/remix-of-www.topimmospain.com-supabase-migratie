import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: LucideIcon;
  emoji?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
}

function SelectionCard<T extends string>({ options, value, onChange, columns = 2 }: Props<T>) {
  return (
    <div className={cn(
      "grid gap-3",
      columns === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
    )}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;
        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.97 }}
            animate={isSelected ? { scale: [1, 1.03, 1] } : {}}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-colors duration-200 text-left min-h-[52px]",
              "sm:flex-col sm:items-center sm:text-center sm:gap-2",
              "hover:border-accent hover:bg-accent/5",
              isSelected
                ? "border-accent bg-accent/10 shadow-sm"
                : "border-border bg-card"
            )}
          >
            {/* Selected checkmark */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
              >
                <Check className="w-3 h-3 text-accent-foreground" />
              </motion.div>
            )}

            {option.emoji && (
              <span className="text-2xl shrink-0">{option.emoji}</span>
            )}
            {Icon && (
              <Icon className={cn(
                "w-6 h-6 shrink-0",
                isSelected ? "text-accent-foreground" : "text-muted-foreground"
              )} />
            )}
            <div className="min-w-0">
              <span className={cn(
                "text-sm font-medium block",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
              {option.description && (
                <span className="text-xs text-muted-foreground leading-tight block mt-0.5">
                  {option.description}
                </span>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export default SelectionCard;
