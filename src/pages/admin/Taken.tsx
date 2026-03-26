import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  ListTodo,
  Search,
  ExternalLink,
  Flag,
} from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek, isPast, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { TaskPriority, useUpdateChecklistItem } from "@/hooks/useUpdateChecklistItem";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface OpenTask {
  id: string;
  title: string;
  description: string | null;
  phase: string;
  target_date: string | null;
  priority: TaskPriority | null;
  template_key: string | null;
  sale_id: string;
  sale: {
    id: string;
    property_description: string | null;
    project: {
      name: string;
    } | null;
  };
}

function useAllOpenTasks() {
  return useQuery({
    queryKey: ["all-open-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_milestones")
        .select(`
          id,
          title,
          description,
          phase,
          target_date,
          priority,
          template_key,
          sale_id,
          sale:sales!inner(
            id,
            property_description,
            project:projects(name)
          )
        `)
        .is("completed_at", null)
        .in("phase", ["reservatie", "koopcontract", "voorbereiding", "akkoord"])
        .order("target_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as OpenTask[];
    },
  });
}

function getUrgencyCategory(targetDate: string | null): 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_deadline' {
  if (!targetDate) return 'no_deadline';
  const date = new Date(targetDate);
  if (isPast(date) && !isToday(date)) return 'overdue';
  if (isToday(date)) return 'today';
  if (isTomorrow(date)) return 'tomorrow';
  if (isThisWeek(date)) return 'this_week';
  return 'later';
}

function getUrgencyScore(task: OpenTask): number {
  const priorityScores: Record<string, number> = { high: 0, medium: 100, low: 200 };
  const priorityScore = priorityScores[task.priority || 'medium'] || 100;
  
  if (!task.target_date) return 1000 + priorityScore;
  
  const daysUntil = Math.floor((new Date(task.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  return daysUntil + priorityScore;
}

const PHASE_LABELS: Record<string, string> = {
  reservatie: 'Reservatie',
  koopcontract: 'Koopcontract',
  voorbereiding: 'Voorbereiding',
  akkoord: 'Akkoord',
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  high: { label: 'Hoog', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200' },
  medium: { label: 'Medium', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-200' },
  low: { label: 'Laag', color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-200' },
};

export default function Taken() {
  const { data: tasks, isLoading } = useAllOpenTasks();
  const updateItem = useUpdateChecklistItem();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    return tasks
      .filter(task => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(query);
          const matchesProject = task.sale?.project?.name?.toLowerCase().includes(query);
          const matchesUnit = task.sale?.property_description?.toLowerCase().includes(query);
          if (!matchesTitle && !matchesProject && !matchesUnit) return false;
        }
        
        // Phase filter
        if (phaseFilter !== "all" && task.phase !== phaseFilter) return false;
        
        // Priority filter
        if (priorityFilter !== "all" && (task.priority || 'medium') !== priorityFilter) return false;
        
        // Urgency filter
        if (urgencyFilter !== "all") {
          const urgency = getUrgencyCategory(task.target_date);
          if (urgencyFilter === "urgent" && !['overdue', 'today', 'tomorrow'].includes(urgency)) return false;
          if (urgencyFilter === "overdue" && urgency !== 'overdue') return false;
          if (urgencyFilter === "no_deadline" && urgency !== 'no_deadline') return false;
        }
        
        return true;
      })
      .sort((a, b) => getUrgencyScore(a) - getUrgencyScore(b));
  }, [tasks, searchQuery, phaseFilter, priorityFilter, urgencyFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, overdue: 0, today: 0, high: 0 };
    return {
      total: tasks.length,
      overdue: tasks.filter(t => getUrgencyCategory(t.target_date) === 'overdue').length,
      today: tasks.filter(t => ['today', 'tomorrow'].includes(getUrgencyCategory(t.target_date))).length,
      high: tasks.filter(t => t.priority === 'high').length,
    };
  }, [tasks]);

  const handlePriorityChange = (taskId: string, priority: TaskPriority) => {
    updateItem.mutate({ itemId: taskId, updates: { priority } });
  };

  const handleDeadlineChange = (taskId: string, date: Date | undefined) => {
    updateItem.mutate({ 
      itemId: taskId, 
      updates: { target_date: date ? format(date, 'yyyy-MM-dd') : null } 
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Takenoverzicht</h1>
          <p className="text-muted-foreground">
            Alle openstaande taken over alle verkopen
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ListTodo className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Totaal open</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={stats.overdue > 0 ? "border-red-200 bg-red-50/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stats.overdue > 0 ? 'bg-red-100' : 'bg-muted'}`}>
                  <AlertCircle className={`h-5 w-5 ${stats.overdue > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.overdue}</p>
                  <p className="text-sm text-muted-foreground">Verlopen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={stats.today > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stats.today > 0 ? 'bg-amber-100' : 'bg-muted'}`}>
                  <Clock className={`h-5 w-5 ${stats.today > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.today}</p>
                  <p className="text-sm text-muted-foreground">Vandaag/morgen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Flag className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.high}</p>
                  <p className="text-sm text-muted-foreground">Hoge prioriteit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op taak, project of woning..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle fases</SelectItem>
                  <SelectItem value="reservatie">Reservatie</SelectItem>
                  <SelectItem value="koopcontract">Koopcontract</SelectItem>
                  <SelectItem value="voorbereiding">Voorbereiding</SelectItem>
                  <SelectItem value="akkoord">Akkoord</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Prioriteit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle prioriteiten</SelectItem>
                  <SelectItem value="high">Hoog</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Laag</SelectItem>
                </SelectContent>
              </Select>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Urgentie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle taken</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="overdue">Verlopen</SelectItem>
                  <SelectItem value="no_deadline">Geen deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {filteredTasks.length} taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Geen taken gevonden</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Taak</TableHead>
                    <TableHead className="hidden sm:table-cell">Verkoop</TableHead>
                    <TableHead className="hidden sm:table-cell">Fase</TableHead>
                    <TableHead className="hidden sm:table-cell">Deadline</TableHead>
                    <TableHead>Prioriteit</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => {
                    const urgency = getUrgencyCategory(task.target_date);
                    const priority = task.priority || 'medium';
                    
                    return (
                      <TableRow key={task.id} className={urgency === 'overdue' ? 'bg-red-50/50' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-sm">
                            <p className="font-medium">{task.sale?.project?.name || 'Onbekend project'}</p>
                            <p className="text-muted-foreground">{task.sale?.property_description || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">
                            {PHASE_LABELS[task.phase] || task.phase}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                {task.target_date ? (
                                  <span className={`flex items-center gap-1.5 ${
                                    urgency === 'overdue' ? 'text-red-600' :
                                    urgency === 'today' ? 'text-amber-600' :
                                    urgency === 'tomorrow' ? 'text-amber-500' :
                                    'text-muted-foreground'
                                  }`}>
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(task.target_date), 'd MMM', { locale: nl })}
                                    {urgency === 'overdue' && <AlertCircle className="h-3.5 w-3.5" />}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Geen
                                  </span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={task.target_date ? new Date(task.target_date) : undefined}
                                onSelect={(date) => handleDeadlineChange(task.id, date)}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={priority}
                            onValueChange={(value) => handlePriorityChange(task.id, value as TaskPriority)}
                          >
                            <SelectTrigger className={`w-[100px] h-8 ${PRIORITY_CONFIG[priority].bgColor}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">
                                <span className="text-red-700">Hoog</span>
                              </SelectItem>
                              <SelectItem value="medium">
                                <span className="text-amber-700">Medium</span>
                              </SelectItem>
                              <SelectItem value="low">
                                <span className="text-slate-600">Laag</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/admin/verkopen/${task.sale_id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
