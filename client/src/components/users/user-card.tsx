import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Crown, Shield, User } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface UserCardProps {
  user: any;
}

export function UserCard({ user }: UserCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCoordinatorTeams, setShowCoordinatorTeams] = useState(true);

  const { data: coordinatorTeams = [] } = useQuery({
    queryKey: ["/api/teams", "coordinator", user.id],
    queryFn: async () => {
      const response = await fetch("/api/teams", {
        headers: {
          "x-user-id": user.id
        },
        credentials: "include"
      });
      if (response.ok) {
        const allTeams = await response.json();
        return allTeams.filter((team: any) => 
          team.members?.some((member: any) => 
            member.userId === user.id && member.isCoordinator
          )
        );
      }
      return [];
    },
    enabled: showCoordinatorTeams,
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}/admin`, { isAdmin });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Admin status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update admin status", variant: "destructive" });
    },
  });

  const toggleAdmin = () => {
    if (user.role === "Superadmin") return; // Cannot toggle superadmin
    
    updateAdminMutation.mutate({
      userId: user.id,
      isAdmin: !user.isAdmin,
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return user.email?.[0]?.toUpperCase() || "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Superadmin": return "bg-destructive text-destructive-foreground";
      case "Admin": return "bg-primary text-primary-foreground";
      case "Coordinator": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Superadmin": return <Shield className="w-3 h-3 mr-1" />;
      case "Admin": return <Shield className="w-3 h-3 mr-1" />;
      case "Coordinator": return <Crown className="w-3 h-3 mr-1" />;
      default: return <User className="w-3 h-3 mr-1" />;
    }
  };

  const coordinatorCount = coordinatorTeams.length;
  const isSuperadmin = user.role === "Superadmin";

  return (
    <Card data-testid={`user-card-${user.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={user.photoUrl || undefined} />
              <AvatarFallback className="font-medium">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col">
                <h3 className="font-medium text-foreground truncate" data-testid="user-name">
                  {user.displayName || "Unnamed User"}
                </h3>
                <p className="text-sm text-muted-foreground truncate" data-testid="user-email">
                  {user.email}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge 
                    className={`text-xs inline-flex items-center ${getRoleColor(user.role)}`}
                    data-testid="user-role"
                  >
                    {getRoleIcon(user.role)}
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 flex-shrink-0 mt-3 pt-3 border-t sm:border-t-0 sm:mt-0 sm:pt-0 border-border">
            <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:justify-center">
              <span className="text-sm text-muted-foreground font-medium">Coordinates</span>
              {coordinatorCount > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-primary hover:underline text-sm font-normal"
                      onClick={() => setShowCoordinatorTeams(true)}
                      data-testid="coordinator-teams-trigger"
                    >
                      {coordinatorCount} team{coordinatorCount !== 1 ? 's' : ''}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" data-testid="coordinator-teams-popover">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Coordinator of:</h4>
                      {coordinatorTeams.map((team: any) => (
                        <div key={team.id} className="text-sm text-muted-foreground">
                          {team.name}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <span className="text-primary text-sm" data-testid="no-coordinator-teams">
                  0 teams
                </span>
              )}
            </div>
            
            {/* Admin Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-muted-foreground font-medium">Admin</span>
              <Switch
                checked={user.isAdmin}
                onCheckedChange={toggleAdmin}
                disabled={isSuperadmin || updateAdminMutation.isPending}
                className={isSuperadmin ? "opacity-50" : ""}
                data-testid="admin-toggle"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
