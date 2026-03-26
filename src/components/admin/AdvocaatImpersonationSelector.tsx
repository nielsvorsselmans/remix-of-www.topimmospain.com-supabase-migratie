import React, { useState } from 'react';
import { Search, Scale, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdvocaat } from '@/contexts/AdvocaatContext';

interface AdvocaatImpersonationSelectorProps {
  onSelect?: () => void;
}

export function AdvocaatImpersonationSelector({ onSelect }: AdvocaatImpersonationSelectorProps) {
  const [search, setSearch] = useState('');
  const { impersonatedAdvocaat, setImpersonatedAdvocaat } = useAdvocaat();

  const { data: advocaten, isLoading } = useQuery({
    queryKey: ['admin-advocaten-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advocaten')
        .select('id, name, company, email')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const filtered = advocaten?.filter(a => {
    const s = search.toLowerCase();
    return a.name.toLowerCase().includes(s) ||
      (a.company?.toLowerCase().includes(s) ?? false) ||
      a.email.toLowerCase().includes(s);
  });

  const handleSelect = (advocaat: typeof advocaten[0]) => {
    setImpersonatedAdvocaat({
      id: advocaat.id,
      name: advocaat.name,
      company: advocaat.company,
      email: advocaat.email,
    });
    onSelect?.();
    window.location.href = '/advocaat/dashboard';
  };

  return (
    <div className="w-72">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek advocaat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      <ScrollArea className="h-64">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Laden...</div>
        ) : filtered?.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Geen advocaten gevonden</div>
        ) : (
          <div className="p-1">
            {filtered?.map((advocaat) => {
              const isSelected = impersonatedAdvocaat?.id === advocaat.id;
              return (
                <button
                  key={advocaat.id}
                  onClick={() => handleSelect(advocaat)}
                  className={`w-full text-left p-2 rounded-md hover:bg-accent transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-accent' : ''
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Scale className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      {advocaat.name}
                      {isSelected && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    {advocaat.company && (
                      <div className="text-xs text-muted-foreground truncate">
                        {advocaat.company}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
