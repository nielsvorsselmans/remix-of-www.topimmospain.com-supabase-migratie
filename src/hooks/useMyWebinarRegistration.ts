import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

interface WebinarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration_minutes: number;
  webinar_url?: string;
}

interface WebinarRegistration {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  confirmed: boolean;
  user_id: string | null;
  webinar_events: WebinarEvent;
}

export interface WebinarRegistrationData {
  registration: WebinarRegistration | null;
  webinarEvent: WebinarEvent | null;
  isUpcoming: boolean;
  isToday: boolean;
  isPast: boolean;
  showJoinButton: boolean;
  timeUntil: { days: number; hours: number; minutes: number; seconds: number };
  isLoading: boolean;
}

export function useMyWebinarRegistration(): WebinarRegistrationData {
  const { user } = useAuth();
  const [timeUntil, setTimeUntil] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const { data: registration, isLoading } = useQuery({
    queryKey: ["my-webinar-registration", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get user's email first
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email;
      
      if (!email) return null;

      // Find the most recent confirmed webinar registration for this user
      const { data, error } = await supabase
        .from("webinar_registrations")
        .select(`
          id,
          email,
          first_name,
          last_name,
          confirmed,
          user_id,
          webinar_events (
            id,
            title,
            date,
            time,
            duration_minutes,
            webinar_url
          )
        `)
        .or(`user_id.eq.${user.id},email.eq.${email.toLowerCase()}`)
        .eq("confirmed", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching webinar registration:", error);
        return null;
      }
      
      return data as WebinarRegistration | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const webinarEvent = registration?.webinar_events || null;

  // Calculate time status
  const now = new Date();
  let eventDateTime: Date | null = null;
  let isUpcoming = false;
  let isToday = false;
  let isPast = false;
  let showJoinButton = false;

  if (webinarEvent) {
    eventDateTime = new Date(`${webinarEvent.date}T${webinarEvent.time}`);
    const diff = eventDateTime.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000;
    const endTime = new Date(eventDateTime.getTime() + (webinarEvent.duration_minutes * 60 * 1000));

    isPast = now > endTime;
    isToday = !isPast && eventDateTime.toDateString() === now.toDateString();
    isUpcoming = !isPast && !isToday && diff > 0;
    showJoinButton = diff <= oneHour && diff > 0; // Show join button 1 hour before
  }

  // Update countdown timer
  useEffect(() => {
    if (!webinarEvent || isPast) return;

    const calculateTimeUntil = () => {
      const eventTime = new Date(`${webinarEvent.date}T${webinarEvent.time}`);
      const now = new Date();
      const diff = eventTime.getTime() - now.getTime();

      if (diff > 0) {
        setTimeUntil({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeUntil();
    const timer = setInterval(calculateTimeUntil, 1000);
    return () => clearInterval(timer);
  }, [webinarEvent, isPast]);

  return {
    registration: registration || null,
    webinarEvent,
    isUpcoming,
    isToday,
    isPast,
    showJoinButton,
    timeUntil,
    isLoading,
  };
}
