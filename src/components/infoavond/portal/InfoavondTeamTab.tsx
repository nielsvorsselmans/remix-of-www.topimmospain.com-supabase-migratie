import { Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const InfoavondTeamTab = () => {
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .eq('active', true)
        .order('order_index');
      return data || [];
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-sm">Wie ontmoet je?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tijdens de infoavond word je begeleid door ons team. Hieronder leer je ze alvast kennen.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {teamMembers?.map((member) => (
          <div key={member.id} className="bg-muted/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              {member.image_url ? (
                <img 
                  src={member.image_url} 
                  alt={member.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg">
                  {member.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">{member.name}</p>
                <p className="text-sm text-primary font-medium">{member.role}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{member.bio}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
