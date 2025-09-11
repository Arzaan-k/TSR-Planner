import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { signOutUser } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Users, UserCog, LogOut } from "lucide-react";

export default function Profile() {
  const { user, role } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userTeams = [] } = useQuery({
    queryKey: ["/api/teams", "user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch("/api/teams", { credentials: "include" });
      if (response.ok) {
        const allTeams = await response.json();
        return allTeams.filter((team: any) => 
          team.members?.some((member: any) => member.userId === user.id)
        );
      }
      return [];
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    try {
      await signOutUser();
      window.location.reload();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.email?.[0]?.toUpperCase() || "U";
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

  const isAdmin = role === "Admin" || role === "Superadmin";

  return (
    <AuthGuard>
      <AppShell>
        <div className="h-full flex flex-col" data-testid="profile-page">
          <div className="p-4 bg-card border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Profile</h2>
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            {/* User Info */}
            <Card data-testid="user-info-card">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user?.photoUrl || undefined} />
                    <AvatarFallback className="text-xl font-bold">
                      {getInitials(user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground" data-testid="user-display-name">
                      {user?.displayName || "Unnamed User"}
                    </h3>
                    <p className="text-muted-foreground" data-testid="user-email-display">
                      {user?.email}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">Role:</span>
                    <Badge className={`text-xs ${getRoleColor(role)}`} data-testid="user-role-badge">
                      {role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">Teams:</span>
                    <span className="text-sm text-muted-foreground" data-testid="user-teams-count">
                      {userTeams.length} team{userTeams.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {userTeams.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-foreground mb-2">Member of:</h4>
                      <div className="flex flex-wrap gap-1" data-testid="user-teams-list">
                        {userTeams.map((team: any) => (
                          <Badge key={team.id} variant="outline" className="text-xs">
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin Links */}
            {isAdmin && (
              <Card data-testid="admin-actions-card">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-foreground mb-4">Admin Actions</h4>
                  <div className="space-y-3">
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => setLocation("/teams")}
                      data-testid="button-manage-teams"
                    >
                      <Users className="w-5 h-5 mr-3 text-muted-foreground" />
                      <div className="text-left">
                        <div className="font-medium text-foreground">Manage Teams</div>
                        <div className="text-sm text-muted-foreground">Create and manage team settings</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-3 h-auto"
                      onClick={() => setLocation("/users")}
                      data-testid="button-manage-users"
                    >
                      <UserCog className="w-5 h-5 mr-3 text-muted-foreground" />
                      <div className="text-left">
                        <div className="font-medium text-foreground">Manage Users</div>
                        <div className="text-sm text-muted-foreground">Control user permissions and roles</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sign Out */}
            <Card data-testid="sign-out-card">
              <CardContent className="p-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                  data-testid="button-sign-out"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Sign Out</div>
                    <div className="text-sm opacity-75">End your current session</div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
