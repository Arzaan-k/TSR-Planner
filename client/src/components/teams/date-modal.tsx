import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, MapPin, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Team {
  id: string;
  name: string;
  defaultVenue?: string;
  members?: Array<{
    id: string;
    userId: string;
    isCoordinator: boolean;
    user: {
      id: string;
      email: string;
      displayName?: string;
      photoUrl?: string;
    };
  }>;
}

interface DateModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team;
  date: string;
}

export function DateModal({ isOpen, onClose, team, date }: DateModalProps) {
  const [venue, setVenue] = useState(team.defaultVenue || "");
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && team.members) {
      // Initialize attendance - all members present by default
      const initialAttendance: Record<string, boolean> = {};
      team.members.forEach(member => {
        initialAttendance[member.id] = true;
      });
      setAttendance(initialAttendance);
    }
  }, [isOpen, team.members]);

  const handleSelectAll = (checked: boolean) => {
    const newAttendance: Record<string, boolean> = {};
    team.members?.forEach(member => {
      newAttendance[member.id] = checked;
    });
    setAttendance(newAttendance);
  };

  const handleMemberToggle = (memberId: string, checked: boolean) => {
    setAttendance(prev => ({
      ...prev,
      [memberId]: checked
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Get present member IDs
      const presentMemberIds = Object.entries(attendance)
        .filter(([_, isPresent]) => isPresent)
        .map(([memberId, _]) => memberId);

      // Update minutes for this team+date
      await apiRequest("POST", "/api/minutes", {
        teamId: team.id,
        date,
        venue: venue || null,
        attendance: presentMemberIds,
      });

      onClose();
    } catch (error) {
      console.error("Failed to save attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const totalCount = team.members?.length || 0;
  const allSelected = presentCount === totalCount;
  const someSelected = presentCount > 0 && presentCount < totalCount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Meeting Details - {date}</span>
          </DialogTitle>
          <DialogDescription>
            Set the venue and mark attendance for team members for this meeting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Venue</span>
            </Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Enter meeting venue"
            />
          </div>

          {/* Attendance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Attendance ({presentCount}/{totalCount})</span>
              </Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Select All
                </Label>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {team.members?.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={attendance[member.id] || false}
                    onCheckedChange={(checked) => 
                      handleMemberToggle(member.id, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`member-${member.id}`} 
                    className="text-sm flex-1 cursor-pointer"
                  >
                    {member.user.displayName || member.user.email}
                    {member.isCoordinator && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                        Coordinator
                      </span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
