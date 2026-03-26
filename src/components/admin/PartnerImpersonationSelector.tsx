import React, { useState } from 'react';

import { Search, User, Building2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminPartnersList } from '@/hooks/useAdminPartnersList';
import { usePartner } from '@/contexts/PartnerContext';

interface PartnerImpersonationSelectorProps {
  onSelect?: () => void;
}

export function PartnerImpersonationSelector({ onSelect }: PartnerImpersonationSelectorProps) {
  const [search, setSearch] = useState('');
  
  const { data: partners, isLoading } = useAdminPartnersList();
  const { impersonatedPartner, setImpersonatedPartner } = usePartner();

  const filteredPartners = partners?.filter(partner => {
    const searchLower = search.toLowerCase();
    return (
      partner.name.toLowerCase().includes(searchLower) ||
      partner.company.toLowerCase().includes(searchLower) ||
      (partner.email?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  const handleSelectPartner = (partner: typeof partners[0]) => {
    setImpersonatedPartner({
      id: partner.id,
      name: partner.name,
      company: partner.company,
      role: partner.role,
      email: partner.email,
      phone: partner.phone,
      logo_url: partner.logo_url,
      slug: partner.slug,
      referral_code: partner.referral_code,
      landing_page_title: partner.landing_page_title,
      landing_page_intro: partner.landing_page_intro,
    });
    onSelect?.();
    window.location.href = '/partner/dashboard';
  };

  return (
    <div className="w-72">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek partner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>
      <ScrollArea className="h-64">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Laden...
          </div>
        ) : filteredPartners?.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Geen partners gevonden
          </div>
        ) : (
          <div className="p-1">
            {filteredPartners?.map((partner) => {
              const isSelected = impersonatedPartner?.id === partner.id;
              return (
                <button
                  key={partner.id}
                  onClick={() => handleSelectPartner(partner)}
                  className={`w-full text-left p-2 rounded-md hover:bg-accent transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-accent' : ''
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-2">
                      {partner.name}
                      {isSelected && <Check className="h-3 w-3 text-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Building2 className="h-3 w-3" />
                      {partner.company}
                    </div>
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
