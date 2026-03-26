import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const eventSchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  date: z.date({ required_error: "Datum is verplicht" }),
  doors_open_time: z.string().min(1, "Tijd is verplicht"),
  presentation_start_time: z.string().min(1, "Tijd is verplicht"),
  presentation_end_time: z.string().min(1, "Tijd is verplicht"),
  location_name: z.string().min(1, "Locatienaam is verplicht"),
  location_address: z.string().min(1, "Adres is verplicht"),
  max_capacity: z.number().min(1, "Capaciteit moet minimaal 1 zijn"),
  active: z.boolean(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface InfoEveningEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  doors_open_time: string | null;
  presentation_start_time: string | null;
  presentation_end_time: string | null;
  location_name: string;
  location_address: string;
  max_capacity: number | null;
  active: boolean | null;
  current_registrations: number | null;
}

interface InfoEveningEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: InfoEveningEvent | null;
  onSave: (data: EventFormData) => Promise<void>;
}

export function InfoEveningEventDialog({ 
  open, 
  onOpenChange, 
  event, 
  onSave 
}: InfoEveningEventDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to format time from database format (HH:MM:SS) to input format (HH:MM)
  const formatTimeForInput = (time: string | null | undefined, defaultTime: string): string => {
    if (!time) return defaultTime;
    return time.substring(0, 5); // Take only HH:MM part
  };

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      doors_open_time: "19:30",
      presentation_start_time: "20:00",
      presentation_end_time: "21:15",
      location_name: "",
      location_address: "",
      max_capacity: 50,
      active: true,
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        date: new Date(event.date),
        doors_open_time: formatTimeForInput(event.doors_open_time, "19:30"),
        presentation_start_time: formatTimeForInput(event.presentation_start_time, "20:00"),
        presentation_end_time: formatTimeForInput(event.presentation_end_time, "21:15"),
        location_name: event.location_name,
        location_address: event.location_address,
        max_capacity: event.max_capacity || 50,
        active: event.active ?? true,
      });
    } else {
      form.reset({
        title: "",
        date: new Date(),
        doors_open_time: "19:30",
        presentation_start_time: "20:00",
        presentation_end_time: "21:15",
        location_name: "",
        location_address: "",
        max_capacity: 50,
        active: true,
      });
    }
  }, [event, form]);

  const handleSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? "Event bewerken" : "Nieuw event toevoegen"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel</FormLabel>
                  <FormControl>
                    <Input placeholder="Infoavond Rotterdam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Datum</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "d MMMM yyyy", { locale: nl })
                            ) : (
                              <span>Kies datum</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={nl}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="doors_open_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deuren open</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="presentation_start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start presentatie</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="presentation_end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Einde presentatie</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locatienaam</FormLabel>
                  <FormControl>
                    <Input placeholder="Van der Valk Hotel Rotterdam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adres</FormLabel>
                  <FormControl>
                    <Input placeholder="Hoofdstraat 123, 3000 Rotterdam" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max. capaciteit</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Actief</FormLabel>
                    <FormControl>
                      <div className="flex items-center h-10">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="ml-2 text-sm text-muted-foreground">
                          {field.value ? "Zichtbaar" : "Verborgen"}
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Opslaan..." : event ? "Opslaan" : "Toevoegen"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
