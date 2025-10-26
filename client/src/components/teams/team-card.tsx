import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Crown, Mail, UserPlus, UserMinus } from "lucide-react";

interface TeamCardProps {
  team: any;
}

export function TeamCard({ team }: TeamCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const addMemberMutation = useMutation({
    mutationFn: async ({ email, teamId }: { email: string; teamId: string }) => {
      // First find or create user
      const usersResponse = await fetch("/api/users", { credentials: "include" });
      const users = await usersResponse.json();
      let user = users.find((u: any) => u.email === email);
      
      if (!user) {
        toast({ title: "User not found. They need to sign in first.", variant: "destructive" });
        return;
      }

      const response = await apiRequest("POST", "/api/team-members", {
        teamId,
        userId: user.id,
        isCoordinator: false,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Member added successfully" });
      setNewMemberEmail("");
    },
    onError: () => {
      toast({ title: "Failed to add member", variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/team-members/${memberId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Member updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update member", variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("DELETE", `/api/team-members/${memberId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Member removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove member", variant: "destructive" });
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemberEmail && team.id) {
      addMemberMutation.mutate({ email: newMemberEmail, teamId: team.id });
    }
  };

  const toggleCoordinator = (member: any) => {
    const coordinatorCount = team.coordinators?.length || 0;
    
    if (member.isCoordinator && coordinatorCount <= 1) {
      toast({ 
        title: "Cannot remove last coordinator", 
        description: "Each team must have at least one coordinator.",
        variant: "destructive" 
      });
      return;
    }

    updateMemberMutation.mutate({
      memberId: member.id,
      updates: { isCoordinator: !member.isCoordinator }
    });
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
    <Card data-testid={`team-card-${team.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground text-lg truncate" data-testid="team-name">
              {team.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate" data-testid="team-venue">
              {team.defaultVenue || "No default venue"}
            </p>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-1 text-sm text-muted-foreground flex-shrink-0">
            <div className="flex items-center gap-1" data-testid="team-member-count">
              <span className="font-medium">{team.members?.length || 0}</span> members
            </div>
            <div className="flex items-center gap-1" data-testid="team-coordinator-count">
              <span className="font-medium">{team.coordinators?.length || 0}</span> coordinators
            </div>
          </div>
        </div>
        
        {/* Members List */}
        <div className="space-y-2">
          <h4 className="font-medium text-foreground text-sm">Members</h4>
          <div className="grid grid-cols-1 gap-2" data-testid="team-members-list">
            {team.members?.map((member: any) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-2 bg-muted rounded"
                data-testid={`team-member-${member.id}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={member.user.photoUrl || undefined} />
                    <AvatarFallback className="text-sm font-medium">
                      {getInitials(member.user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">
                      {member.user.displayName || "Unnamed User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {member.isCoordinator && (
                    <Badge className="text-xs bg-accent text-accent-foreground inline-flex items-center">
                      <Crown className="w-3 h-3 mr-1" />
                      Coordinator
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCoordinator(member)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                    data-testid={`button-toggle-coordinator-${member.id}`}
                  >
                    {member.isCoordinator ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Add Member */}
        <div className="mt-4 pt-4 border-t border-border">
          <form onSubmit={handleAddMember} className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input
                type="email"
                placeholder="Enter email address..."
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="w-full"
                data-testid="input-add-member-email"
              />
            </div>
            <Button 
              type="submit" 
              size="sm"
              disabled={addMemberMutation.isPending || !newMemberEmail}
              data-testid="button-add-member"
              className="flex-shrink-0"
            >
              <Mail className="w-4 h-4 mr-1" />
              Add
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
