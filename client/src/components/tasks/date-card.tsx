import { useState } from "react";
import { useTeam } from "@/hooks/use-team";
import { DateModal } from "./date-modal";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export function DateCard() {
  const { selectedTeam } = useTeam();
  const [showDateModal, setShowDateModal] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data: minutes } = useQuery({
    queryKey: ["/api/minutes", selectedTeam],
    queryFn: async () => {
      if (!selectedTeam) return undefined;
      const response = await fetch(`/api/minutes?teamId=${selectedTeam}`, {
        credentials: "include",
      });
      if (response.ok) {
        const allMinutes = await response.json();
        return allMinutes.find((m: any) => m.date === today) || undefined;
      }
      return undefined;
    },
    enabled: !!selectedTeam,
  });

  const { data: team } = useQuery({
    queryKey: ["/api/teams", selectedTeam],
    queryFn: async () => {
      if (!selectedTeam) return undefined;
      const response = await fetch(`/api/teams`, { credentials: "include" });
      if (response.ok) {
        const teams = await response.json();
        return teams.find((t: any) => t.id === selectedTeam) || undefined;
      }
      return undefined;
    },
    enabled: !!selectedTeam,
  });

  if (!selectedTeam) {
    return (
      <Card className="border-b border-border rounded-none">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Please select a team to view meeting details
          </div>
        </CardContent>
      </Card>
    );
  }

  const venue = minutes?.venue || team?.defaultVenue || "No venue set";
  const presentCount = Array.isArray(minutes?.attendance) ? minutes.attendance.length : 0;
  const totalCount = team?.members?.length || 0;

  return (
    <>
      <Card className="border-b border-border rounded-none" data-testid="date-card">
        <CardContent className="p-4">
          <button
            onClick={() => setShowDateModal(true)}
            className="w-full text-left bg-muted hover:bg-muted/80 rounded-lg p-4 transition-colors"
            data-testid="date-card-button"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-foreground" data-testid="date-display">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <p className="text-sm text-muted-foreground mt-1" data-testid="venue-display">
                  {venue}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary" data-testid="attendance-present">
                  {presentCount}
                </span>
                <span className="text-muted-foreground">
                  /<span data-testid="attendance-total">{totalCount}</span>
                </span>
                <p className="text-xs text-muted-foreground mt-1">Present</p>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>

      <DateModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        minutes={minutes}
        team={team}
      />
    </>
  );
}
