import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users } from "lucide-react";
import { useTeam } from "@/hooks/use-team";
import { useAuth } from "@/hooks/use-auth";
import { DateModal } from "./date-modal";

export function DateCard() {
  const { selectedTeam } = useTeam();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!selectedTeam) {
    return null;
  }

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
  const presentCount = selectedTeam.members?.length || 0;
  const totalCount = selectedTeam.members?.length || 0;

  return (
    <>
      <Card className="mb-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setIsModalOpen(true)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{today}</span>
              </div>
              
              {selectedTeam.defaultVenue && (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{selectedTeam.defaultVenue}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">{presentCount}/{totalCount} Present</span>
              </div>
            </div>
            
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      <DateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        team={selectedTeam}
        date={today}
      />
    </>
  );
}
