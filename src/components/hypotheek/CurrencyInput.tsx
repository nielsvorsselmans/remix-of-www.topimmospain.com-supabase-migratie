import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  helpText?: string;
  className?: string;
}

const formatCurrency = (value: number): string => {
  if (value === 0) return "";
  return value.toLocaleString("nl-NL");
};

const parseCurrency = (str: string): number => {
  const cleaned = str.replace(/[^0-9]/g, "");
  return Number(cleaned) || 0;
};

const CurrencyInput = ({ id, value, onChange, placeholder, min = 0, max, helpText, className }: Props) => {
  const [displayValue, setDisplayValue] = useState(formatCurrency(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value > 0;

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseCurrency(raw);
    if (max !== undefined && numeric > max) return;
    setDisplayValue(raw === "" ? "" : formatCurrency(numeric));
    onChange(numeric);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value === 0) setDisplayValue("");
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplayValue(formatCurrency(value));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">€</span>
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border bg-background pl-8 pr-9 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
            hasValue && !isFocused
              ? "border-primary/40"
              : "border-input"
          )}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
        {hasValue && !isFocused && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-3 h-3 text-primary" />
          </span>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
};

export default CurrencyInput;
