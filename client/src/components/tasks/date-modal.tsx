import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DateModalProps {
  open: boolean;
  onClose: () => void;
  minutes?: any;
  team?: any;
}

export function DateModal({ open, onClose, minutes, team }: DateModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [attendance, setAttendance] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split('T')[0];
      setDate(minutes?.date || today);
      setVenue(minutes?.venue || team?.defaultVenue || "");
      setAttendance(Array.isArray(minutes?.attendance) ? minutes.attendance : []);
    }
  }, [open, minutes, team]);

  const updateMinutesMutation = useMutation({
    mutationFn: async (data: any) => {
      if (minutes?.id) {
        const response = await apiRequest("PATCH", `/api/minutes/${minutes.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/minutes", {
          ...data,
          teamId: team?.id,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/minutes"] });
      toast({ title: "Meeting details saved successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to save meeting details", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMinutesMutation.mutate({
      date,
      venue,
      attendance,
    });
  };

  const handleAttendanceToggle = (memberId: string, checked: boolean) => {
    setAttendance(prev => 
      checked 
        ? [...prev, memberId]
        : prev.filter(id => id !== memberId)
    );
  };

  const handleSelectAll = () => {
    const allMemberIds = team?.members?.map((m: any) => m.id) || [];
    const allSelected = allMemberIds.every((id: string) => attendance.includes(id));
    setAttendance(allSelected ? [] : allMemberIds);
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="date-modal">
        <DialogHeader>
          <DialogTitle>Meeting Details</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
              data-testid="input-meeting-date"
            />
          </div>
          
          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Enter venue..."
              className="mt-1"
              data-testid="input-meeting-venue"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Attendance</Label>
              <Button 
                type="button" 
                variant="link" 
                size="sm"
                onClick={handleSelectAll}
                className="h-auto p-0"
                data-testid="button-select-all"
              >
                Select All
              </Button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto" data-testid="attendance-list">
              {team?.members?.map((member: any) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                  <Checkbox
                    checked={attendance.includes(member.id)}
                    onCheckedChange={(checked) => handleAttendanceToggle(member.id, !!checked)}
                    data-testid={`checkbox-member-${member.id}`}
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={member.user.photoUrl || undefined} />
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(member.user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">
                      {member.user.displayName || member.user.email}
                    </span>
                    {member.isCoordinator && (
                      <span className="text-xs px-1 py-0.5 bg-accent text-accent-foreground rounded">
                        Coordinator
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              data-testid="button-cancel-meeting"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={updateMinutesMutation.isPending}
              data-testid="button-save-meeting"
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
