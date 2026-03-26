import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LayoutList, LayoutGrid, Star, Heart, Filter, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export type SortOption = 'priority' | 'newest' | 'price_asc' | 'price_desc';
export type FilterSource = 'all' | 'admin' | 'favorite';
export type ViewMode = 'detailed' | 'compact';

interface SelectionFiltersProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  filterSource: FilterSource;
  onFilterChange: (value: FilterSource) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  adminCount: number;
  favoriteCount: number;
}

export function SelectionFilters({
  sortBy,
  onSortChange,
  filterSource,
  onFilterChange,
  viewMode,
  onViewModeChange,
  adminCount,
  favoriteCount,
}: SelectionFiltersProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const activeFilterCount = filterSource !== 'all' ? 1 : 0;

  const filterOptions = [
    { value: 'all' as const, label: 'Alle', icon: Filter, count: null },
    { value: 'admin' as const, label: 'Van adviseur', icon: Star, count: adminCount },
    { value: 'favorite' as const, label: 'Mijn favorieten', icon: Heart, count: favoriteCount },
  ];

  const handleFilterSelect = (value: FilterSource) => {
    onFilterChange(value);
    if (isMobile) setSheetOpen(false);
  };

  // Mobile: collapsible filters in bottom sheet
  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 min-w-5 p-0 rounded-full text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Filter projecten</SheetTitle>
            </SheetHeader>
            <div className="space-y-2 pb-4">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filterSource === option.value ? 'default' : 'outline'}
                  className={cn(
                    "w-full justify-start h-12",
                    filterSource === option.value && option.value === 'favorite' && "bg-rose-500 hover:bg-rose-600"
                  )}
                  onClick={() => handleFilterSelect(option.value)}
                  disabled={option.count === 0 && option.value !== 'all'}
                >
                  <option.icon className="h-4 w-4 mr-3" />
                  <span className="flex-1 text-left">{option.label}</span>
                  {option.count !== null && (
                    <span className="text-muted-foreground">({option.count})</span>
                  )}
                  {filterSource === option.value && (
                    <Check className="h-4 w-4 ml-2" />
                  )}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-[130px] h-9">
            <SelectValue placeholder="Sorteren" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Prioriteit</SelectItem>
            <SelectItem value="newest">Nieuwste</SelectItem>
            <SelectItem value="price_asc">Prijs ↑</SelectItem>
            <SelectItem value="price_desc">Prijs ↓</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border rounded-md ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-r-none",
              viewMode === 'detailed' && "bg-muted"
            )}
            onClick={() => onViewModeChange('detailed')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 rounded-l-none border-l",
              viewMode === 'compact' && "bg-muted"
            )}
            onClick={() => onViewModeChange('compact')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Desktop: inline filter chips
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterSource === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('all')}
          className="h-8"
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Alle
        </Button>
        <Button
          variant={filterSource === 'admin' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('admin')}
          className={cn("h-8", filterSource === 'admin' && "bg-primary")}
          disabled={adminCount === 0}
        >
          <Star className="h-3.5 w-3.5 mr-1.5" />
          Van adviseur
          {adminCount > 0 && (
            <span className="ml-1.5 text-xs opacity-70">({adminCount})</span>
          )}
        </Button>
        <Button
          variant={filterSource === 'favorite' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('favorite')}
          className={cn("h-8", filterSource === 'favorite' && "bg-rose-500 hover:bg-rose-600")}
          disabled={favoriteCount === 0}
        >
          <Heart className="h-3.5 w-3.5 mr-1.5" />
          Mijn favorieten
          {favoriteCount > 0 && (
            <span className="ml-1.5 text-xs opacity-70">({favoriteCount})</span>
          )}
        </Button>
      </div>

      {/* Sort and view controls */}
      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Sorteren" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Prioriteit</SelectItem>
            <SelectItem value="newest">Nieuwste eerst</SelectItem>
            <SelectItem value="price_asc">Prijs laag-hoog</SelectItem>
            <SelectItem value="price_desc">Prijs hoog-laag</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-r-none",
              viewMode === 'detailed' && "bg-muted"
            )}
            onClick={() => onViewModeChange('detailed')}
            title="Uitgebreide weergave"
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-l-none border-l",
              viewMode === 'compact' && "bg-muted"
            )}
            onClick={() => onViewModeChange('compact')}
            title="Compacte weergave"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
