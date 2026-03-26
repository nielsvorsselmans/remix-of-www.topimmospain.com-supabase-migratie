import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/contexts/PartnerContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Users,
  UserPlus,
  ArrowUpDown,
  Filter,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PartnerAddLeadDialog } from "@/components/partner/PartnerAddLeadDialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 25;

const journeyPhaseLabels: Record<string, { label: string; color: string }> = {
  orientatie: { label: "Oriëntatie", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  verdieping: { label: "Verdieping", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  beslissing: { label: "Beslissing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  aankoop: { label: "Aankoop", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  aftersales: { label: "After Sales", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
};

export default function PartnerKlanten() {
  const { user } = useAuth();
  const { impersonatedPartner, isImpersonating } = usePartner();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "date">("date");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, phaseFilter]);

  const { data: partner } = useQuery({
    queryKey: ["partner-profile", user?.id, impersonatedPartner?.id],
    queryFn: async () => {
      if (isImpersonating && impersonatedPartner) {
        return { id: impersonatedPartner.id };
      }
      const { data, error } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id || isImpersonating,
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["partner-klanten", partner?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, first_name, last_name, email, phone, journey_phase, created_at")
        .eq("referred_by_partner_id", partner?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!partner?.id,
  });

  const filteredLeads = leads
    ?.filter((lead) => {
      const matchesSearch =
        `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPhase = phaseFilter === "all" || lead.journey_phase === phaseFilter;
      return matchesSearch && matchesPhase;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const totalPages = Math.ceil((filteredLeads?.length || 0) / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mijn Klanten</h1>
            <p className="text-muted-foreground">
              Overzicht van alle klanten die via jouw referral zijn binnengekomen
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="text-lg font-medium">{leads?.length || 0} klanten</span>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nieuwe Klant
            </Button>
          </div>
        </div>

        {/* Filters — inline without card wrapper */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter op fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle fases</SelectItem>
              {Object.entries(journeyPhaseLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "date")}>
            <SelectTrigger className="w-full md:w-[180px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sorteer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Nieuwste eerst</SelectItem>
              <SelectItem value="name">Op naam</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredLeads?.length === 0 ? (
          <div className="py-12 text-center border rounded-lg">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Geen klanten gevonden</h3>
            <p className="text-muted-foreground">
              {searchQuery || phaseFilter !== "all"
                ? "Probeer andere zoek- of filteropties"
                : "Je hebt nog geen klanten via jouw referral link"}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klant</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Sinds</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads?.map((lead) => {
                  const phase = journeyPhaseLabels[lead.journey_phase || "orientatie"];
                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/partner/klant/${lead.id}`)}
                    >
                      <TableCell className="font-medium">
                        {lead.first_name} {lead.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${phase?.color} border-0 text-xs`}>
                          {phase?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {lead.email || lead.phone || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {lead.created_at
                          ? format(new Date(lead.created_at), "d MMM yyyy", { locale: nl })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads?.length || 0)} van {filteredLeads?.length} klanten
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, i) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={currentPage === page}
                        onClick={() => setCurrentPage(page)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <PartnerAddLeadDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          partnerId={partner?.id}
        />
      </div>
    </>
  );
}
