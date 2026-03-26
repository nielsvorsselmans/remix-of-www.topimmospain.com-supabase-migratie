import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TimeSlot {
  start: string;
  end: string;
}

interface BookingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  startTime: string;
  endTime: string;
  meetingUrl: string;
}

export function useAppointmentBooking() {
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const fetchAllSlotsForRange = async (startDate: Date, endDate: Date): Promise<Map<string, TimeSlot[]>> => {
    setIsLoadingSlots(true);
    const slotsMap = new Map<string, TimeSlot[]>();
    
    try {
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const { data, error } = await supabase.functions.invoke('get-ghl-free-slots', {
        body: { 
          startDate: startDateStr, 
          endDate: endDateStr,
          timezone: 'Europe/Brussels'
        }
      });

      if (error) throw error;

      // Group slots by date
      Object.entries(data || {}).forEach(([dateKey, dateData]: [string, any]) => {
        if (!dateData?.slots || !Array.isArray(dateData.slots)) return;
        
        const slots: TimeSlot[] = dateData.slots.map((slotStart: string) => ({
          start: slotStart,
          end: new Date(new Date(slotStart).getTime() + 30 * 60 * 1000).toISOString()
        }));
        
        if (slots.length > 0) {
          slotsMap.set(dateKey, slots);
        }
      });
      
      console.log('Fetched slots for date range:', slotsMap.size, 'days available');
    } catch (error: any) {
      console.error('Error fetching slots range:', error);
      toast.error('Kon beschikbaarheid niet laden');
    } finally {
      setIsLoadingSlots(false);
    }
    
    return slotsMap;
  };

  const bookAppointment = async (bookingData: BookingData): Promise<boolean> => {
    setIsBooking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-ghl-appointment', {
        body: {
          firstName: bookingData.firstName,
          lastName: bookingData.lastName,
          email: bookingData.email,
          phone: bookingData.phone,
          selectedSlot: {
            start: bookingData.startTime,
            end: bookingData.endTime,
          },
          message: bookingData.message,
          meetingUrl: bookingData.meetingUrl,
        },
      });

      if (error) {
        console.error('Error booking appointment:', error);
        toast.error('Er ging iets mis bij het boeken');
        return false;
      }

      if (!data?.success) {
        toast.error('Er ging iets mis bij het boeken');
        return false;
      }

      toast.success('Je afspraak is bevestigd!');
      return true;
    } catch (error) {
      console.error('Exception during booking:', error);
      toast.error('Er ging iets mis');
      return false;
    } finally {
      setIsBooking(false);
    }
  };

  return {
    fetchAllSlotsForRange,
    bookAppointment,
    isLoadingSlots,
    isBooking,
  };
}
